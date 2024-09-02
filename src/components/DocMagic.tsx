// biome-ignore lint/style/useImportType: <explanation>
import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import "@/app/globals.css";

const DocMagic: React.FC = () => {
	const [inputText, setInputText] = useState("");
	const [outputMarkdown, setOutputMarkdown] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState("");
	const [conversionSteps, setConversionSteps] = useState<string[]>([]);
	const [showTitleDialog, setShowTitleDialog] = useState(false);
	const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
	const [selectedTitle, setSelectedTitle] = useState("");

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputText(e.target.value);
	};

	const handleConvert = async () => {
		setIsLoading(true);
		setProgress(0);
		setStatusMessage("Initiating conversion...");
		setOutputMarkdown("");
		setConversionSteps([]);

		try {
			const steps = [
				"Preprocessing text",
				"Splitting into sections",
				"Converting to Markdown",
				"Applying local refinements",
				"Performing API refinement (if needed)",
				"Finalizing document",
			];

			for (let i = 0; i < steps.length; i++) {
				setConversionSteps((prev) => [...prev, steps[i]]);
				setProgress((i + 1) * (100 / steps.length));
				setStatusMessage(steps[i]);

				// Simulate processing time for each step
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			const response = await fetch("/api/convert", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: inputText }),
			});

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);

			const data = await response.json();
			if (data.error) throw new Error(data.error);

			setOutputMarkdown(data.markdown);
			setProgress(100);
			setStatusMessage("Conversion complete! Generating suggestions...");

			setStatusMessage("Process completed successfully!");
		} catch (error) {
			console.error("Error:", error);
			setOutputMarkdown("An error occurred during conversion");
			setStatusMessage(
				`Error occurred: ${(error as Error).message}. Please try again.`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleExport = async () => {
		setShowTitleDialog(true);
		await generateTitleSuggestions();
	};

	const handleTitleSelect = (title: string) => {
		setSelectedTitle(title);
	};

	const handleTitleConfirm = () => {
		if (selectedTitle) {
			const fileName = `${selectedTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
			const blob = new Blob([outputMarkdown], { type: "text/markdown" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			a.click();
			URL.revokeObjectURL(url);
			setShowTitleDialog(false);
		}
	};

	const generateTitleSuggestions = async () => {
		try {
			const response = await fetch("/api/generate-title", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ markdown: outputMarkdown }),
			});

			if (!response.ok) throw new Error("Failed to generate title suggestions");

			const data = await response.json();
			setTitleSuggestions(data.titles);
			setSelectedTitle(data.titles[0] || "");
		} catch (error) {
			console.error("Error generating title suggestions:", error);
			setTitleSuggestions(["Untitled Document"]);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
			<Card className="w-full max-w-6xl mx-auto bg-gray-800 border-gray-700">
				<CardHeader>
					<CardTitle className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
						DocMagic
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-6">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="input"
								className="text-lg font-semibold text-gray-200 mb-2 block"
							>
								Input Text
							</label>
							<Textarea
								id="input"
								placeholder="Paste your text here..."
								className="w-full h-64 bg-gray-700 text-gray-100 border-gray-600"
								value={inputText}
								onChange={handleInputChange}
							/>
						</div>
						<div>
							<label
								htmlFor="output"
								className="text-lg font-semibold text-gray-200 mb-2 block"
							>
								Markdown Preview
							</label>
							<div className="w-full h-64 bg-gray-700 text-gray-100 border-gray-600 overflow-auto p-4">
								<ReactMarkdown>{outputMarkdown}</ReactMarkdown>
							</div>
						</div>
					</div>
					<Button
						onClick={handleConvert}
						className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded"
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						{isLoading ? "Converting..." : "Convert to Markdown"}
					</Button>
					{isLoading && (
						<div className="space-y-2">
							<Progress value={progress} className="w-full bg-gray-600" />
							<p className="text-center text-gray-300">{statusMessage}</p>
							<div className="bg-gray-700 p-4 rounded-lg">
								<AnimatePresence>
									{conversionSteps.map((step, index) => (
										<motion.div
											key={step}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -20 }}
											transition={{ duration: 0.5 }}
											className="flex items-center text-gray-300 mb-2"
										>
											<CheckCircle className="mr-2 h-4 w-4 text-green-500" />
											<span>{step}</span>
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</div>
					)}
					<Button
						onClick={handleExport}
						className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded"
						disabled={!outputMarkdown}
					>
						<Download className="mr-2 h-4 w-4" /> Export Markdown
					</Button>
					<Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Choose a title for your document</DialogTitle>
							</DialogHeader>
							<Input
								value={selectedTitle}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setSelectedTitle(e.target.value)
								}
								placeholder="Enter a custom title or select a suggestion"
								className="mb-4"
							/>
							<div className="space-y-2">
								{titleSuggestions.map((title, index) => (
									<Button
										key={`title-${index}-${title.slice(0, 10)}`}
										onClick={() => handleTitleSelect(title)}
										variant="outline"
										className="w-full justify-start"
									>
										{title}
									</Button>
								))}
							</div>
							<DialogFooter>
								<Button onClick={handleTitleConfirm}>Confirm & Download</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
};

export default DocMagic;
