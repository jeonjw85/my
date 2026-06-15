"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type LogEntry = {
    id: string;
    type: string;
    label: string;
    ip: string;
    createdAt: string;
};

const TYPE_META: Record<string, { label: string; color: string }> = {
    dl_public: { label: "공개 다운로드", color: "text-sky-400" },
    dl_my: { label: "내 파일 다운로드", color: "text-violet-400" },
    upload_public: { label: "공개 업로드", color: "text-emerald-400" },
    upload_team: { label: "팀 업로드", color: "text-amber-400" },
    code_lookup: { label: "코드 조회", color: "text-zinc-400" },
};

function formatDate(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [filter, setFilter] = useState<string>("all");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/logs");
        if (res.ok) setLogs(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleClear = async () => {
        if (!confirm("로그를 전부 삭제하시겠습니까?")) return;
        setClearing(true);
        await fetch("/api/admin/logs", { method: "DELETE" });
        setLogs([]);
        setClearing(false);
    };

    const filtered =
        filter === "all" ? logs : logs.filter((l) => l.type === filter);

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">접속 로그</h1>
                <div className="flex gap-5 text-base text-zinc-400">
                    <button
                        onClick={handleClear}
                        disabled={clearing || logs.length === 0}
                        className="text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                    >
                        전체 삭제
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="hover:text-zinc-100 transition-colors"
                    >
                        새로고침
                    </button>
                    <Link
                        href="/admin"
                        className="hover:text-zinc-100 transition-colors"
                    >
                        관리
                    </Link>
                </div>
            </div>

            {/* 필터 */}
            <div className="flex gap-2 flex-wrap">
                {["all", ...Object.keys(TYPE_META)].map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            filter === t
                                ? "border-zinc-400 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                        }`}
                    >
                        {t === "all" ? "전체" : (TYPE_META[t]?.label ?? t)}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-zinc-500 text-sm">로딩 중...</p>
            ) : filtered.length === 0 ? (
                <p className="text-zinc-600 text-sm">로그 없음</p>
            ) : (
                <div className="space-y-px">
                    {filtered.map((log) => {
                        const meta = TYPE_META[log.type];
                        return (
                            <div
                                key={log.id}
                                className="flex items-center gap-4 px-4 py-3 rounded border border-zinc-800 text-sm"
                            >
                                <span
                                    className={`shrink-0 w-28 text-xs ${meta?.color ?? "text-zinc-400"}`}
                                >
                                    {meta?.label ?? log.type}
                                </span>
                                <span className="flex-1 text-zinc-200 truncate">
                                    {log.label}
                                </span>
                                <span className="shrink-0 text-zinc-600 font-mono text-xs">
                                    {log.ip}
                                </span>
                                <span className="shrink-0 text-zinc-500 text-xs">
                                    {formatDate(log.createdAt)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <p className="text-xs text-zinc-600">
                    {filtered.length}개 (최근 200개)
                </p>
            )}
        </main>
    );
}
