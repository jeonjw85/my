"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Endpoint {
    id: string;
    slug: string;
    label: string;
    createdAt: string;
    _count: { requests: number };
}

interface WebhookRequest {
    id: string;
    method: string;
    headers: string;
    body: string;
    ip: string;
    createdAt: string;
}

export default function WebhookPage() {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [label, setLabel] = useState("");
    const [selected, setSelected] = useState<Endpoint | null>(null);
    const [requests, setRequests] = useState<WebhookRequest[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadEndpoints = useCallback(async () => {
        const res = await fetch("/api/util/webhook");
        if (res.ok) setEndpoints(await res.json());
    }, []);

    const loadRequests = useCallback(async (ep: Endpoint) => {
        const res = await fetch(`/api/util/webhook/${ep.id}`);
        if (res.ok) setRequests(await res.json());
    }, []);

    useEffect(() => {
        loadEndpoints();
    }, [loadEndpoints]);

    async function create() {
        const res = await fetch("/api/util/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label }),
        });
        if (res.ok) {
            setLabel("");
            loadEndpoints();
        }
    }

    async function deleteEndpoint(id: string) {
        await fetch(`/api/util/webhook?id=${id}`, { method: "DELETE" });
        if (selected?.id === id) setSelected(null);
        loadEndpoints();
    }

    async function clearRequests(id: string) {
        await fetch(`/api/util/webhook/${id}`, { method: "DELETE" });
        setRequests([]);
    }

    function selectEp(ep: Endpoint) {
        setSelected(ep);
        loadRequests(ep);
        setExpandedId(null);
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">웹훅 수신기</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div className="flex gap-2">
                <input
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-zinc-500"
                    placeholder="엔드포인트 이름 (선택)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && create()}
                />
                <button
                    onClick={create}
                    className="px-5 py-3 rounded bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors whitespace-nowrap"
                >
                    + 새 엔드포인트
                </button>
            </div>

            {endpoints.length === 0 && (
                <p className="text-sm text-zinc-500">엔드포인트가 없습니다.</p>
            )}

            <div className="space-y-2">
                {endpoints.map((ep) => (
                    <div
                        key={ep.id}
                        className={`rounded border p-4 cursor-pointer transition-colors ${
                            selected?.id === ep.id
                                ? "border-zinc-500"
                                : "border-zinc-800 hover:border-zinc-600"
                        }`}
                        onClick={() => selectEp(ep)}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-200 font-medium">
                                    {ep.label || "이름 없음"}
                                </p>
                                <p className="text-xs font-mono text-zinc-500 mt-0.5 break-all">
                                    {origin}/api/webhook/{ep.slug}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                <span className="text-xs text-zinc-500">
                                    {ep._count.requests}건
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(
                                            `${origin}/api/webhook/${ep.slug}`,
                                        );
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                                >
                                    URL 복사
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteEndpoint(ep.id);
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-red-300 transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">
                            수신 요청 — {requests.length}건
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => loadRequests(selected)}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                새로고침
                            </button>
                            <button
                                onClick={() => clearRequests(selected.id)}
                                className="text-xs px-3 py-1.5 rounded bg-red-900 hover:bg-red-800 text-red-300 transition-colors"
                            >
                                전체 삭제
                            </button>
                        </div>
                    </div>

                    {requests.length === 0 && (
                        <p className="text-sm text-zinc-500">
                            수신된 요청이 없습니다.
                        </p>
                    )}

                    {requests.map((r) => (
                        <div
                            key={r.id}
                            className="rounded border border-zinc-800"
                        >
                            <button
                                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-zinc-900 transition-colors"
                                onClick={() =>
                                    setExpandedId(
                                        expandedId === r.id ? null : r.id,
                                    )
                                }
                            >
                                <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                    {r.method}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">
                                    {r.ip}
                                </span>
                                <span className="text-xs text-zinc-600 ml-auto">
                                    {new Date(r.createdAt).toLocaleString()}
                                </span>
                            </button>
                            {expandedId === r.id && (
                                <div className="border-t border-zinc-800 p-5 space-y-4">
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                                            Headers
                                        </p>
                                        <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-all">
                                            {JSON.stringify(
                                                JSON.parse(r.headers),
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                    {r.body && (
                                        <div>
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                                                Body
                                            </p>
                                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap break-all">
                                                {r.body}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
