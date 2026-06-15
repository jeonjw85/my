"use client";

import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

type HttpResult = {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    elapsed: number;
};

export default function HttpClientPage() {
    const [url, setUrl] = useState("https://httpbin.org/get");
    const [method, setMethod] = useState("GET");
    const [reqHeaders, setReqHeaders] = useState(
        "Content-Type: application/json",
    );
    const [body, setBody] = useState("");
    const [result, setResult] = useState<HttpResult | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<"body" | "headers">("body");
    const [copied, setCopied] = useState(false);

    async function send() {
        setLoading(true);
        setError("");
        setResult(null);
        const res = await fetch("/api/util/httpclient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, method, headers: reqHeaders, body }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok || data.error) {
            setError(data.error ?? "오류");
            return;
        }
        setResult(data);
    }

    function statusColor(s: number) {
        if (s < 300) return "text-emerald-400";
        if (s < 400) return "text-yellow-400";
        return "text-red-400";
    }

    function copy() {
        if (!result) return;
        navigator.clipboard.writeText(result.body);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <main className="max-w-5xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">HTTP 클라이언트</h1>

            {/* Request */}
            <div className="space-y-4 rounded border border-zinc-800 p-5">
                <div className="flex gap-2">
                    <select
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    >
                        {METHODS.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </select>
                    <input
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        placeholder="https://api.example.com/endpoint"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send()}
                    />
                    <button
                        onClick={send}
                        disabled={loading || !url.trim()}
                        className="px-5 py-2.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
                    >
                        {loading ? "전송 중..." : "전송"}
                    </button>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        헤더 (한 줄에 하나)
                    </label>
                    <textarea
                        className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        value={reqHeaders}
                        onChange={(e) => setReqHeaders(e.target.value)}
                        placeholder={
                            "Authorization: Bearer token\nAccept: application/json"
                        }
                    />
                </div>
                {["POST", "PUT", "PATCH"].includes(method) && (
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase tracking-widest">
                            요청 바디
                        </label>
                        <textarea
                            className="w-full h-28 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder='{"key": "value"}'
                        />
                    </div>
                )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Response */}
            {result && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span
                                className={`font-mono font-bold ${statusColor(result.status)}`}
                            >
                                {result.status} {result.statusText}
                            </span>
                            <span className="text-xs text-zinc-500">
                                {result.elapsed}ms
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTab("body")}
                                className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === "body" ? "bg-zinc-700" : "bg-zinc-900 hover:bg-zinc-800"}`}
                            >
                                Body
                            </button>
                            <button
                                onClick={() => setTab("headers")}
                                className={`text-xs px-3 py-1.5 rounded transition-colors ${tab === "headers" ? "bg-zinc-700" : "bg-zinc-900 hover:bg-zinc-800"}`}
                            >
                                Headers
                            </button>
                            <button
                                onClick={copy}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                {copied ? "✓" : "복사"}
                            </button>
                        </div>
                    </div>
                    {tab === "body" ? (
                        <pre className="bg-zinc-900 border border-zinc-800 rounded p-5 text-sm font-mono overflow-auto max-h-[50vh] text-zinc-300 whitespace-pre-wrap">
                            {(() => {
                                try {
                                    return JSON.stringify(
                                        JSON.parse(result.body),
                                        null,
                                        2,
                                    );
                                } catch {
                                    return result.body;
                                }
                            })()}
                        </pre>
                    ) : (
                        <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                            {Object.entries(result.headers).map(([k, v]) => (
                                <div key={k} className="flex px-5 py-2">
                                    <span className="text-xs font-mono text-zinc-500 w-48 shrink-0">
                                        {k}
                                    </span>
                                    <span className="text-xs font-mono text-zinc-300 break-all">
                                        {v}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
