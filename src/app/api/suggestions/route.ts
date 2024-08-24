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

async function generateSuggestions(markdown: string): Promise<string[]> {
	const prompt = `Given the following markdown content, provide 3-5 suggestions for improving or enhancing the document. Focus on structure, content, and clarity. Present each suggestion as a concise, actionable item. Start each suggestion with a dash (-).

Markdown content:
${markdown}`;

	try {
		log("info", "Generating suggestions", { contentLength: markdown.length });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: prompt }]
			})
		);
		const suggestionsText = result.choices[0].message.content || "";

		const suggestions = suggestionsText
			.split("\n")
			.filter((line) => line.trim().startsWith("-"))
			.map((line) => line.trim().substring(1).trim());

		if (suggestions.length > 0) {
			log("info", "Suggestions generated successfully", {
				count: suggestions.length
			});
			return suggestions;
		} else {
			log("warn", "No valid suggestions found in AI response");
			return ["No specific suggestions generated. Please try again."];
		}
	} catch (error) {
		log("error", "Error generating suggestions", { error });
		return ["Failed to generate suggestions. Please try again."];
	}
}

export async function POST(request: NextRequest) {
	try {
		const { markdown } = await request.json();
		const suggestions = await generateSuggestions(markdown);
		return NextResponse.json({ suggestions });
	} catch (error: unknown) {
		log("error", "Error in POST handler", { error });
		if (error instanceof Error) {
			return NextResponse.json(
				{
					error: "An error occurred while generating suggestions",
					details: error.message
				},
				{ status: 500 }
			);
		} else {
			return NextResponse.json(
				{ error: "An unknown error occurred while generating suggestions" },
				{ status: 500 }
			);
		}
	}
}
