import { z } from 'zod';

export const ToolDefinitions = {
    jules_list_sources: {
        description: 'List all connected GitHub repositories (sources)',
        schema: z.object({})
    },
    jules_create_session: {
        description: 'Create a new Jules coding session for autonomous development',
        schema: z.object({
            prompt: z.string().describe('Task description/prompt for Jules'),
            source: z.string().describe('Source name (e.g., sources/github/owner/repo)'),
            branch: z.string().optional().describe('Starting branch (default: repo default)'),
            title: z.string().optional().describe('Session title'),
            requirePlanApproval: z.boolean().optional().describe('Require approval before execution'),
            automationMode: z.string().optional().describe('AUTO_CREATE_PR or NONE')
        })
    },
    jules_list_sessions: {
        description: 'List all Jules sessions',
        schema: z.object({})
    },
    jules_get_session: {
        description: 'Get details of a specific session',
        schema: z.object({
            sessionId: z.string().describe('Session ID to retrieve')
        })
    },
    jules_send_message: {
        description: 'Send a message to an existing Jules session',
        schema: z.object({
            sessionId: z.string().describe('Session ID'),
            message: z.string().describe('Message to send')
        })
    },
    jules_approve_plan: {
        description: 'Approve a session plan to allow execution',
        schema: z.object({
            sessionId: z.string().describe('Session ID to approve')
        })
    },
    jules_get_activities: {
        description: 'Get activities/events for a session',
        schema: z.object({
            sessionId: z.string().describe('Session ID')
        })
    },
    jules_create_from_issue: {
        description: 'Create a Jules session from a GitHub issue with full context',
        schema: z.object({
            owner: z.string().describe('GitHub repository owner'),
            repo: z.string().describe('GitHub repository name'),
            issueNumber: z.number().describe('Issue number to process'),
            autoApprove: z.boolean().optional().describe('Auto-approve plan (default: false)'),
            automationMode: z.string().optional().describe('AUTO_CREATE_PR or NONE')
        })
    },
    jules_batch_from_labels: {
        description: 'Create sessions for all GitHub issues with a specific label',
        schema: z.object({
            owner: z.string().describe('GitHub repository owner'),
            repo: z.string().describe('GitHub repository name'),
            label: z.string().describe('Label to filter issues (e.g., "jules-auto")'),
            autoApprove: z.boolean().optional().describe('Auto-approve all plans'),
            parallel: z.number().optional().describe('Max parallel sessions (default: 3)')
        })
    },
    jules_batch_create: {
        description: 'Create multiple Jules sessions in parallel from a task array',
        schema: z.object({
            tasks: z.array(z.any()).describe('Array of session configs (each with prompt, source, title)'),
            parallel: z.number().optional().describe('Max parallel sessions (default: 3)')
        })
    },
    jules_batch_status: {
        description: 'Get status of all sessions in a batch',
        schema: z.object({
            batchId: z.string().describe('Batch ID from jules_batch_create')
        })
    },
    jules_batch_approve_all: {
        description: 'Approve all pending plans in a batch',
        schema: z.object({
            batchId: z.string().describe('Batch ID to approve')
        })
    },
    jules_monitor_all: {
        description: 'Get real-time status of all active sessions with statistics',
        schema: z.object({})
    },
    jules_session_timeline: {
        description: 'Get detailed activity timeline for a session',
        schema: z.object({
            sessionId: z.string().describe('Session ID')
        })
    },
    ollama_list_models: {
        description: 'List available local Ollama models',
        schema: z.object({})
    },
    ollama_completion: {
        description: 'Generate text using local Ollama models',
        schema: z.object({
            prompt: z.string().describe('Text prompt'),
            model: z.string().optional().describe('Model name (default: qwen2.5-coder:7b)'),
            systemPrompt: z.string().optional().describe('System prompt')
        })
    },
    ollama_code_generation: {
        description: 'Generate code using local Qwen2.5-Coder model',
        schema: z.object({
            task: z.string().describe('Code generation task'),
            language: z.string().optional().describe('Programming language (default: javascript)'),
            context: z.string().optional().describe('Additional context')
        })
    },
    ollama_chat: {
        description: 'Multi-turn chat with local Ollama model',
        schema: z.object({
            messages: z.array(z.any()).describe('Array of {role, content} messages'),
            model: z.string().optional().describe('Model name (default: qwen2.5-coder:7b)')
        })
    },
    ollama_rag_index: {
        description: 'Index a directory for RAG-powered codebase queries',
        schema: z.object({
            directory: z.string().describe('Directory path to index'),
            maxFiles: z.number().optional().describe('Max files to index (default: 100)')
        })
    },
    ollama_rag_query: {
        description: 'Query the indexed codebase with context-aware LLM responses',
        schema: z.object({
            query: z.string().describe('Question about the codebase'),
            model: z.string().optional().describe('Model to use (default: qwen2.5-coder:7b)'),
            topK: z.number().optional().describe('Number of context chunks (default: 5)')
        })
    },
    ollama_rag_status: {
        description: 'Get RAG index status and indexed files',
        schema: z.object({})
    },
    ollama_rag_clear: {
        description: 'Clear the RAG index',
        schema: z.object({})
    },
    jules_cancel_session: {
        description: 'Cancel/abort an active session',
        schema: z.object({
            sessionId: z.string()
        })
    },
    jules_retry_session: {
        description: 'Retry a failed session',
        schema: z.object({
            sessionId: z.string(),
            modifiedPrompt: z.string().optional()
        })
    },
    jules_get_diff: {
        description: 'Get code changes from session',
        schema: z.object({
            sessionId: z.string()
        })
    },
    jules_list_batches: {
        description: 'List all batch operations',
        schema: z.object({})
    },
    jules_delete_session: {
        description: 'Delete a session',
        schema: z.object({
            sessionId: z.string()
        })
    },
    jules_cache_stats: {
        description: 'Get cache statistics',
        schema: z.object({})
    },
    jules_clear_cache: {
        description: 'Clear API cache',
        schema: z.object({})
    },
    jules_cancel_all_active: {
        description: 'Cancel all active sessions',
        schema: z.object({
            confirm: z.boolean().describe('Must point confirm: true to cancel all sessions')
        })
    },
    jules_create_template: {
        description: 'Save session config as template',
        schema: z.object({
            name: z.string().describe('Template name'),
            description: z.string().optional().describe('Template description'),
            config: z.any().describe('Session config object')
        })
    },
    jules_list_templates: {
        description: 'List saved templates',
        schema: z.object({})
    },
    jules_create_from_template: {
        description: 'Create session from template',
        schema: z.object({
            templateName: z.string().describe('Template name'),
            overrides: z.any().optional().describe('Config overrides')
        })
    },
    jules_delete_template: {
        description: 'Delete a template',
        schema: z.object({
            name: z.string()
        })
    },
    jules_clone_session: {
        description: 'Clone a session config',
        schema: z.object({
            sessionId: z.string(),
            modifiedPrompt: z.string().optional(),
            newTitle: z.string().optional()
        })
    },
    jules_search_sessions: {
        description: 'Search sessions with filters',
        schema: z.object({
            query: z.string().optional(),
            state: z.string().optional(),
            limit: z.number().optional()
        })
    },
    jules_get_pr_status: {
        description: 'Get PR status from session',
        schema: z.object({
            sessionId: z.string()
        })
    },
    jules_merge_pr: {
        description: 'Merge a PR',
        schema: z.object({
            owner: z.string(),
            repo: z.string(),
            prNumber: z.number(),
            mergeMethod: z.string().optional()
        })
    },
    jules_add_pr_comment: {
        description: 'Add comment to PR',
        schema: z.object({
            owner: z.string(),
            repo: z.string(),
            prNumber: z.number(),
            comment: z.string()
        })
    },
    jules_queue_session: {
        description: 'Queue session with priority',
        schema: z.object({
            config: z.any(),
            priority: z.number().optional()
        })
    },
    jules_get_queue: {
        description: 'Get queue status',
        schema: z.object({})
    },
    jules_process_queue: {
        description: 'Process next queued item',
        schema: z.object({})
    },
    jules_clear_queue: {
        description: 'Clear queue',
        schema: z.object({})
    },
    jules_batch_retry_failed: {
        description: 'Retry failed sessions in batch',
        schema: z.object({
            batchId: z.string()
        })
    },
    jules_get_analytics: {
        description: 'Get session analytics',
        schema: z.object({
            days: z.number().optional()
        })
    },
    memory_recall_context: {
        description: 'Recall relevant memories for a task',
        schema: z.object({
            task: z.string(),
            repository: z.string().optional(),
            limit: z.number().optional()
        })
    },
    memory_store: {
        description: 'Store a memory manually',
        schema: z.object({
            content: z.string(),
            summary: z.string().optional(),
            tags: z.array(z.string()).optional(),
            importance: z.number().optional()
        })
    },
    memory_search: {
        description: 'Search memories by query',
        schema: z.object({
            query: z.string(),
            tags: z.array(z.string()).optional(),
            limit: z.number().optional()
        })
    },
    memory_related: {
        description: 'Get memories related to a specific memory',
        schema: z.object({
            memoryId: z.string(),
            limit: z.number().optional()
        })
    },
    memory_reinforce: {
        description: 'Reinforce a memory when a pattern proves successful',
        schema: z.object({
            memoryId: z.string(),
            boost: z.number().optional()
        })
    },
    memory_forget: {
        description: 'Apply decay to old memories or remove them',
        schema: z.object({
            olderThanDays: z.number().optional(),
            belowImportance: z.number().optional(),
            soft: z.boolean().optional(),
            decayFactor: z.number().optional()
        })
    },
    memory_health: {
        description: 'Check semantic memory service health',
        schema: z.object({})
    },
    memory_maintenance_schedule: {
        description: 'Get memory maintenance schedule for temporal-agent-mcp',
        schema: z.object({})
    },
    render_connect: {
        description: 'Connect Render integration by storing API key',
        schema: z.object({
            apiKey: z.string().describe('Render API key (starts with rnd_)'),
            webhookSecret: z.string().optional().describe('Webhook secret for signature verification')
        })
    },
    render_disconnect: {
        description: 'Disconnect Render integration',
        schema: z.object({})
    },
    render_status: {
        description: 'Check Render integration status',
        schema: z.object({})
    },
    render_list_services: {
        description: 'List all Render services',
        schema: z.object({})
    },
    render_list_deploys: {
        description: 'List deploys for a service',
        schema: z.object({
            serviceId: z.string().describe('Service ID (srv-xxx)'),
            limit: z.number().optional()
        })
    },
    render_get_build_logs: {
        description: 'Get build logs for a deploy',
        schema: z.object({
            serviceId: z.string(),
            deployId: z.string()
        })
    },
    render_analyze_failure: {
        description: 'Analyze a build failure and get fix suggestions',
        schema: z.object({
            serviceId: z.string()
        })
    },
    render_autofix_status: {
        description: 'Get auto-fix status and active operations',
        schema: z.object({})
    },
    render_set_autofix: {
        description: 'Enable or disable auto-fix for Jules PRs',
        schema: z.object({
            enabled: z.boolean()
        })
    },
    render_add_monitored_service: {
        description: 'Add a service to auto-fix monitoring',
        schema: z.object({
            serviceId: z.string()
        })
    },
    render_remove_monitored_service: {
        description: 'Remove a service from auto-fix monitoring',
        schema: z.object({
            serviceId: z.string()
        })
    },
    render_trigger_autofix: {
        description: 'Manually trigger auto-fix for a failed deploy',
        schema: z.object({
            serviceId: z.string(),
            deployId: z.string()
        })
    },
    jules_suggested_tasks: {
        description: 'Scan codebase for TODO/FIXME/HACK comments and suggest tasks for Jules',
        schema: z.object({
            directory: z.string().describe('Directory to scan'),
            types: z.array(z.string()).optional().describe('Filter by comment types'),
            minPriority: z.number().optional().describe('Minimum priority threshold (1-10)'),
            limit: z.number().optional().describe('Max tasks to return'),
            includeGitInfo: z.boolean().optional().describe('Include git blame info')
        })
    },
    jules_fix_suggested_task: {
        description: 'Create a Jules session to fix a suggested task',
        schema: z.object({
            directory: z.string(),
            taskIndex: z.number().describe('Index of task from jules_suggested_tasks result'),
            source: z.string().describe('GitHub source')
        })
    },
    jules_clear_suggested_cache: {
        description: 'Clear suggested tasks cache',
        schema: z.object({})
    }
} as const;
