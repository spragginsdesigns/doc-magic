import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function generateSuggestions(markdown: string): Promise<string[]> {
	const prompt = `Given the following markdown content, provide 3-5 suggestions for improving or enhancing the document. Focus on structure, content, and clarity. Present each suggestion as a concise, actionable item.

Markdown content:
${markdown}

Provide your suggestions as a JSON array of strings, with each suggestion as a separate string element.`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	const suggestionsText = await response.text();

	try {
		// Remove Markdown code block syntax and any surrounding whitespace
		const cleanedText = suggestionsText
			.replace(/```json\s*|\s*```/g, "")
			.trim();
		let suggestions = JSON.parse(cleanedText);

		if (
			Array.isArray(suggestions) &&
			suggestions.every((s) => typeof s === "string")
		) {
			return suggestions;
		} else {
			throw new Error("Invalid suggestions format");
		}
	} catch (error) {
		console.error("Failed to parse suggestions:", suggestionsText);
		throw new Error(
			`Invalid response from AI model: ${(error as Error).message}`
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { markdown } = await request.json();
		const suggestions = await generateSuggestions(markdown);
		return NextResponse.json({ suggestions });
	} catch (error: unknown) {
		console.error("Error:", error);

		if (error instanceof Error) {
			return NextResponse.json(
				{
					error: "An error occurred while generating suggestions",
					details: error.message,
					stack: error.stack
				},
				{ status: 500 }
			);
		} else {
			return NextResponse.json(
				{
					error: "An unknown error occurred while generating suggestions"
				},
				{ status: 500 }
			);
		}
	}
}
