"use client";

import { useState } from "react";
import Link from "next/link";

interface Hop {
    url: string;
    status?: number;
}

export default function RedirectPage() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [hops, setHops] = useState<Hop[]>([]);
    const [error, setError] = useState("");

    async function check() {
        const u = url.trim();
        if (!u) return;
        setLoading(true);
        setHops([]);
        setError("");
        try {
            const res = await fetch(
                `/api/util/redirect?url=${encodeURIComponent(u)}`,
            );
            const data = await res.json();
            if (!res.ok) setError(data.error ?? "오류");
            else setHops(data.chain ?? []);
        } catch {
            setError("요청 실패");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">리다이렉트 추적기</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="flex gap-2">
                <input
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && check()}
                />
                <button
                    onClick={check}
                    disabled={loading}
                    className="px-5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                    {loading ? "조회 중…" : "추적"}
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {hops.length > 0 && (
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    {hops.map((hop, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 px-5 py-3"
                        >
                            <span className="text-xs text-zinc-600 w-6 shrink-0">
                                {i + 1}
                            </span>
                            {hop.status !== undefined && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                                        hop.status >= 300 && hop.status < 400
                                            ? "bg-yellow-800 text-yellow-200"
                                            : hop.status >= 200 &&
                                                hop.status < 300
                                              ? "bg-emerald-900 text-emerald-300"
                                              : "bg-red-900 text-red-300"
                                    }`}
                                >
                                    {hop.status}
                                </span>
                            )}
                            <span className="text-sm font-mono text-zinc-300 break-all">
                                {hop.url}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
