import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Configuration
const MAX_CHUNK_SIZE = 10000; // Adjust based on model's context window

// Utility function to split text into chunks
function chunkText(text: string, maxChunkSize = MAX_CHUNK_SIZE): string[] {
	const chunks: string[] = [];
	for (let i = 0; i < text.length; i += maxChunkSize) {
		chunks.push(text.slice(i, i + maxChunkSize));
	}
	return chunks;
}

// Function to analyze a single chunk of text
async function analyzeContent(text: string): Promise<any> {
	const prompt = `Analyze the following text and provide a JSON object with these properties:
    mainTopic: The main topic or theme of the text
    contentType: The type of content (e.g., article, tutorial, research paper)
    keyPoints: An array of key points or main ideas
    suggestedStructure: A suggested structure for organizing the content

    Provide the response as a valid JSON object without any markdown formatting or code blocks.

    Text to analyze:
    ${text}`;

	try {
		const result = await model.generateContent(prompt);
		const responseText = await result.response.text();

		// Safely parse JSON, handling potential errors
		return JSON.parse(responseText.replace(/```json\n?|```\n?/g, "").trim());
	} catch (error) {
		console.error("Error analyzing content:", error);
		throw new Error("Content analysis failed.");
	}
}

// Function to generate a Markdown outline from analysis
async function generateOutline(analysis: any): Promise<string> {
	const prompt = `Based on this content analysis, generate a detailed Markdown outline:
    ${JSON.stringify(analysis, null, 2)}

    Create an outline with appropriate headings, subheadings, and bullet points.`;

	try {
		const result = await model.generateContent(prompt);
		return await result.response.text();
	} catch (error) {
		console.error("Error generating outline:", error);
		throw new Error("Outline generation failed.");
	}
}

// Function to convert a text chunk to Markdown based on an outline
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

	try {
		const result = await model.generateContent(prompt);
		return await result.response.text();
	} catch (error) {
		console.error("Error converting to Markdown:", error);
		throw new Error("Markdown conversion failed.");
	}
}

// Function to refine generated Markdown
async function refineMarkdown(markdown: string): Promise<string> {
	const prompt = `Refine the following Markdown content:

    ${markdown}

    1. Ensure consistent formatting throughout
    2. Add or improve transitions between sections
    3. Highlight key terms or concepts
    4. Add a brief introduction and conclusion if not present
    5. Ensure all links and code blocks are properly formatted`;

	try {
		const result = await model.generateContent(prompt);
		return await result.response.text();
	} catch (error) {
		console.error("Error refining Markdown:", error);
		throw new Error("Markdown refinement failed.");
	}
}

// Main API route handler
export async function POST(request: NextRequest) {
	try {
		const { text } = await request.json();
		const chunks = chunkText(text);
		let finalMarkdown = "";

		for (const chunk of chunks) {
			const analysis = await analyzeContent(chunk);
			const outline = await generateOutline(analysis);
			let markdown = await convertToMarkdown(chunk, outline);
			markdown = await refineMarkdown(markdown);

			finalMarkdown += markdown + "\n\n---\n\n";
		}

		return NextResponse.json({ markdown: finalMarkdown });
	} catch (error) {
		console.error("Error during conversion:", error);
		return NextResponse.json(
			{ error: "An error occurred during conversion." },
			{ status: 500 }
		);
	}
}
