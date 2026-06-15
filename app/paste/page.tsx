"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LANGUAGES = [
    "plaintext",
    "javascript",
    "typescript",
    "python",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "csharp",
    "html",
    "css",
    "json",
    "yaml",
    "toml",
    "markdown",
    "sql",
    "bash",
    "dockerfile",
];
const EXPIRE_OPTIONS = [
    { value: "", label: "만료 없음" },
    { value: "1h", label: "1시간" },
    { value: "24h", label: "24시간" },
    { value: "7d", label: "7일" },
    { value: "30d", label: "30일" },
];

export default function PastePage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("plaintext");
    const [content, setContent] = useState("");
    const [password, setPassword] = useState("");
    const [expiresIn, setExpiresIn] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        if (!content.trim()) {
            setError("내용을 입력하세요.");
            return;
        }
        setSubmitting(true);
        setError("");
        const res = await fetch("/api/paste", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                language,
                content,
                password: password || undefined,
                expiresIn: expiresIn || undefined,
            }),
        });
        const data = await res.json();
        setSubmitting(false);
        if (!res.ok) {
            setError(data.error);
            return;
        }
        router.push(`/paste/${data.id}`);
    }

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">Pastebin</h1>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        제목 (선택)
                    </label>
                    <input
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        placeholder="제목 없음"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        언어
                    </label>
                    <select
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        비밀번호 (선택)
                    </label>
                    <input
                        type="password"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        placeholder="설정 시 열람 시 입력 필요"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        만료
                    </label>
                    <select
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value)}
                    >
                        {EXPIRE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <textarea
                className="w-full h-80 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                placeholder="코드 또는 텍스트를 입력하세요..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors disabled:opacity-40"
            >
                {submitting ? "저장 중..." : "저장 및 공유"}
            </button>
        </main>
    );
}
