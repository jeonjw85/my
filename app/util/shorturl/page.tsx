"use client";

import { useState, useEffect } from "react";

type ShortUrl = {
    id: string;
    slug: string;
    target: string;
    hitCount: number;
    createdAt: string;
};

export default function ShortUrlPage() {
    const [urls, setUrls] = useState<ShortUrl[]>([]);
    const [target, setTarget] = useState("");
    const [customSlug, setCustomSlug] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    async function load() {
        const res = await fetch("/api/util/shorturl");
        if (res.ok) setUrls(await res.json());
    }

    useEffect(() => {
        load();
    }, []);

    async function create() {
        setError("");
        const res = await fetch("/api/util/shorturl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, slug: customSlug || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error);
            return;
        }
        setTarget("");
        setCustomSlug("");
        load();
    }

    async function del(id: string) {
        await fetch("/api/util/shorturl", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        load();
    }

    function copy(slug: string) {
        const url = `${location.origin}/s/${slug}`;
        navigator.clipboard.writeText(url);
        setCopied(slug);
        setTimeout(() => setCopied(null), 1500);
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">단축 URL</h1>

            <div className="rounded border border-zinc-800 p-5 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        원본 URL
                    </label>
                    <input
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        placeholder="https://example.com/very/long/url"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && create()}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        커스텀 슬러그 (선택)
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">
                            {origin}/s/
                        </span>
                        <input
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                            placeholder="my-link"
                            value={customSlug}
                            onChange={(e) => setCustomSlug(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && create()}
                        />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={create}
                    className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                >
                    생성
                </button>
            </div>

            {urls.length > 0 && (
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    {urls.map((u) => (
                        <div
                            key={u.id}
                            className="flex items-center gap-3 px-5 py-3"
                        >
                            <div className="flex-1 min-w-0 space-y-0.5">
                                <p className="text-sm font-mono text-zinc-200 truncate">
                                    {u.target}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {origin}/s/{u.slug} · {u.hitCount}회 클릭
                                </p>
                            </div>
                            <button
                                onClick={() => copy(u.slug)}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
                            >
                                {copied === u.slug ? "✓" : "복사"}
                            </button>
                            <button
                                onClick={() => del(u.id)}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-900 hover:bg-red-900 text-zinc-500 hover:text-red-300 transition-colors shrink-0"
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
