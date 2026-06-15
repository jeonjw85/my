"use client";

import { useState } from "react";

// Very basic markdown → HTML (no dependencies)
function parseMarkdown(md: string): string {
    return (
        md
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            // code block
            .replace(
                /```([\s\S]*?)```/g,
                (_, c) => `<pre class="md-pre"><code>${c}</code></pre>`,
            )
            // inline code
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // h1-h3
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            // bold/italic
            .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // strikethrough
            .replace(/~~(.+?)~~/g, "<del>$1</del>")
            // links
            .replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener">$1</a>',
            )
            // images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
            // horizontal rule
            .replace(/^---$/gm, "<hr />")
            // blockquote
            .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
            // unordered list
            .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
            // ordered list
            .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
            // paragraphs (double newline)
            .replace(/\n\n/g, "</p><p>")
            // single newline → <br>
            .replace(/\n/g, "<br />")
    );
}

export default function MarkdownPage() {
    const [input, setInput] = useState(`# 마크다운 미리보기

텍스트를 **굵게**, *기울게*, ~~취소선~~으로 표시할 수 있습니다.

\`\`\`
코드 블록
\`\`\`

- 항목 1
- 항목 2

[링크 예시](https://example.com)
`);
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard.writeText(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    }

    const html = parseMarkdown(input);

    return (
        <main className="max-w-5xl mx-auto px-8 py-16 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Markdown 미리보기</h1>
                <button
                    onClick={copy}
                    className="text-sm px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                    {copied ? "복사됨!" : "원본 복사"}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        마크다운 입력
                    </p>
                    <textarea
                        className="w-full h-[32rem] bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        미리보기
                    </p>
                    <div
                        className="h-[32rem] overflow-auto rounded border border-zinc-800 bg-zinc-900 px-6 py-4 prose-custom text-sm text-zinc-200 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
                    />
                </div>
            </div>

            <style>{`
                .prose-custom h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
                .prose-custom h2 { font-size: 1.25rem; font-weight: 600; margin: 0.875rem 0 0.5rem; }
                .prose-custom h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.375rem; }
                .prose-custom strong { font-weight: 700; color: #f4f4f5; }
                .prose-custom em { font-style: italic; }
                .prose-custom del { text-decoration: line-through; opacity: 0.6; }
                .prose-custom code { background: #27272a; padding: 0.1em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.875em; }
                .prose-custom .md-pre { background: #18181b; border: 1px solid #3f3f46; border-radius: 6px; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; }
                .prose-custom .md-pre code { background: none; padding: 0; }
                .prose-custom a { color: #60a5fa; text-decoration: underline; }
                .prose-custom blockquote { border-left: 3px solid #52525b; padding-left: 1rem; opacity: 0.8; margin: 0.5rem 0; }
                .prose-custom hr { border: none; border-top: 1px solid #3f3f46; margin: 1rem 0; }
                .prose-custom li { list-style: disc; margin-left: 1.5rem; }
                .prose-custom img { max-width: 100%; border-radius: 4px; }
            `}</style>
        </main>
    );
}
