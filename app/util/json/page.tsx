"use client";

import { useState } from "react";

export default function JsonPage() {
    const [input, setInput] = useState("");
    const [indent, setIndent] = useState(2);
    const [copied, setCopied] = useState(false);

    let output = "";
    let error = "";
    let byteSize = 0;

    if (input.trim()) {
        try {
            const parsed = JSON.parse(input);
            output = JSON.stringify(parsed, null, indent);
            byteSize = new TextEncoder().encode(output).length;
        } catch (e: unknown) {
            error = (e as Error).message;
        }
    }

    function copy() {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    }

    function minify() {
        if (!output) return;
        try {
            const minified = JSON.stringify(JSON.parse(input));
            navigator.clipboard.writeText(minified);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {}
    }

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">JSON 포매터 / 검증기</h1>

            <div className="flex items-center gap-4">
                <label className="text-sm text-zinc-400">들여쓰기</label>
                {[2, 4, 8].map((n) => (
                    <button
                        key={n}
                        onClick={() => setIndent(n)}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${indent === n ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                    >
                        {n}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        입력
                    </p>
                    <textarea
                        className="w-full h-96 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        placeholder='{"key": "value"}'
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            결과
                        </p>
                        <div className="flex items-center gap-2">
                            {byteSize > 0 && (
                                <span className="text-xs text-zinc-600">
                                    {byteSize.toLocaleString()} bytes
                                </span>
                            )}
                            <button
                                onClick={minify}
                                disabled={!output}
                                className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                            >
                                미니파이 복사
                            </button>
                            <button
                                onClick={copy}
                                disabled={!output}
                                className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
                            >
                                {copied ? "복사됨!" : "복사"}
                            </button>
                        </div>
                    </div>
                    {error ? (
                        <div className="h-96 rounded border border-red-800 px-4 py-3 bg-zinc-900">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    ) : (
                        <pre className="h-96 overflow-auto rounded border border-zinc-800 px-4 py-3 text-sm font-mono text-zinc-300 whitespace-pre bg-zinc-900">
                            {output}
                        </pre>
                    )}
                </div>
            </div>
        </main>
    );
}
