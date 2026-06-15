"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegexPage() {
    const [pattern, setPattern] = useState("");
    const [flags, setFlags] = useState("g");
    const [text, setText] = useState("");
    const [showSub, setShowSub] = useState(false);
    const [replacement, setReplacement] = useState("");

    let error = "";
    let matches: RegExpMatchArray[] = [];
    let highlighted: React.ReactNode = null;
    let replaced = "";

    if (pattern) {
        try {
            const re = new RegExp(
                pattern,
                flags.includes("g") ? flags : flags + "g",
            );
            const allFlags = re.flags;
            const re2 = new RegExp(pattern, allFlags);
            const raw = [...text.matchAll(re2)];
            matches = raw;

            // highlight
            const segments: React.ReactNode[] = [];
            let cursor = 0;
            for (const m of raw) {
                const start = m.index ?? 0;
                if (cursor < start) segments.push(text.slice(cursor, start));
                segments.push(
                    <mark
                        key={start}
                        className="bg-yellow-500/40 text-yellow-200 rounded-sm"
                    >
                        {m[0]}
                    </mark>,
                );
                cursor = start + m[0].length;
                if (m[0].length === 0) cursor++;
            }
            if (cursor < text.length) segments.push(text.slice(cursor));
            highlighted = segments;

            // replace
            if (showSub) {
                replaced = text.replace(
                    new RegExp(
                        pattern,
                        flags.includes("g") ? flags : flags + "g",
                    ),
                    replacement,
                );
            }
        } catch (e: unknown) {
            error = (e as Error).message;
        }
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">정규식 테스터</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        placeholder="패턴 (예: \d+)"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                    />
                    <input
                        className="w-24 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        placeholder="flags"
                        value={flags}
                        onChange={(e) => setFlags(e.target.value)}
                    />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}

                <textarea
                    className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                    placeholder="테스트할 텍스트 입력..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
            </div>

            {text && !error && (
                <div className="rounded border border-zinc-800 p-5 space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        결과 — {matches.length}개 매칭
                    </p>
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-all">
                        {highlighted ?? text}
                    </pre>
                </div>
            )}

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="accent-zinc-400"
                        checked={showSub}
                        onChange={(e) => setShowSub(e.target.checked)}
                    />
                    치환 테스트
                </label>
                {showSub && (
                    <>
                        <input
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                            placeholder="치환 문자열 (예: $1)"
                            value={replacement}
                            onChange={(e) => setReplacement(e.target.value)}
                        />
                        {replaced && (
                            <div className="rounded border border-zinc-800 p-5">
                                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                                    치환 결과
                                </p>
                                <pre className="text-sm text-zinc-300 whitespace-pre-wrap break-all">
                                    {replaced}
                                </pre>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
