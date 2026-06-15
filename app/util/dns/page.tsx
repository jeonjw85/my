"use client";

import { useState } from "react";
import Link from "next/link";

interface DnsResult {
    A?: string[];
    AAAA?: string[];
    MX?: { exchange: string; priority: number }[];
    TXT?: string[][];
    NS?: string[];
    CNAME?: string;
    error?: string;
}

export default function DnsPage() {
    const [domain, setDomain] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DnsResult | null>(null);
    const [error, setError] = useState("");

    async function lookup() {
        const d = domain.trim();
        if (!d) return;
        setLoading(true);
        setResult(null);
        setError("");
        try {
            const res = await fetch(
                `/api/util/dns?domain=${encodeURIComponent(d)}`,
            );
            const data = await res.json();
            if (!res.ok) setError(data.error ?? "오류");
            else setResult(data);
        } catch {
            setError("요청 실패");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">DNS 조회</h1>
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
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookup()}
                />
                <button
                    onClick={lookup}
                    disabled={loading}
                    className="px-5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                    {loading ? "조회 중…" : "조회"}
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {result && (
                <div className="space-y-4">
                    {(["A", "AAAA", "NS", "CNAME", "MX", "TXT"] as const).map(
                        (type) => {
                            const val = result[type];
                            if (!val) return null;
                            return (
                                <div
                                    key={type}
                                    className="rounded border border-zinc-800 p-5 space-y-2"
                                >
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                        {type}
                                    </p>
                                    {type === "MX" &&
                                        (val as DnsResult["MX"])!.map(
                                            (r, i) => (
                                                <p
                                                    key={i}
                                                    className="text-sm font-mono text-zinc-300"
                                                >
                                                    {r.priority} {r.exchange}
                                                </p>
                                            ),
                                        )}
                                    {type === "TXT" &&
                                        (val as string[][]).map((r, i) => (
                                            <p
                                                key={i}
                                                className="text-sm font-mono text-zinc-300 break-all"
                                            >
                                                {r.join(" ")}
                                            </p>
                                        ))}
                                    {(type === "A" ||
                                        type === "AAAA" ||
                                        type === "NS") &&
                                        (val as string[]).map((r, i) => (
                                            <p
                                                key={i}
                                                className="text-sm font-mono text-zinc-300"
                                            >
                                                {r}
                                            </p>
                                        ))}
                                    {type === "CNAME" && (
                                        <p className="text-sm font-mono text-zinc-300">
                                            {val as string}
                                        </p>
                                    )}
                                </div>
                            );
                        },
                    )}
                </div>
            )}
        </main>
    );
}
