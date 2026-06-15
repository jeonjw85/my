"use client";

import { useState } from "react";
import Link from "next/link";

export default function OnetimeMemoPage() {
    const [mode, setMode] = useState<"create" | "view">("create");
    const [content, setContent] = useState("");
    const [createdId, setCreatedId] = useState("");
    const [viewId, setViewId] = useState("");
    const [viewed, setViewed] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    async function create() {
        if (!content.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/util/memo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error ?? "오류");
            else {
                setCreatedId(data.id);
                setContent("");
            }
        } finally {
            setLoading(false);
        }
    }

    async function view() {
        const id = viewId.trim();
        if (!id) return;
        setLoading(true);
        setViewed("");
        setError("");
        try {
            const res = await fetch(`/api/util/memo/${id}`);
            const data = await res.json();
            if (!res.ok) setError(data.error ?? "오류");
            else setViewed(data.content);
        } finally {
            setLoading(false);
        }
    }

    const link =
        createdId && typeof window !== "undefined"
            ? `${window.location.origin}/util/onetimememo?id=${createdId}`
            : "";

    // URL에 ?id= 있으면 자동으로 조회 모드
    if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");
        if (urlId && mode === "create" && !viewed && !error) {
            setMode("view");
            setViewId(urlId);
        }
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">일회성 메모</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="flex gap-2 text-sm">
                <button
                    onClick={() => {
                        setMode("create");
                        setError("");
                    }}
                    className={`px-4 py-2 rounded transition-colors ${mode === "create" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                >
                    생성
                </button>
                <button
                    onClick={() => {
                        setMode("view");
                        setError("");
                    }}
                    className={`px-4 py-2 rounded transition-colors ${mode === "view" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                >
                    조회
                </button>
            </div>

            {mode === "create" && (
                <div className="space-y-4">
                    <textarea
                        className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        placeholder="한 번만 읽을 수 있는 메모 내용을 입력하세요..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={10000}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">
                            {content.length}/10,000
                        </span>
                        <button
                            onClick={create}
                            disabled={loading || !content.trim()}
                            className="px-5 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors"
                        >
                            {loading ? "생성 중…" : "링크 생성"}
                        </button>
                    </div>
                    {createdId && (
                        <div className="rounded border border-zinc-700 p-5 space-y-3">
                            <p className="text-sm text-zinc-300">
                                링크가 생성되었습니다. 이 링크는 한 번만 열 수
                                있습니다.
                            </p>
                            <p className="text-sm font-mono text-zinc-400 break-all">
                                {link}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                            >
                                {copied ? "복사됨!" : "링크 복사"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {mode === "view" && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                            placeholder="메모 ID 입력"
                            value={viewId}
                            onChange={(e) => setViewId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && view()}
                        />
                        <button
                            onClick={view}
                            disabled={loading}
                            className="px-5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors"
                        >
                            {loading ? "조회 중…" : "열기"}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {viewed && (
                        <div className="rounded border border-amber-800 p-5 space-y-2">
                            <p className="text-xs text-amber-500">
                                ⚠ 이 메모는 방금 삭제되었습니다 (일회성)
                            </p>
                            <pre className="text-sm text-zinc-200 whitespace-pre-wrap break-all">
                                {viewed}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
