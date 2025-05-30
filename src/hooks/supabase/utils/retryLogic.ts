// src/hooks/supabase/utils/retryLogic.ts - Retry utilities
export class RetryManager {
    private currentAttempt = 0;

    constructor(private maxRetries: number) {}

    shouldRetry(): boolean {
        return this.currentAttempt < this.maxRetries;
    }

    canRetry(): boolean {
        return this.currentAttempt < this.maxRetries;
    }

    getAttemptCount(): number {
        return this.currentAttempt;
    }

    async delay(): Promise<void> {
        this.currentAttempt++;

        // Exponential backoff with jitter
        const baseDelay = 1000;
        const delay = Math.min(
            baseDelay * Math.pow(2, this.currentAttempt - 1),
            5000
        ) + Math.random() * 1000;

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    reset(): void {
        this.currentAttempt = 0;
    }
}
