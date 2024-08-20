import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

function chunkText(text: string, maxChunkSize = 10000): string[] {
	const chunks: string[] = [];
	for (let i = 0; i < text.length; i += maxChunkSize) {
		chunks.push(text.slice(i, i + maxChunkSize));
	}
	return chunks;
}
async function analyzeContent(text: string): Promise<any> {
	const prompt = `Analyze the following text and provide a JSON object with these properties:
    1. mainTopic: The main topic or theme of the text
    2. contentType: The type of content (e.g., article, tutorial, research paper)
    3. keyPoints: An array of key points or main ideas
    4. suggestedStructure: A suggested structure for organizing the content

    Provide the response as a valid JSON object without any markdown formatting or code blocks.

    Text to analyze:
    ${text}`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	const responseText = await response.text();

	// Remove any potential markdown code block formatting
	const cleanedText = responseText.replace(/```json\n?|```\n?/g, "").trim();

	try {
		return JSON.parse(cleanedText);
	} catch (error) {
		console.error("Failed to parse JSON:", cleanedText);
		console.log("Raw AI response:", responseText);
		console.log("Cleaned response:", cleanedText);
		throw new Error("Invalid JSON response from AI model");
	}
}

async function generateOutline(analysis: any): Promise<string> {
	const prompt = `Based on this content analysis, generate a detailed Markdown outline:
    ${JSON.stringify(analysis, null, 2)}

    Create an outline with appropriate headings, subheadings, and bullet points.`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	return await response.text();
}

async function convertToMarkdown(
	text: string,
	outline: string
): Promise<string> {
	const prompt = `Convert the following text into well-structured Markdown, following this outline:

    Outline:
    ${outline}

    Text to convert:
    ${text}

    Use appropriate Markdown formatting, including headers, lists, code blocks, and emphasis where needed.`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	return await response.text();
}

async function refineMarkdown(markdown: string): Promise<string> {
	const prompt = `Refine the following Markdown content:

    ${markdown}

    1. Ensure consistent formatting throughout
    2. Add or improve transitions between sections
    3. Highlight key terms or concepts
    4. Add a brief introduction and conclusion if not present
    5. Ensure all links and code blocks are properly formatted`;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	return await response.text();
}

export async function POST(request: NextRequest) {
	try {
		const { text } = await request.json();
		const chunks = chunkText(text);
		let finalMarkdown = "";

		for (const chunk of chunks) {
			const analysis = await analyzeContent(chunk);
			if (typeof analysis !== "object") {
				throw new Error("Invalid analysis result");
			}
			const outline = await generateOutline(analysis);
			if (typeof outline !== "string") {
				throw new Error("Invalid outline result");
			}
			let markdown = await convertToMarkdown(chunk, outline);
			if (typeof markdown !== "string") {
				throw new Error("Invalid markdown conversion result");
			}
			markdown = await refineMarkdown(markdown);
			if (typeof markdown !== "string") {
				throw new Error("Invalid markdown refinement result");
			}
			finalMarkdown += markdown + "\n\n---\n\n";
		}

		return NextResponse.json({ markdown: finalMarkdown });
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{ error: "An error occurred during conversion" },
			{ status: 500 }
		);
	}
}
