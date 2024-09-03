// biome-ignore lint/style/useImportType: <explanation>
import React, { useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
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
import Image from "next/image";

const DocMagic = () => {
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
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Simulating API call
			const response = await fetch("/api/convert", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: inputText }),
			});

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);
			const data = await response.json();
			setOutputMarkdown(data.markdown);
			setProgress(100);
			setStatusMessage("Conversion complete!");
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
		// Simulating API call for title suggestions
		setTitleSuggestions([
			"Document 1",
			"Amazing README",
			"Project Overview",
			"User Guide",
			"Technical Specs",
		]);
		setSelectedTitle("Document 1");
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex flex-col items-center">
			<Card className="w-full max-w-6xl bg-gray-800 border-gray-700 overflow-hidden">
				<CardHeader className="bg-gradient-to-r from-purple-800 via-purple-600 to-pink-600 p-8">
					<div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-8">
						<div className="flex items-center space-x-4">
							<Image
								src="/docmagic-icon.png"
								alt="DocMagic Icon"
								width={80}
								height={80}
								className="rounded-full border-4 border-white shadow-lg"
							/>
							<div>
								<CardTitle className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
									DocMagic
								</CardTitle>
								<p className="text-purple-200 text-lg mt-2">
									Transform Your Text with AI
								</p>
							</div>
						</div>
						<div className="flex space-x-4">
							<Button
								variant="secondary"
								className="bg-white text-purple-700 hover:bg-purple-100"
							>
								How It Works
							</Button>
							<Button
								variant="outline"
								className="text-white border-white hover:bg-purple-700"
							>
								Get Started
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<label
								htmlFor="input"
								className="text-lg font-semibold text-gray-200"
							>
								Input Text
							</label>
							<Textarea
								id="input"
								placeholder="Paste your text here..."
								className="h-64 bg-gray-700 text-gray-100 border-gray-600 resize-none"
								value={inputText}
								onChange={handleInputChange}
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="output"
								className="text-lg font-semibold text-gray-200"
							>
								Markdown Preview
							</label>
							<div className="h-64 bg-gray-700 text-gray-100 border border-gray-600 rounded-md overflow-auto p-4">
								<ReactMarkdown>{outputMarkdown}</ReactMarkdown>
							</div>
						</div>
					</div>
					<Button
						onClick={handleConvert}
						className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-md transition-all duration-300 transform hover:scale-105"
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Converting...
							</>
						) : (
							"Convert to Markdown"
						)}
					</Button>
					{isLoading && (
						<div className="space-y-4">
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
						className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 rounded-md transition-all duration-300 transform hover:scale-105"
						disabled={!outputMarkdown}
					>
						<Download className="mr-2 h-4 w-4" />
						Export Markdown
					</Button>
				</CardContent>
				<CardFooter className="bg-gray-900 p-4 text-center text-gray-400">
					Created by{" "}
					<a
						href="https://www.spragginsdesigns.xyz"
						target="_blank"
						rel="noopener noreferrer"
						className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
					>
						Austin Spraggins
					</a>
				</CardFooter>
			</Card>

			<Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
				<DialogContent className="bg-gray-800 text-white">
					<DialogHeader>
						<DialogTitle>Choose a title for your document</DialogTitle>
					</DialogHeader>
					<Input
						value={selectedTitle}
						onChange={(e) => setSelectedTitle(e.target.value)}
						placeholder="Enter a custom title or select a suggestion"
						className="mb-4 bg-gray-700 text-white border-gray-600"
					/>
					<div className="space-y-2">
						{titleSuggestions.map((title, index) => (
							<Button
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								key={index}
								onClick={() => handleTitleSelect(title)}
								variant="outline"
								className="w-full justify-start text-left bg-gray-700 hover:bg-gray-600 border-gray-600"
							>
								{title}
							</Button>
						))}
					</div>
					<DialogFooter>
						<Button
							onClick={handleTitleConfirm}
							className="bg-purple-500 hover:bg-purple-600 text-white"
						>
							Confirm & Download
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default DocMagic;
