import React, { useState } from "react";
import { Button } from "./ui/button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
	text: string;
	className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			className={className}
			onClick={handleCopy}
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}
