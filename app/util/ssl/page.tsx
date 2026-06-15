"use client";

import { useState } from "react";
import Link from "next/link";

interface SslResult {
    subject: Record<string, string>;
    issuer: Record<string, string>;
    validFrom: string;
    validTo: string;
    subjectAltName: string;
    fingerprint: string;
    expired: boolean;
}

export default function SslPage() {
    const [domain, setDomain] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SslResult | null>(null);
    const [error, setError] = useState("");

    async function check() {
        const d = domain.trim();
        if (!d) return;
        setLoading(true);
        setResult(null);
        setError("");
        try {
            const res = await fetch(
                `/api/util/ssl?domain=${encodeURIComponent(d)}`,
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
                <h1 className="text-2xl font-bold">SSL 인증서 확인</h1>
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
                    onKeyDown={(e) => e.key === "Enter" && check()}
                />
                <button
                    onClick={check}
                    disabled={loading}
                    className="px-5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                    {loading ? "확인 중…" : "확인"}
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {result && (
                <div className="space-y-4">
                    <div
                        className={`flex items-center gap-3 rounded border px-5 py-3 ${result.expired ? "border-red-800" : "border-emerald-800"}`}
                    >
                        <span
                            className={`text-sm font-medium ${result.expired ? "text-red-400" : "text-emerald-400"}`}
                        >
                            {result.expired ? "만료됨" : "유효함"}
                        </span>
                        <span className="text-sm text-zinc-400">
                            {result.validFrom} → {result.validTo}
                        </span>
                    </div>

                    {(
                        [
                            [
                                "발급 대상 (Subject)",
                                JSON.stringify(result.subject, null, 2),
                            ],
                            [
                                "발급자 (Issuer)",
                                JSON.stringify(result.issuer, null, 2),
                            ],
                            ["SAN", result.subjectAltName],
                            ["지문 (Fingerprint)", result.fingerprint],
                        ] as [string, string][]
                    ).map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded border border-zinc-800 p-5 space-y-2"
                        >
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                {label}
                            </p>
                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap break-all">
                                {value}
                            </pre>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
