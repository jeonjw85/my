"use client";

import { useState } from "react";

type Mode = "encode" | "decode";

export default function Base64Page() {
    const [mode, setMode] = useState<Mode>("encode");
    const [input, setInput] = useState("");
    const [copied, setCopied] = useState(false);

    let output = "";
    let error = "";

    if (input) {
        try {
            if (mode === "encode") {
                output = btoa(unescape(encodeURIComponent(input)));
            } else {
                output = decodeURIComponent(escape(atob(input.trim())));
            }
        } catch {
            error = "변환 실패: 올바른 입력인지 확인하세요.";
        }
    }

    function copy() {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">Base64 인코더 / 디코더</h1>

            <div className="flex gap-2">
                {(["encode", "decode"] as Mode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => {
                            setMode(m);
                            setInput("");
                        }}
                        className={`px-4 py-2 rounded text-sm transition-colors ${mode === m ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                    >
                        {m === "encode" ? "인코딩" : "디코딩"}
                    </button>
                ))}
            </div>

            <textarea
                className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                placeholder={
                    mode === "encode"
                        ? "인코딩할 텍스트 입력..."
                        : "Base64 문자열 입력..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {output && (
                <div className="rounded border border-zinc-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            결과
                        </p>
                        <button
                            onClick={copy}
                            className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                        >
                            {copied ? "복사됨!" : "복사"}
                        </button>
                    </div>
                    <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap break-all">
                        {output}
                    </pre>
                </div>
            )}
        </main>
    );
}
