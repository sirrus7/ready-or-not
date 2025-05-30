// src/hooks/supabase/utils/operationCache.ts - Cache management
export class OperationCache {
    private cache = new Map<string, { data: any; timestamp: number }>();

    get<T>(key: string, timeout: number): T | null {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < timeout) {
            console.log(`[OperationCache] Cache hit for ${key}`);
            return cached.data;
        }
        return null;
    }

    set<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(pattern?: string): void {
        if (pattern) {
            const keysToDelete = Array.from(this.cache.keys()).filter(key =>
                key.includes(pattern)
            );
            keysToDelete.forEach(key => this.cache.delete(key));
        } else {
            this.cache.clear();
        }
    }

    size(): number {
        return this.cache.size;
    }
}
