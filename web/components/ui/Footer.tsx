'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-muted/30 border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Moderation Bias. All rights reserved.
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="https://x.com/jmk9494" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="X (Twitter)">
                            <Twitter className="h-5 w-5" />
                        </Link>
                        <Link href="https://www.linkedin.com/in/jacobkandel" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                            <Linkedin className="h-5 w-5" />
                        </Link>
                        <Link href="https://github.com/jacobkandel" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                            <Github className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
