import React, { useState } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { log } from "@/utils/logger";

interface MarkdownEditorProps {
	markdown: string;
	onSave: (editedMarkdown: string) => void;
	onCancel: () => void;
}

export function MarkdownEditor({
	markdown,
	onSave,
	onCancel
}: MarkdownEditorProps) {
	const [editedContent, setEditedContent] = useState(markdown);

	const handleSave = () => {
		log("info", "Saving edited markdown");
		onSave(editedContent);
	};

	return (
		<Card className="p-4">
			<Textarea
				className="min-h-[400px] mb-4 font-mono"
				value={editedContent}
				onChange={(e) => setEditedContent(e.target.value)}
				placeholder="Edit your markdown here..."
			/>
			<div className="flex gap-2 justify-end">
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button onClick={handleSave}>Save Changes</Button>
			</div>
		</Card>
	);
}
