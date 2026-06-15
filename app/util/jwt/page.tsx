"use client";

import { useState } from "react";
import Link from "next/link";

function b64urlDecode(s: string): string {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    try {
        return decodeURIComponent(
            atob(s)
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join(""),
        );
    } catch {
        return atob(s);
    }
}

export default function JwtPage() {
    const [token, setToken] = useState("");

    let header: Record<string, unknown> | null = null;
    let payload: Record<string, unknown> | null = null;
    let parseErr = "";

    if (token.trim()) {
        const parts = token.trim().split(".");
        if (parts.length !== 3) {
            parseErr = "유효하지 않은 JWT 형식 (점 2개 필요)";
        } else {
            try {
                header = JSON.parse(b64urlDecode(parts[0])) as Record<
                    string,
                    unknown
                >;
                payload = JSON.parse(b64urlDecode(parts[1])) as Record<
                    string,
                    unknown
                >;
            } catch {
                parseErr = "Base64 또는 JSON 파싱 실패";
            }
        }
    }

    const exp = payload && "exp" in payload ? payload.exp : undefined;
    const expDate = typeof exp === "number" ? new Date(exp * 1000) : null;
    const isExpired = expDate ? expDate < new Date() : null;

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">JWT 디코더</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <textarea
                className="w-full h-36 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
                placeholder="JWT 토큰을 붙여넣기하세요..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
            />

            {parseErr && <p className="text-red-400 text-sm">{parseErr}</p>}

            {header && (
                <Section title="Header">
                    <JsonView data={header} />
                </Section>
            )}

            {payload && (
                <Section title="Payload">
                    {expDate && (
                        <p
                            className={`text-sm mb-3 ${isExpired ? "text-red-400" : "text-emerald-400"}`}
                        >
                            exp: {expDate.toLocaleString()}{" "}
                            {isExpired ? "— 만료됨" : "— 유효함"}
                        </p>
                    )}
                    <JsonView data={payload} />
                </Section>
            )}
        </main>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded border border-zinc-800 p-5 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">
                {title}
            </p>
            {children}
        </div>
    );
}

function JsonView({ data }: { data: Record<string, unknown> }) {
    return (
        <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-all">
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}
