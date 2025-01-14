import OpenAI from "openai";
import { log } from "@/utils/logger";
import { callWithRetry } from "./utils";
import { getCachedMarkdown, setCachedMarkdown } from "./cacheService";

// Initialize OpenAI client with DeepSeek configuration
const openai = new OpenAI({
	apiKey: process.env.DEEPSEEK_API_KEY,
	baseURL: "https://api.deepseek.com/v1" // DeepSeek's API endpoint
});

export async function convertToMarkdown(
	text: string,
	model: string = "deepseek-chat" // Changed default model to DeepSeek's model
): Promise<string> {
	const cacheKey = `markdown_${text.slice(0, 100)}`;
	const cachedResult = getCachedMarkdown(cacheKey);
	if (cachedResult) {
		return cachedResult;
	}

	const prompt = `Convert the following unstructured text into well-structured, professional documentation using Markdown format:

${text}

Instructions:
1. Analyze the content and create an appropriate structure with logical headers.
2. Use Markdown syntax for formatting, including headers, lists, code blocks, and emphasis.
3. Ensure consistent and professional formatting throughout.
4. Include relevant links if mentioned in the original text.
5. Highlight key concepts or terms where appropriate.
6. Organize the content for clarity and readability.
7. Maintain the original information and context.
8. Do not add any introductory or concluding remarks about the conversion process.
9. The output should be pure Markdown, ready for direct use.`;

	try {
		log("info", "Converting to Markdown", { textLength: text.length, model });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: model,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.7,
				max_tokens: 4096 // DeepSeek's default max tokens
			})
		);
		const markdown = result.choices[0].message.content || "";
		setCachedMarkdown(cacheKey, markdown);
		return markdown;
	} catch (error) {
		log("error", "Error converting to Markdown", { error });
		throw new Error("Markdown conversion failed.");
	}
}

export async function apiRefinement(markdown: string): Promise<string> {
	const prompt = `Refine and improve the following Markdown content:

${markdown}

Refinement instructions:
1. Ensure a logical and flowing structure.
2. Improve transitions between sections.
3. Highlight key terms or concepts using appropriate Markdown syntax.
4. Verify and correct formatting of all links and code blocks.
5. Enhance explanations where necessary, maintaining brevity.
6. Ensure a consistent and professional tone.
7. Correct any grammatical or spelling errors.
8. Preserve the original context and core information.
9. Optimize the Markdown structure for readability and clarity.
10. Do not add any comments about the refinement process.
11. The output should be pure, refined Markdown content.`;

	try {
		log("info", "Refining Markdown", { markdownLength: markdown.length });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: "deepseek-chat", // Changed to DeepSeek's model
				messages: [{ role: "user", content: prompt }],
				temperature: 0.7,
				max_tokens: 4096
			})
		);
		return result.choices[0].message.content || "";
	} catch (error) {
		log("error", "Error refining Markdown", { error });
		throw new Error("Markdown refinement failed.");
	}
}
