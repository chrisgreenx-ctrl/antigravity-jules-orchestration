import { LRUCache, SessionQueue } from './infrastructure.js'; // I'll rename the classes in a bit or move them

export const apiCache = new LRUCache(100, 10000);
export const sessionQueue = new SessionQueue();
export const sessionTemplates = new Map();

// Circuit Breaker for Jules API
export const circuitBreaker = {
    failures: 0,
    lastFailure: null as number | null,
    threshold: 5,        // Trip after 5 consecutive failures
    resetTimeout: 60000, // Reset after 1 minute
    isOpen() {
        if (this.failures >= this.threshold) {
            const timeSinceFailure = (this.lastFailure ? Date.now() - this.lastFailure : 0);
            if (timeSinceFailure < this.resetTimeout) {
                return true; // Circuit is open, reject requests
            }
            this.failures = 0; // Reset after timeout
        }
        return false;
    },
    recordSuccess() {
        this.failures = 0;
    },
    recordFailure() {
        this.failures++;
        this.lastFailure = Date.now();
    }
};
