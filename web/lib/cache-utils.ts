/**
 * Client-side caching utilities for CSV data
 * Uses localStorage with timestamp-based expiration
 */

const CACHE_PREFIX = 'llm_mod_cache_';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Generate a cache key for a given endpoint
 */
export function getCacheKey(endpoint: string): string {
    return `${CACHE_PREFIX}${endpoint}`;
}

/**
 * Store data in localStorage cache
 */
export function setCache<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        // Handle quota exceeded or other localStorage errors
        console.warn('Failed to cache data:', error);
        // Optionally clear old cache entries
        clearExpiredCache();
    }
}

/**
 * Retrieve data from localStorage cache
 * Returns null if cache is expired or doesn't exist
 */
export function getCache<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const entry: CacheEntry<T> = JSON.parse(item);
        const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;

        if (isExpired) {
            localStorage.removeItem(key);
            return null;
        }

        return entry.data;
    } catch (error) {
        console.warn('Failed to retrieve cached data:', error);
        return null;
    }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): void {
    try {
        const keys = Object.keys(localStorage);
        const now = Date.now();

        keys.forEach((key) => {
            if (key.startsWith(CACHE_PREFIX)) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const entry: CacheEntry<unknown> = JSON.parse(item);
                        if (now - entry.timestamp > CACHE_DURATION_MS) {
                            localStorage.removeItem(key);
                        }
                    }
                } catch {
                    // Invalid entry, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.warn('Failed to clear expired cache:', error);
    }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Failed to clear cache:', error);
    }
}

/**
 * Hook for fetching data with caching
 */
export async function fetchWithCache<T>(
    endpoint: string,
    fetcher: () => Promise<T>
): Promise<T> {
    const cacheKey = getCacheKey(endpoint);

    // Try to get from cache first
    const cached = getCache<T>(cacheKey);
    if (cached !== null) {
        // Return cached data and revalidate in background
        fetcher().then((freshData) => {
            setCache(cacheKey, freshData);
        }).catch(console.error);

        return cached;
    }

    // No cache, fetch fresh data
    const data = await fetcher();
    setCache(cacheKey, data);
    return data;
}
