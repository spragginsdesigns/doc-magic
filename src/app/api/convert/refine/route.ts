import { NextRequest, NextResponse } from "next/server";
import { log } from "@/utils/logger";
import { apiRefinement } from "../services/openaiService";

export async function POST(request: NextRequest) {
	try {
		const { markdown } = await request.json();

		if (!markdown) {
			return NextResponse.json(
				{ error: "No markdown content provided" },
				{ status: 400 }
			);
		}

		const refined = await apiRefinement(markdown);
		return NextResponse.json({ markdown: refined });
	} catch (error) {
		log("error", "Error in markdown refinement", { error });
		return NextResponse.json(
			{ error: "Failed to refine markdown" },
			{ status: 500 }
		);
	}
}
