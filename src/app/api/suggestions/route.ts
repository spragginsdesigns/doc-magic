import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function generateSuggestions(markdown: string): Promise<string[]> {
	const prompt = `Given the following markdown content, provide 3-5 suggestions for improving or enhancing the document. Focus on structure, content, and clarity. Present each suggestion as a concise, actionable item.

Markdown content:
${markdown}

Provide your suggestions as a JSON array of strings.`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	const suggestionsText = await response.text();

	try {
		// Remove Markdown code block syntax if present
		const cleanedText = suggestionsText.replace(/```json\n|\n```/g, "").trim();
		const suggestions = JSON.parse(cleanedText);
		if (Array.isArray(suggestions)) {
			return suggestions;
		} else {
			throw new Error("Invalid suggestions format");
		}
	} catch (error) {
		console.error("Failed to parse suggestions:", suggestionsText);
		throw new Error("Invalid response from AI model");
	}
}

export async function POST(request: NextRequest) {
	try {
		const { markdown } = await request.json();
		const suggestions = await generateSuggestions(markdown);
		return NextResponse.json({ suggestions });
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{ error: "An error occurred while generating suggestions" },
			{ status: 500 }
		);
	}
}
