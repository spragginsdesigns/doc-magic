import OpenAI from "openai";
import { log } from "@/utils/logger";
import { callWithRetry } from "./utils";
import { getCachedMarkdown, setCachedMarkdown } from "./cacheService";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function convertToMarkdown(
	text: string,
	model: "gpt-4o-mini" = "gpt-4o-mini",
): Promise<string> {
	const cacheKey = `markdown_${text.slice(0, 100)}`;
	const cachedResult = getCachedMarkdown(cacheKey);
	if (cachedResult) {
		return cachedResult;
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
				messages: [{ role: "user", content: prompt }],
			}),
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

    1. Ensure the structure is logical and flows well
    2. Improve transitions between sections
    3. Highlight key terms or concepts
    4. Ensure all links and code blocks are properly formatted
    5. Add or improve any necessary explanations
    6. Maintain a professional and consistent tone throughout
    7. Ensure the content is free of grammatical errors
    8. Ensure the original wording is still maintained and the context is preserved`;

	try {
		log("info", "Refining Markdown", { markdownLength: markdown.length });
		const result = await callWithRetry(() =>
			openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }],
			}),
		);
		return result.choices[0].message.content || "";
	} catch (error) {
		log("error", "Error refining Markdown", { error });
		throw new Error("Markdown refinement failed.");
	}
}
