// src/shared/services/tinyUrlService.ts
const TINYURL_API_URL = 'https://api.tinyurl.com/create';
const API_TOKEN = import.meta.env.VITE_TINYURL_API_TOKEN;

interface TinyUrlResponse {
    data: {
        tiny_url: string;
    };
    code: number;
    errors: string[];
}

/**
 * Shortens a long URL using the TinyURL API.
 * @param longUrl The URL to shorten.
 * @returns The shortened URL, or the original URL if shortening fails.
 */
export const shortenUrl = async (longUrl: string): Promise<string> => {
    if (!API_TOKEN) {
        console.warn('[TinyURL] VITE_TINYURL_API_TOKEN is not set. Returning original URL.');
        return longUrl;
    }

    try {
        const response = await fetch(TINYURL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify({
                url: longUrl,
                domain: 'tinyurl.com'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`TinyURL API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData.errors)}`);
        }

        const result: TinyUrlResponse = await response.json();

        if (result.code === 0 && result.data?.tiny_url) {
            console.log(`[TinyURL] Shortened ${longUrl} to ${result.data.tiny_url}`);
            return result.data.tiny_url;
        } else {
            throw new Error(`TinyURL response error: ${JSON.stringify(result.errors)}`);
        }
    } catch (error) {
        console.error('[TinyURL] Failed to shorten URL, returning original:', error);
        return longUrl;
    }
};
