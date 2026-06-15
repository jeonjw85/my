"use client";

import { useState, useEffect } from "react";

type Env = { id: string; name: string; content: string; updatedAt: string };

export default function EnvStorePage() {
    const [envs, setEnvs] = useState<Env[]>([]);
    const [newName, setNewName] = useState("");
    const [newContent, setNewContent] = useState("");
    const [editing, setEditing] = useState<Env | null>(null);
    const [editContent, setEditContent] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    async function load() {
        const res = await fetch("/api/util/envstore");
        if (res.ok) setEnvs(await res.json());
    }
    useEffect(() => {
        load();
    }, []);

    async function create() {
        if (!newName.trim()) {
            setError("이름을 입력하세요.");
            return;
        }
        setError("");
        const res = await fetch("/api/util/envstore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, content: newContent }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error);
            return;
        }
        setNewName("");
        setNewContent("");
        load();
    }

    async function save() {
        if (!editing) return;
        await fetch("/api/util/envstore", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editing.id,
                name: editing.name,
                content: editContent,
            }),
        });
        setEditing(null);
        load();
    }

    async function del(id: string) {
        await fetch("/api/util/envstore", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        load();
    }

    function copy(id: string, content: string) {
        navigator.clipboard.writeText(content);
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
    }

    function startEdit(env: Env) {
        setEditing(env);
        setEditContent(env.content);
    }

    // Count non-empty, non-comment lines as KEY=VALUE pairs
    function countVars(content: string) {
        return content
            .split("\n")
            .filter(
                (l) => l.trim() && !l.trim().startsWith("#") && l.includes("="),
            ).length;
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">환경변수 저장소</h1>
            <p className="text-sm text-zinc-500">
                `.env` 파일을 이름 붙여 저장하고 복사하세요.
            </p>

            {/* Create */}
            <div className="rounded border border-zinc-800 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-zinc-300">
                    새 환경변수 세트 추가
                </h2>
                <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                    placeholder="이름 (예: Production, Staging)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <textarea
                    className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                    placeholder={
                        "DATABASE_URL=postgresql://...\nAPI_KEY=sk-...\nSECRET=..."
                    }
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={create}
                    className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                >
                    저장
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {envs.map((env) => (
                    <div
                        key={env.id}
                        className="rounded border border-zinc-800"
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                            <div>
                                <span className="font-semibold text-zinc-200 text-sm">
                                    {env.name}
                                </span>
                                <span className="ml-3 text-xs text-zinc-500">
                                    {countVars(env.content)}개 변수
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => copy(env.id, env.content)}
                                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    {copied === env.id
                                        ? "✓ 복사됨"
                                        : ".env 복사"}
                                </button>
                                <button
                                    onClick={() => startEdit(env)}
                                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    편집
                                </button>
                                <button
                                    onClick={() => del(env.id)}
                                    className="text-xs px-3 py-1.5 rounded bg-zinc-900 hover:bg-red-900 text-zinc-500 hover:text-red-300 transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                        {editing?.id === env.id ? (
                            <div className="p-4 space-y-3">
                                <textarea
                                    className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                                    value={editContent}
                                    onChange={(e) =>
                                        setEditContent(e.target.value)
                                    }
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={save}
                                        className="px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                    >
                                        저장
                                    </button>
                                    <button
                                        onClick={() => setEditing(null)}
                                        className="px-4 py-2 text-sm rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors"
                                    >
                                        취소
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <pre className="px-5 py-3 text-xs font-mono text-zinc-500 overflow-auto max-h-32 whitespace-pre-wrap">
                                {env.content || "(비어있음)"}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}
