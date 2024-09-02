// biome-ignore lint/style/useImportType: <explanation>
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
	try {
		const { markdown } = await request.json();

		const prompt = `Given the following Markdown content, suggest 5 concise and descriptive titles for the document. The titles should be clear, professional, and reflect the main topic or purpose of the content. Provide only the titles, separated by newlines.

Content:
${markdown.slice(0, 1000)}  // Using first 1000 characters for brevity

Titles:`;

		const result = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [{ role: "user", content: prompt }],
		});

		const titles =
			result.choices[0].message.content?.split("\n").filter(Boolean) || [];

		return NextResponse.json({ titles });
	} catch (error) {
		console.error("Error generating title suggestions:", error);
		return NextResponse.json(
			{ error: "Failed to generate title suggestions." },
			{ status: 500 },
		);
	}
}
