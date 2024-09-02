// biome-ignore lint/style/useImportType: <explanation>
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { log } from "@/utils/logger";
import {
	preprocessText,
	splitIntoSections,
	localRefinement,
} from "./services/textProcessing";
import { convertToMarkdown, apiRefinement } from "./services/openaiService";
import { getCachedMarkdown, setCachedMarkdown } from "./services/cacheService";

const MAX_CHUNK_SIZE = 10000;

export async function POST(request: NextRequest) {
	try {
		const { text } = await request.json();
		const { structures } = preprocessText(text);

		// Combine all text
		const fullText = text.replace(
			/{{CODE_BLOCK}}|{{HEADER}}|{{LIST_ITEM}}/g,
			(match: string) => {
				const structure = structures.find((s) =>
					s.content.includes(match.slice(2, -2)),
				);
				return structure ? structure.content : match;
			},
		);

		// Split into larger sections
		const sections = splitIntoSections(fullText);

		log("info", "Starting conversion process", {
			sectionCount: sections.length,
		});

		// Process each section
		const markdownSections = await Promise.all(
			sections.map(async (section, index) => {
				log("info", `Processing section ${index + 1}/${sections.length}`);
				const cacheKey = `markdown_${section.slice(0, 100)}`;
				const cachedResult = getCachedMarkdown(cacheKey);
				if (cachedResult) return cachedResult;

				const result = await convertToMarkdown(section, "gpt-4o-mini");
				setCachedMarkdown(cacheKey, result);
				return result;
			}),
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
			{ status: 500 },
		);
	}
}
