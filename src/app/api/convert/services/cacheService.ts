import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

export function getCachedMarkdown(key: string): string | undefined {
	return cache.get(key) as string | undefined;
}

export function setCachedMarkdown(key: string, value: string): void {
	cache.set(key, value);
}
