// Structured Logging
export const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
export const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || 2;

export function structuredLog(level: keyof typeof LOG_LEVELS, message: string, context: any = {}) {
    if (LOG_LEVELS[level] > currentLogLevel) return;
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
        correlationId: context.correlationId || 'system'
    }));
}

// LRU Cache with TTL for API response caching
export class LRUCache {
    private cache: Map<string, { value: any; expires: number }>;
    private maxSize: number;
    private defaultTTL: number;

    constructor(maxSize: number = 100, defaultTTL: number = 10000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }
    get(key: string): any {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) { this.cache.delete(key); return null; }
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }
    set(key: string, value: any, ttl: number = this.defaultTTL): void {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, expires: Date.now() + ttl });
    }
    invalidate(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) this.cache.delete(key);
        }
    }
    clear(): void { this.cache.clear(); }
    stats(): { size: number; maxSize: number } {
        return { size: this.cache.size, maxSize: this.maxSize };
    }
}

// Session Queue
export interface QueueItem {
    id: string;
    config: any;
    priority: number;
    addedAt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    sessionId?: string;
    completedAt?: string;
    error?: any;
    failedAt?: string;
}

export class SessionQueue {
    private queue: QueueItem[];
    private processing: boolean;
    private maxRetained: number;

    constructor(maxRetained: number = 100) {
        this.queue = [];
        this.processing = false;
        this.maxRetained = maxRetained;
    }
    add(config: any, priority: number = 5): QueueItem {
        const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const item: QueueItem = { id, config, priority, addedAt: new Date().toISOString(), status: 'pending' };
        this.queue.push(item);
        this.queue.sort((a, b) => a.priority - b.priority);
        this._cleanup();
        return item;
    }
    remove(id: string): QueueItem | null {
        const idx = this.queue.findIndex(i => i.id === id);
        return idx >= 0 ? this.queue.splice(idx, 1)[0] : null;
    }
    getNext(): QueueItem | undefined {
        return this.queue.find(i => i.status === 'pending');
    }
    markProcessing(id: string): void {
        const item = this.queue.find(i => i.id === id);
        if (item) item.status = 'processing';
    }
    markComplete(id: string, sessionId: string): void {
        const item = this.queue.find(i => i.id === id);
        if (item) {
            item.status = 'completed';
            item.sessionId = sessionId;
            item.completedAt = new Date().toISOString();
        }
        this._cleanup();
    }
    markFailed(id: string, error: any): void {
        const item = this.queue.find(i => i.id === id);
        if (item) {
            item.status = 'failed';
            item.error = error;
            item.failedAt = new Date().toISOString();
        }
        this._cleanup();
    }
    list(): any[] {
        return this.queue.map(i => ({
            id: i.id,
            title: i.config.title || 'Untitled',
            priority: i.priority,
            status: i.status,
            addedAt: i.addedAt,
            sessionId: i.sessionId
        }));
    }
    stats(): any {
        return {
            total: this.queue.length,
            pending: this.queue.filter(i => i.status === 'pending').length,
            processing: this.queue.filter(i => i.status === 'processing').length,
            completed: this.queue.filter(i => i.status === 'completed').length,
            failed: this.queue.filter(i => i.status === 'failed').length
        };
    }
    clear(): number {
        const cleared = this.queue.filter(i => i.status === 'pending').length;
        this.queue = this.queue.filter(i => i.status !== 'pending');
        return cleared;
    }
    private _cleanup(): void {
        const terminal = this.queue.filter(i => i.status === 'completed' || i.status === 'failed');
        if (terminal.length > this.maxRetained) {
            const toRemove = terminal.slice(0, terminal.length - this.maxRetained);
            toRemove.forEach(item => {
                const idx = this.queue.indexOf(item);
                if (idx >= 0) this.queue.splice(idx, 1);
            });
        }
    }
}

// Retry with Exponential Backoff
export async function retryWithBackoff(fn: () => Promise<any>, options: any = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, correlationId } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try { return await fn(); }
        catch (error: any) {
            lastError = error;
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) throw error;
            if (attempt < maxRetries) {
                const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000, maxDelay);
                structuredLog('warn', `Retry attempt ${attempt}/${maxRetries}`, { correlationId, delay: Math.round(delay), error: error.message });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
