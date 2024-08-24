import { NextRequest, NextResponse } from "next/server";
import { setTimeout } from "timers/promises";
import { log } from "@/utils/logger";
import OpenAI from "openai";
import NodeCache from "node-cache";

const MAX_TOKENS = 8000; // Adjust based on the model's actual limit
const TOKENS_PER_CHAR = 0.25; // Rough estimate, adjust as needed

function estimateTokens(text: string): number {
	return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function splitIntoSections(text: string): string[] {
	const sections: string[] = [];
	let currentSection = "";

	text.split("\n\n").forEach((paragraph) => {
		if (estimateTokens(currentSection + paragraph) > MAX_TOKENS) {
			if (currentSection) sections.push(currentSection);
			currentSection = paragraph;
		} else {
			currentSection += (currentSection ? "\n\n" : "") + paragraph;
		}
	});

	if (currentSection) sections.push(currentSection);
	return sections;
}

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

const MAX_CHUNK_SIZE = 10000;
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// 1. Preprocessing the Text Locally
function preprocessText(text: string): { chunks: string[]; structures: any[] } {
	const structures: any[] = [];

	// Extract code blocks
	text = text.replace(/```[\s\S]*?```/g, (match) => {
		structures.push({ type: "code", content: match });
		return "{{CODE_BLOCK}}";
	});

	// Extract headers
	text = text.replace(/^#{1,6}\s.*$/gm, (match) => {
		structures.push({ type: "header", content: match });
		return "{{HEADER}}";
	});

	// Extract lists
	text = text.replace(/^(\s*[-*+]\s.*)$/gm, (match) => {
		structures.push({ type: "list", content: match });
		return "{{LIST_ITEM}}";
	});

	// Dynamic chunk sizing
	const chunks = text.split("\n\n").reduce((acc, para) => {
		if (para.length > MAX_CHUNK_SIZE / 2) {
			acc.push(...chunkText(para, MAX_CHUNK_SIZE / 2));
		} else {
			acc.push(para);
		}
		return acc;
	}, [] as string[]);

	return { chunks, structures };
}

function chunkText(text: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
	return text.match(new RegExp(`.{1,${maxChunkSize}}`, "g")) || [];
}

// 2. Single API Call with Combined Chunks
async function convertToMarkdown(
	text: string,
	model: "gpt-4o-mini" = "gpt-4o-mini"
): Promise<string> {
	const cacheKey = `markdown_${text.slice(0, 100)}`;
	const cachedResult = cache.get(cacheKey);
	if (cachedResult) {
		return cachedResult as string;
	}

	const prompt = `Convert the following text into well-structured, official documentation in Markdown format.
    Analyze the content, create an appropriate structure, and format it as Markdown.
    Include headers, lists, code blocks, and emphasis where needed.
    Add a brief introduction and conclusion.
    Ensure consistent formatting throughout.

    Text to convert:
    ${text}`;

	try {
		log("info", "Converting to Markdown", { textLength: text.length, model });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: model,
				messages: [{ role: "user", content: prompt }]
			})
		);
		const markdown = result.choices[0].message.content || "";
		cache.set(cacheKey, markdown);
		return markdown;
	} catch (error) {
		log("error", "Error converting to Markdown", { error });
		throw new Error("Markdown conversion failed.");
	}
}

// 3. Post-Processing and Refinement
function localRefinement(markdown: string): string {
	// Implement local refinement logic here
	// For example, ensure consistent newlines, fix common formatting issues, etc.
	return markdown
		.replace(/\n{3,}/g, "\n\n")
		.replace(/(\*\*.*?\*\*)/g, (match) => `\n${match}\n`)
		.replace(/^-\s/gm, "* ");
}

async function apiRefinement(markdown: string): Promise<string> {
	const prompt = `Refine and improve the following Markdown content:

    ${markdown}

    1. Ensure the structure is logical and flows well
    2. Improve transitions between sections
    3. Highlight key terms or concepts
    4. Ensure all links and code blocks are properly formatted
    5. Add or improve any necessary explanations
    6. Maintain a professional and consistent tone throughout`;

	try {
		log("info", "Refining Markdown", { markdownLength: markdown.length });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }]
			})
		);
		return result.choices[0].message.content || "";
	} catch (error) {
		log("error", "Error refining Markdown", { error });
		throw new Error("Markdown refinement failed.");
	}
}

async function callWithRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	let lastError: Error | null = null;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			log("warn", `Attempt ${i + 1} failed, retrying in ${delay}ms...`);
			lastError = error instanceof Error ? error : new Error(String(error));
			await setTimeout(delay);
			delay *= 2; // Exponential backoff
		}
	}
	throw lastError || new Error("Max retries reached");
}

export async function POST(request: NextRequest) {
	try {
		const { text } = await request.json();
		const { structures } = preprocessText(text);

		// Combine all text
		const fullText = text.replace(
			/{{CODE_BLOCK}}|{{HEADER}}|{{LIST_ITEM}}/g,
			(match: string) => {
				const structure = structures.find((s) =>
					s.content.includes(match.slice(2, -2))
				);
				return structure ? structure.content : match;
			}
		);

		// Split into larger sections
		const sections = splitIntoSections(fullText);

		log("info", "Starting conversion process", {
			sectionCount: sections.length
		});

		// Process each section
		const markdownSections = await Promise.all(
			sections.map(async (section, index) => {
				log("info", `Processing section ${index + 1}/${sections.length}`);
				return await convertToMarkdown(section);
			})
		);

		let combinedMarkdown = markdownSections.join("\n\n");

		// Local refinement
		combinedMarkdown = localRefinement(combinedMarkdown);

		// API refinement only if necessary
		if (combinedMarkdown.length > MAX_CHUNK_SIZE) {
			const refinedSections = splitIntoSections(combinedMarkdown);
			combinedMarkdown = (
				await Promise.all(refinedSections.map(apiRefinement))
			).join("\n\n");
		}

		log("info", "Conversion process completed successfully");
		return NextResponse.json({ markdown: combinedMarkdown });
	} catch (error) {
		log("error", "Error during conversion", { error });
		return NextResponse.json(
			{ error: "An error occurred during conversion." },
			{ status: 500 }
		);
	}
}
