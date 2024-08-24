import { NextRequest, NextResponse } from "next/server";
import { setTimeout } from "timers/promises";
import { log } from "@/utils/logger";
import OpenAI from "openai";

// OpenAI initialization
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

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

interface DocumentAnalysis {
	contentSummary: string;
	detectedSections: string[];
	structuralElements: string[];
	enhancementOpportunities: string[];
	estimatedReadingTime: number;
}

async function analyzeDocument(text: string): Promise<DocumentAnalysis> {
	if (!text || typeof text !== "string") {
		throw new Error("Invalid input: text must be a non-empty string");
	}

	const prompt = `Analyze the following unstructured text and provide insights in the following format:
    1. Content Summary: A brief 1-2 sentence summary of the content.
    2. Detected Sections: List the main topics or sections you can identify.
    3. Structural Elements: Identify any existing structural elements (e.g., lists, potential headers, code blocks).
    4. Enhancement Opportunities: Suggest 2-3 ways the structure could be improved in markdown.
    5. Estimated Reading Time: Provide an estimated reading time in minutes.

    Text to analyze:
    ${text}`;

	try {
		log("info", "Analyzing document", { contentLength: text.length });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }]
			})
		);
		const analysis = result.choices[0].message.content || "";

		const parsedAnalysis = parseAnalysis(analysis);

		log("info", "Document analysis completed successfully");
		return parsedAnalysis;
	} catch (error) {
		log("error", "Error analyzing document", { error });
		throw new Error(
			"Document analysis failed: " +
				(error instanceof Error ? error.message : String(error))
		);
	}
}

function parseAnalysis(analysis: string): DocumentAnalysis {
	const sections = analysis.split(/\d+\.\s/).filter(Boolean);
	return {
		contentSummary: sections[0]?.trim() || "No summary available.",
		detectedSections:
			sections[1]
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean) || [],
		structuralElements:
			sections[2]
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean) || [],
		enhancementOpportunities:
			sections[3]
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean) || [],
		estimatedReadingTime: parseInt(sections[4]?.match(/\d+/)?.[0] || "0", 10)
	};
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		if (!body || !body.text) {
			return NextResponse.json(
				{ error: "Invalid request: missing 'text' in the request body" },
				{ status: 400 }
			);
		}
		const analysis = await analyzeDocument(body.text);
		return NextResponse.json({ analysis });
	} catch (error: unknown) {
		log("error", "Error in POST handler", { error });
		if (error instanceof Error) {
			return NextResponse.json(
				{
					error: "An error occurred while analyzing the document",
					details: error.message
				},
				{ status: 500 }
			);
		} else {
			return NextResponse.json(
				{ error: "An unknown error occurred while analyzing the document" },
				{ status: 500 }
			);
		}
	}
}
