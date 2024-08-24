export function log(
	level: "info" | "warn" | "error",
	message: string,
	data?: any
) {
	const timestamp = new Date().toISOString();
	console[level](`[${timestamp}] ${message}`, data);
}
