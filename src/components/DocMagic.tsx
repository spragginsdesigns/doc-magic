import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/cjs/styles/prism";

const DocMagic = () => {
	const [inputText, setInputText] = useState("");
	const [outputMarkdown, setOutputMarkdown] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState("");
	const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
	const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputText(e.target.value);
	};

	const handleConvert = async () => {
		setIsLoading(true);
		setProgress(0);
		setStatusMessage("Initiating conversion...");

		try {
			const response = await fetch("/api/convert", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ text: inputText })
			});

			// Simulating progress updates
			const interval = setInterval(() => {
				setProgress((prevProgress) => {
					const newProgress = prevProgress + 10;
					if (newProgress >= 90) {
						clearInterval(interval);
						return 90;
					}
					setStatusMessage(`Converting... ${newProgress}% complete`);
					return newProgress;
				});
			}, 1000);

			const data = await response.json();
			clearInterval(interval);
			setOutputMarkdown(data.markdown);
			setProgress(100);
			setStatusMessage("Conversion complete!");
		} catch (error) {
			console.error("Error:", error);
			setOutputMarkdown("An error occurred during conversion");
			setStatusMessage("Error occurred. Please try again.");
		}
		setIsLoading(false);
	};

	const handleExport = () => {
		const blob = new Blob([outputMarkdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "converted_markdown.md";
		a.click();
		URL.revokeObjectURL(url);
	};

	const generateAiSuggestions = useCallback(async () => {
		setIsSuggestionsLoading(true);
		setStatusMessage("Generating AI suggestions...");
		try {
			const response = await fetch("/api/suggestions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ markdown: outputMarkdown })
			});

			if (!response.ok) {
				throw new Error("Failed to fetch suggestions");
			}

			const data = await response.json();
			setAiSuggestions(data.suggestions);
		} catch (error) {
			console.error("Error generating suggestions:", error);
			setAiSuggestions(["Failed to generate suggestions. Please try again."]);
		} finally {
			setStatusMessage("");
			setIsSuggestionsLoading(false);
		}
	}, [outputMarkdown]);

	useEffect(() => {
		if (outputMarkdown && !isLoading) {
			generateAiSuggestions();
		}
	}, [outputMarkdown, isLoading, generateAiSuggestions]);

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
								<ReactMarkdown
									components={{
										code({
											node,
											inline,
											className,
											children,
											...props
										}: Components["code"]) {
											const match = /language-(\w+)/.exec(className || "");
											return !inline && match ? (
												<SyntaxHighlighter
													style={dark}
													language={match[1]}
													PreTag="div"
													{...props}
												>
													{String(children).replace(/\n$/, "")}
												</SyntaxHighlighter>
											) : (
												<code className={className} {...props}>
													{children}
												</code>
											);
										}
									}}
								>
									{outputMarkdown}
								</ReactMarkdown>
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
							<Progress value={progress} className="w-full" />
							<p className="text-center text-gray-300">{statusMessage}</p>
						</div>
					)}
					{aiSuggestions.length > 0 && (
						<div className="bg-gray-700 p-4 rounded-lg">
							<h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center">
								<Lightbulb className="mr-2 h-5 w-5" /> AI Suggestions
							</h3>
							{isSuggestionsLoading ? (
								<p className="text-gray-300">Generating suggestions...</p>
							) : (
								<ul className="list-disc list-inside text-gray-300">
									{aiSuggestions.map((suggestion, index) => (
										<li key={index}>{suggestion}</li>
									))}
								</ul>
							)}
						</div>
					)}
					<Button
						onClick={handleExport}
						className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded"
						disabled={!outputMarkdown}
					>
						<Download className="mr-2 h-4 w-4" /> Export Markdown
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};

export default DocMagic;
