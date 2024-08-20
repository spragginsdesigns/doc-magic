import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Doc Magic | AI-Powered Document Conversion",
	description:
		"Transform your documents with AI-powered conversion. Doc Magic helps you convert and structure your content effortlessly.",
	metadataBase: new URL("https://docmagic.vercel.app"),
	authors: [{ name: "Austin Spraggins" }],
	creator: "Austin Spraggins",
	publisher: "Austin Spraggins",
	openGraph: {
		title: "Doc Magic | AI-Powered Document Conversion",
		description:
			"Transform your documents with AI-powered conversion. Doc Magic helps you convert and structure your content effortlessly.",
		url: "https://docmagic.vercel.app",
		siteName: "Doc Magic",
		images: [
			{
				url: "https://docmagic.vercel.app/docmagic-og.png", // You'll need to create this image
				width: 1200,
				height: 630,
				alt: "Doc Magic Open Graph Image"
			}
		],
		locale: "en_US",
		type: "website"
	},
	twitter: {
		card: "summary_large_image",
		title: "Doc Magic | AI-Powered Document Conversion",
		description:
			"Transform your documents with AI-powered conversion. Doc Magic helps you convert and structure your content effortlessly.",
		images: ["https://docmagic.vercel.app/docmagic-og.png"], // Same as OG image
		creator: "@austinspraggins" // Replace with actual Twitter handle if available
	},
	icons: {
		icon: "/docmagic-icon.png",
		shortcut: "/docmagic-icon.png",
		apple: "/docmagic-icon.png",
		other: {
			rel: "apple-touch-icon-precomposed",
			url: "/docmagic-icon.png"
		}
	}
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/docmagic-icon.png" />
			</head>
			<body className={inter.className}>{children}</body>
		</html>
	);
}
