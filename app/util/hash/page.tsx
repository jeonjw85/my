"use client";

import { useState } from "react";

type Algo = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
const ALGOS: Algo[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function hashText(text: string, algo: Algo): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest(algo, enc.encode(text));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export default function HashPage() {
    const [input, setInput] = useState("");
    const [algo, setAlgo] = useState<Algo>("SHA-256");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    async function compute() {
        if (!input) return;
        setLoading(true);
        setResult(await hashText(input, algo));
        setLoading(false);
    }

    function copy() {
        if (!result) return;
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">Hash 생성기</h1>

            <div className="flex gap-2 flex-wrap">
                {ALGOS.map((a) => (
                    <button
                        key={a}
                        onClick={() => {
                            setAlgo(a);
                            setResult("");
                        }}
                        className={`px-4 py-2 rounded text-sm transition-colors ${algo === a ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                    >
                        {a}
                    </button>
                ))}
            </div>

            <textarea
                className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                placeholder="해시할 텍스트 입력..."
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    setResult("");
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) compute();
                }}
            />
            <p className="text-xs text-zinc-600">Ctrl+Enter로 즉시 계산</p>

            <button
                onClick={compute}
                disabled={loading || !input}
                className="px-5 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors"
            >
                {loading ? "계산 중…" : "계산"}
            </button>

            {result && (
                <div className="rounded border border-zinc-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            {algo}
                        </p>
                        <button
                            onClick={copy}
                            className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                        >
                            {copied ? "복사됨!" : "복사"}
                        </button>
                    </div>
                    <p className="text-sm font-mono text-zinc-300 break-all">
                        {result}
                    </p>
                </div>
            )}
        </main>
    );
}
