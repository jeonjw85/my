"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type PasteData = {
    id: string;
    title: string;
    language: string;
    content: string;
    viewCount: number;
    createdAt: string;
    expiresAt: string | null;
    protected?: boolean;
    error?: string;
};

export default function PasteViewPage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<PasteData | null>(null);
    const [pw, setPw] = useState("");
    const [pwInput, setPwInput] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [needPw, setNeedPw] = useState(false);

    async function load(password?: string) {
        const url = `/api/paste/${id}${password ? `?pw=${encodeURIComponent(password)}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.protected && !json.error) {
            setNeedPw(true);
            return;
        }
        if (!res.ok) {
            setError(json.error ?? "오류가 발생했습니다.");
            return;
        }
        setData(json);
        setNeedPw(false);
        setError("");
    }

    useEffect(() => {
        load();
    }, [id]);

    function submitPw() {
        load(pwInput);
    }

    function copy() {
        if (!data) return;
        navigator.clipboard.writeText(data.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    if (error)
        return (
            <main className="max-w-3xl mx-auto px-8 py-16">
                <p className="text-red-400">{error}</p>
            </main>
        );

    if (needPw)
        return (
            <main className="max-w-sm mx-auto px-8 py-16 space-y-6">
                <h1 className="text-xl font-bold">비밀번호 보호 Paste</h1>
                <div className="space-y-3">
                    <input
                        type="password"
                        autoFocus
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-zinc-500"
                        placeholder="비밀번호 입력"
                        value={pwInput}
                        onChange={(e) => setPwInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitPw()}
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                        onClick={submitPw}
                        className="w-full py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                    >
                        확인
                    </button>
                </div>
            </main>
        );

    if (!data)
        return (
            <main className="max-w-3xl mx-auto px-8 py-16">
                <p className="text-zinc-500 text-sm">불러오는 중...</p>
            </main>
        );

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold">
                        {data.title || "제목 없음"}
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">
                        {data.language} · {data.viewCount}회 조회 ·{" "}
                        {new Date(data.createdAt).toLocaleString("ko-KR")}
                        {data.expiresAt &&
                            ` · 만료: ${new Date(data.expiresAt).toLocaleString("ko-KR")}`}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={copy}
                        className="text-sm px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        {copied ? "복사됨!" : "복사"}
                    </button>
                    <a
                        href="/paste"
                        className="text-sm px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        새 Paste
                    </a>
                </div>
            </div>
            <pre className="bg-zinc-900 border border-zinc-800 rounded p-5 text-sm font-mono overflow-auto max-h-[60vh] text-zinc-200 whitespace-pre-wrap break-all">
                {data.content}
            </pre>
        </main>
    );
}
