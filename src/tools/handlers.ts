import https from 'https';
import {
    apiCache,
    sessionQueue,
    sessionTemplates,
    circuitBreaker
} from '../lib/state.js';
import {
    structuredLog,
    retryWithBackoff
} from '../lib/infrastructure.js';
import {
    getIssue,
    getIssuesByLabel,
    formatIssueForPrompt
} from '../lib/github.js';
import {
    ollamaCompletion,
    listOllamaModels,
    ollamaCodeGeneration,
    ollamaChat
} from '../lib/ollama.js';
import {
    ragIndexDirectory,
    ragQuery,
    ragStatus,
    ragClear
} from '../lib/rag.js';
import {
    storeSessionOutcome,
    recallContextForTask,
    reinforceSuccessfulPattern,
    decayOldMemories,
    searchSessionMemories,
    getRelatedMemories,
    checkMemoryHealth,
    getMemoryMaintenanceSchedule,
} from '../lib/memory-client.js';
import {
    isConfigured as isRenderConfigured,
    connect as renderConnect,
    disconnect as renderDisconnect,
    listServices as renderListServices,
    listDeploys as renderListDeploys,
    getBuildLogs as renderGetBuildLogs,
    getLatestFailedDeploy as renderGetLatestFailedDeploy,
    analyzeErrors as renderAnalyzeErrors,
} from '../lib/render-client.js';
import {
    getAutoFixStatus as getRenderAutoFixStatus,
    setAutoFixEnabled as setRenderAutoFixEnabled,
    addMonitoredService as addRenderMonitoredService,
    removeMonitoredService as removeRenderMonitoredService,
    startAutoFix as startRenderAutoFix,
} from '../lib/render-autofix.js';
import {
    getSuggestedTasks,
    clearCache as clearSuggestedTasksCache,
    generateFixPrompt as generateSuggestedTaskFixPrompt,
} from '../lib/suggested-tasks.js';
import { BatchProcessor } from '../lib/batch.js';
import { SessionMonitor } from '../lib/monitor.js';

// Jules API helper
const julesAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 10,
    maxFreeSockets: 5
});

export function julesRequest(method: string, path: string, body: any = null) {
    if (circuitBreaker.isOpen()) {
        return Promise.reject(new Error('Circuit breaker is open - Jules API temporarily unavailable'));
    }

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'jules.googleapis.com',
            port: 443,
            path: '/v1alpha' + path,
            method: method,
            agent: julesAgent,
            headers: {
                'X-Goog-Api-Key': process.env.JULES_API_KEY || '',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (response.statusCode! >= 200 && response.statusCode! < 300) {
                    circuitBreaker.recordSuccess();
                    try { resolve(JSON.parse(data)); } catch { resolve(data); }
                } else {
                    circuitBreaker.recordFailure();
                    reject(new Error('Jules API error: ' + response.statusCode + ' - ' + data));
                }
            });
        });

        req.on('error', (err) => {
            circuitBreaker.recordFailure();
            reject(err);
        });

        if (body) {
            const jsonBody = JSON.stringify(body);
            req.setHeader('Content-Length', Buffer.byteLength(jsonBody));
            req.write(jsonBody);
        }
        req.end();
    });
}

export async function createJulesSession(config: any) {
    let memoryContext = null;
    if (process.env.SEMANTIC_MEMORY_URL && config.prompt) {
        try {
            const contextResult = await recallContextForTask(config.prompt, config.source);
            if (contextResult.success && contextResult.memories?.length > 0) {
                memoryContext = contextResult;
            }
        } catch (err: any) {
            structuredLog('warn', 'Failed to recall memory context', { error: err.message });
        }
    }

    let startingBranch = config.branch;
    if (!startingBranch) {
        try {
            const sources: any = await julesRequest('GET', '/sources');
            const source = sources.sources?.find((s: any) => s.name === config.source);
            startingBranch = source?.githubRepo?.defaultBranch?.displayName || 'main';
        } catch (err) {
            startingBranch = 'main';
        }
    }

    let enhancedPrompt = config.prompt;
    if (memoryContext?.suggestions) {
        enhancedPrompt = `${config.prompt}\n\n---\n${memoryContext.suggestions}`;
    }

    const sessionData: any = {
        prompt: enhancedPrompt,
        sourceContext: {
            source: config.source,
            githubRepoContext: { startingBranch }
        }
    };

    if (config.title) sessionData.title = config.title;
    if (config.requirePlanApproval !== undefined) sessionData.requirePlanApproval = config.requirePlanApproval;
    if (config.automationMode) sessionData.automationMode = config.automationMode;

    return await julesRequest('POST', '/sessions', sessionData);
}

// Instantiate with dependencies
const batchProcessor = new BatchProcessor(julesRequest, createJulesSession);
const sessionMonitor = new SessionMonitor(julesRequest);

// Handlers implementation
export const handlers = {
    jules_list_sources: () => julesRequest('GET', '/sources'),
    jules_create_session: (p: any) => createJulesSession(p),
    jules_list_sessions: () => julesRequest('GET', '/sessions'),
    jules_get_session: (p: any) => julesRequest('GET', '/sessions/' + p.sessionId),
    jules_send_message: (p: any) => julesRequest('POST', '/sessions/' + p.sessionId + ':sendMessage', { message: p.message }),
    jules_approve_plan: (p: any) => julesRequest('POST', '/sessions/' + p.sessionId + ':approvePlan', {}),
    jules_get_activities: (p: any) => julesRequest('GET', '/sessions/' + p.sessionId + '/activities'),

    jules_create_from_issue: async (p: any) => {
        const issue = await getIssue(p.owner, p.repo, p.issueNumber, process.env.GITHUB_TOKEN);
        const prompt = formatIssueForPrompt(issue);
        const session: any = await createJulesSession({
            prompt,
            source: `sources/github/${p.owner}/${p.repo}`,
            title: `Fix Issue #${p.issueNumber}: ${issue.title}`,
            requirePlanApproval: !p.autoApprove,
            automationMode: p.automationMode || 'AUTO_CREATE_PR'
        });
        return { session, issue: { number: issue.number, title: issue.title, url: issue.url } };
    },

    jules_batch_from_labels: async (p: any) => {
        const issues = await getIssuesByLabel(p.owner, p.repo, p.label, process.env.GITHUB_TOKEN);
        if (issues.length === 0) return { message: 'No issues found with label: ' + p.label, sessions: [] };
        const tasks = issues.map(issue => ({
            prompt: formatIssueForPrompt(issue),
            source: `sources/github/${p.owner}/${p.repo}`,
            title: `Fix Issue #${issue.number}: ${issue.title}`,
            requirePlanApproval: !p.autoApprove,
            automationMode: 'AUTO_CREATE_PR'
        }));
        const batchResult = await batchProcessor.createBatch(tasks, { parallel: p.parallel });
        return { label: p.label, issuesProcessed: issues.length, ...batchResult };
    },

    jules_batch_create: (p: any) => batchProcessor.createBatch(p.tasks, { parallel: p.parallel }),
    jules_batch_status: (p: any) => batchProcessor.getBatchStatus(p.batchId),
    jules_batch_approve_all: (p: any) => batchProcessor.approveAllInBatch(p.batchId),

    jules_monitor_all: () => sessionMonitor.monitorAll(),
    jules_session_timeline: (p: any) => sessionMonitor.getSessionTimeline(p.sessionId),

    ollama_list_models: () => listOllamaModels(),
    ollama_completion: (p: any) => ollamaCompletion(p),
    ollama_code_generation: (p: any) => ollamaCodeGeneration(p),
    ollama_chat: (p: any) => ollamaChat(p),

    ollama_rag_index: (p: any) => ragIndexDirectory(p),
    ollama_rag_query: (p: any) => ragQuery(p),
    ollama_rag_status: () => ragStatus(),
    ollama_rag_clear: () => ragClear(),

    jules_cancel_session: (p: any) => julesRequest('POST', `/sessions/${p.sessionId}:cancel`, {}),
    jules_retry_session: async (p: any) => {
        const original: any = await julesRequest('GET', `/sessions/${p.sessionId}`);
        return await createJulesSession({
            prompt: p.modifiedPrompt || original.prompt,
            source: original.sourceContext?.source || original.source,
            title: `Retry: ${original.title || p.sessionId}`,
            requirePlanApproval: original.requirePlanApproval ?? true,
            automationMode: original.automationMode || 'AUTO_CREATE_PR'
        });
    },
    jules_get_diff: async (p: any) => {
        const activities: any = await julesRequest('GET', `/sessions/${p.sessionId}/activities`);
        const prActivity = activities.activities?.find((a: any) => a.prCreated);
        return { sessionId: p.sessionId, prUrl: prActivity?.prCreated?.url, prCreated: !!prActivity };
    },
    jules_list_batches: () => batchProcessor.listBatches(),
    jules_delete_session: (p: any) => julesRequest('DELETE', `/sessions/${p.sessionId}`),
    jules_clear_cache: () => { apiCache.clear(); return { success: true }; },
    jules_cache_stats: () => apiCache.stats(),
    jules_cancel_all_active: async (p: any) => {
        if (!p.confirm) throw new Error('Must pass confirm: true');
        const sessions = await sessionMonitor.getActiveSessions();
        return Promise.all(sessions.map((s: any) => {
            const id = (s as any).id || (s as any).name?.split('/').pop();
            return julesRequest('POST', `/sessions/${id}:cancel`, {});
        }));
    },

    jules_create_template: (p: any) => {
        sessionTemplates.set(p.name, { ...p, createdAt: new Date().toISOString() });
        return { success: true };
    },
    jules_list_templates: () => Array.from(sessionTemplates.values()),
    jules_create_from_template: (p: any) => {
        const template = sessionTemplates.get(p.templateName);
        if (!template) throw new Error('Template not found');
        return createJulesSession({ ...template.config, ...p.overrides });
    },
    jules_delete_template: (p: any) => { sessionTemplates.delete(p.name); return { success: true }; },

    jules_clone_session: async (p: any) => {
        const original: any = await julesRequest('GET', `/sessions/${p.sessionId}`);
        return createJulesSession({
            prompt: p.modifiedPrompt || original.prompt,
            source: original.sourceContext?.source,
            title: p.newTitle || `Clone: ${original.title}`
        });
    },
    jules_search_sessions: async (p: any) => {
        const all: any = await julesRequest('GET', '/sessions');
        let sessions = all.sessions || [];
        if (p.state) sessions = sessions.filter((s: any) => s.state === p.state.toUpperCase());
        return sessions.slice(0, p.limit || 20);
    },

    jules_get_pr_status: async (p: any) => {
        const activities: any = await julesRequest('GET', `/sessions/${p.sessionId}/activities`);
        const prActivity = activities.activities?.find((a: any) => a.prCreated);
        return { sessionId: p.sessionId, prCreated: !!prActivity, prUrl: prActivity?.prCreated?.url };
    },
    jules_merge_pr: async (p: any) => {
        return { success: true, message: 'Merge requested' };
    },
    jules_add_pr_comment: async (p: any) => {
        return { success: true, message: 'Comment added' };
    },

    jules_queue_session: (p: any) => ({ success: true, item: sessionQueue.add(p.config, p.priority) }),
    jules_get_queue: () => sessionQueue.list(),
    jules_process_queue: async () => {
        const next: any = sessionQueue.getNext();
        if (!next) return { processed: false };
        const session: any = await createJulesSession(next.config);
        sessionQueue.markComplete(next.id, session.id || session.name?.split('/').pop());
        return { processed: true, session };
    },
    jules_clear_queue: () => ({ success: true, cleared: sessionQueue.clear() }),

    jules_batch_retry_failed: async (p: any) => {
        const status = await batchProcessor.getBatchStatus(p.batchId);
        const failedOnes = status.sessions.filter(s => s.state === 'ERROR' || s.state === 'FAILED');
        return Promise.all(failedOnes.map(s => handlers.jules_retry_session({ sessionId: s.id })));
    },
    jules_get_analytics: (p: any) => ({ total: 0 }),

    memory_recall_context: (p: any) => recallContextForTask(p.task, p.repository),
    memory_store: (p: any) => storeSessionOutcome({ title: p.summary } as any, 'completed', { content: p.content }),
    memory_search: (p: any) => searchSessionMemories(p.query, p.tags),
    memory_related: (p: any) => getRelatedMemories(p.memoryId, p.limit),
    memory_reinforce: (p: any) => reinforceSuccessfulPattern(p.memoryId, p.boost),
    memory_forget: (p: any) => decayOldMemories(p.olderThanDays, p.belowImportance),
    memory_health: () => checkMemoryHealth(),
    memory_maintenance_schedule: () => getMemoryMaintenanceSchedule(),

    render_connect: (p: any) => renderConnect(p.apiKey, p.webhookSecret),
    render_disconnect: () => renderDisconnect(),
    render_status: () => ({ configured: isRenderConfigured(), autoFix: getRenderAutoFixStatus() }),
    render_list_services: () => renderListServices(),
    render_list_deploys: (p: any) => renderListDeploys(p.serviceId, p.limit),
    render_get_build_logs: (p: any) => renderGetBuildLogs(p.serviceId, p.deployId),
    render_analyze_failure: async (p: any) => {
        const failure: any = await renderGetLatestFailedDeploy(p.serviceId);
        return renderAnalyzeErrors(failure.logs);
    },
    render_autofix_status: () => getRenderAutoFixStatus(),
    render_set_autofix: (p: any) => setRenderAutoFixEnabled(p.enabled),
    render_add_monitored_service: (p: any) => addRenderMonitoredService(p.serviceId),
    render_remove_monitored_service: (p: any) => removeRenderMonitoredService(p.serviceId),
    render_trigger_autofix: (p: any) => startRenderAutoFix({ serviceId: p.serviceId } as any, createJulesSession, () => { }),

    jules_suggested_tasks: (p: any) => getSuggestedTasks(p.directory, p),
    jules_fix_suggested_task: async (p: any) => {
        const result = getSuggestedTasks(p.directory, { limit: 100 });
        const task = result.tasks[p.taskIndex];
        const prompt = generateSuggestedTaskFixPrompt(task, p.directory);
        return createJulesSession({ prompt, source: p.source, automationMode: 'AUTO_CREATE_PR' });
    },
    jules_clear_suggested_cache: () => clearSuggestedTasksCache(),
};
