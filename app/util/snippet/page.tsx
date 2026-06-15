"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Snippet {
    id: string;
    title: string;
    language: string;
    content: string;
    createdAt: string;
}

const LANGS = [
    "plaintext",
    "bash",
    "python",
    "javascript",
    "typescript",
    "go",
    "rust",
    "java",
    "sql",
    "yaml",
    "json",
    "html",
    "css",
    "dockerfile",
];

export default function SnippetPage() {
    const [list, setList] = useState<Snippet[]>([]);
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("plaintext");
    const [content, setContent] = useState("");
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch("/api/util/snippets");
        if (res.ok) setList(await res.json());
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function add() {
        if (!content.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/util/snippets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, language, content }),
            });
            if (res.ok) {
                setTitle("");
                setContent("");
                setLanguage("plaintext");
                load();
            }
        } finally {
            setAdding(false);
        }
    }

    async function remove(id: string) {
        await fetch(`/api/util/snippets?id=${id}`, { method: "DELETE" });
        load();
    }

    function copy(id: string, c: string) {
        navigator.clipboard.writeText(c);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1200);
    }

    const filtered = search
        ? list.filter(
              (s) =>
                  s.title.toLowerCase().includes(search.toLowerCase()) ||
                  s.language.toLowerCase().includes(search.toLowerCase()) ||
                  s.content.toLowerCase().includes(search.toLowerCase()),
          )
        : list;

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">코드 스니펫</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="rounded border border-zinc-800 p-5 space-y-3">
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        placeholder="제목"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <select
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        {LANGS.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
                <textarea
                    className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                    placeholder="코드 내용..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-end">
                    <button
                        onClick={add}
                        disabled={adding || !content.trim()}
                        className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-40 transition-colors"
                    >
                        저장
                    </button>
                </div>
            </div>

            <input
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                placeholder="검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {filtered.length === 0 && (
                <p className="text-sm text-zinc-500">
                    저장된 스니펫이 없습니다.
                </p>
            )}

            <div className="space-y-4">
                {filtered.map((s) => (
                    <div key={s.id} className="rounded border border-zinc-800">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-zinc-200 font-medium">
                                    {s.title}
                                </p>
                                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                    {s.language}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => copy(s.id, s.content)}
                                    className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                >
                                    {copiedId === s.id ? "복사됨!" : "복사"}
                                </button>
                                <button
                                    onClick={() => remove(s.id)}
                                    className="text-xs px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-300 transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                        <pre className="text-sm font-mono text-zinc-300 p-5 whitespace-pre-wrap break-all overflow-auto max-h-64">
                            {s.content}
                        </pre>
                    </div>
                ))}
            </div>
        </main>
    );
}
