const MAX_TOKENS = 8000; // Adjust based on the model's actual limit
const TOKENS_PER_CHAR = 0.25; // Rough estimate, adjust as needed
const MAX_CHUNK_SIZE = 10000;

export function estimateTokens(text: string): number {
	return Math.ceil(text.length * TOKENS_PER_CHAR);
}

export function splitIntoSections(text: string): string[] {
	const sections: string[] = [];
	let currentSection = "";

	for (const paragraph of text.split("\n\n")) {
		if (estimateTokens(currentSection + paragraph) > MAX_TOKENS) {
			if (currentSection) sections.push(currentSection);
			currentSection = paragraph;
		} else {
			currentSection += (currentSection ? "\n\n" : "") + paragraph;
		}
	}

	if (currentSection) sections.push(currentSection);
	return sections;
}
export function preprocessText(text: string): {
	chunks: string[];
	structures: Array<{ type: string; content: string }>;
} {
	const structures: Array<{ type: string; content: string }> = [];
	let processedText = text;

	// Extract code blocks
	processedText = processedText.replace(/```[\s\S]*?```/g, (match) => {
		structures.push({ type: "code", content: match });
		return "{{CODE_BLOCK}}";
	});

	// Extract headers
	processedText = processedText.replace(/^#{1,6}\s.*$/gm, (match) => {
		structures.push({ type: "header", content: match });
		return "{{HEADER}}";
	});

	// Extract lists
	processedText = processedText.replace(/^(\s*[-*+]\s.*)$/gm, (match) => {
		structures.push({ type: "list", content: match });
		return "{{LIST_ITEM}}";
	});

	// Dynamic chunk sizing
	const chunks = processedText.split("\n\n").reduce((acc, para) => {
		if (para.length > MAX_CHUNK_SIZE / 2) {
			acc.push(...chunkText(para, MAX_CHUNK_SIZE / 2));
		} else {
			acc.push(para);
		}
		return acc;
	}, [] as string[]);

	return { chunks, structures };
}

export function chunkText(
	text: string,
	maxChunkSize = MAX_CHUNK_SIZE,
): string[] {
	return text.match(new RegExp(`.{1,${maxChunkSize}}`, "g")) || [];
}

export function localRefinement(markdown: string): string {
	return markdown
		.replace(/\n{3,}/g, "\n\n")
		.replace(/(\*\*.*?\*\*)/g, (match) => `\n${match}\n`)
		.replace(/^-\s/gm, "* ");
}
