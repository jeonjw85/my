"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Cmd {
    id: string;
    label: string;
    command: string;
    tags: string;
    createdAt: string;
}

export default function CommandsPage() {
    const [list, setList] = useState<Cmd[]>([]);
    const [label, setLabel] = useState("");
    const [command, setCommand] = useState("");
    const [tags, setTags] = useState("");
    const [search, setSearch] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch("/api/util/commands");
        if (res.ok) setList(await res.json());
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function add() {
        if (!label.trim() || !command.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/util/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, command, tags }),
            });
            if (res.ok) {
                setLabel("");
                setCommand("");
                setTags("");
                load();
            }
        } finally {
            setAdding(false);
        }
    }

    async function remove(id: string) {
        await fetch(`/api/util/commands?id=${id}`, { method: "DELETE" });
        load();
    }

    function copy(id: string, cmd: string) {
        navigator.clipboard.writeText(cmd);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1200);
    }

    const filtered = search
        ? list.filter(
              (c) =>
                  c.label.toLowerCase().includes(search.toLowerCase()) ||
                  c.command.toLowerCase().includes(search.toLowerCase()) ||
                  c.tags.toLowerCase().includes(search.toLowerCase()),
          )
        : list;

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">명령어 북마크</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="rounded border border-zinc-800 p-5 space-y-3">
                <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                    placeholder="이름 (예: k8s pod 재시작)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <textarea
                    className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                    placeholder="명령어"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                />
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        placeholder="태그 (예: k8s docker)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                    <button
                        onClick={add}
                        disabled={adding || !label.trim() || !command.trim()}
                        className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                        추가
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
                    저장된 명령어가 없습니다.
                </p>
            )}

            <div className="space-y-3">
                {filtered.map((c) => (
                    <div
                        key={c.id}
                        className="rounded border border-zinc-800 p-4 space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-200 font-medium">
                                {c.label}
                            </p>
                            <div className="flex items-center gap-2">
                                {c.tags && (
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800">
                                        {c.tags}
                                    </span>
                                )}
                                <button
                                    onClick={() => copy(c.id, c.command)}
                                    className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                >
                                    {copiedId === c.id ? "복사됨!" : "복사"}
                                </button>
                                <button
                                    onClick={() => remove(c.id)}
                                    className="text-xs px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-300 transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                        <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all bg-zinc-950 rounded px-3 py-2">
                            {c.command}
                        </pre>
                    </div>
                ))}
            </div>
        </main>
    );
}
