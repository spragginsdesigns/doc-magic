import { setTimeout } from "node:timers/promises";
import { log } from "@/utils/logger";

export async function callWithRetry<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	initialDelay = 1000,
): Promise<T> {
	let lastError: Error | null = null;
	let currentDelay = initialDelay;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			log("warn", `Attempt ${i + 1} failed, retrying in ${currentDelay}ms...`);
			lastError = error instanceof Error ? error : new Error(String(error));
			await setTimeout(currentDelay);
			currentDelay *= 2; // Exponential backoff
		}
	}
	throw lastError || new Error("Max retries reached");
}
