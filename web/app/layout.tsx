import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalSidebar } from "@/components/ui/GlobalSidebar";
import { Footer } from "@/components/ui/Footer";
import SkipLink from "@/components/SkipLink";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/ui/CommandPalette";
import JsonLd from "@/components/JsonLd";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://moderationbias.com'),
  title: 'Moderation Bias - Into the Black Box',
  description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude via automated red-teaming.',
  keywords: ['LLM', 'AI Bias', 'Content Moderation', 'Censorship', 'Llama-3', 'GPT-4', 'Claude', 'AI Safety', 'Red Teaming'],
  authors: [{ name: 'Jacob Kandel', url: 'https://github.com/jacobkandel' }],
  creator: 'Jacob Kandel',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'LLM Censorship Benchmark: Live Audit',
    description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude via automated red-teaming.',
    url: 'https://moderationbias.com',
    siteName: 'Moderation Bias',
    images: [
      {
        url: '/assets/heatmap.png',
        width: 1200,
        height: 630,
        alt: 'LLM Bias Heatmap',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Censorship Benchmark: Live Audit',
    description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
    creator: '@jmk9494',
    images: ['/assets/heatmap.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex min-h-screen bg-white text-slate-900 overflow-x-hidden`}
      >
        <ThemeProvider>
          <ToastProvider>
            <JsonLd />
            <CommandPalette />
            <SkipLink />
            <GlobalSidebar />
            <div className="flex flex-col flex-1 lg:ml-72">
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <Analytics />
            <SpeedInsights />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
