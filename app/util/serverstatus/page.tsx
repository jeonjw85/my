"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Status = {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    processUptime: number;
    cpu: { model: string; cores: number; usage: number };
    memory: { total: string; used: string; free: string; pct: number };
    uploads: {
        public: { count: number; size: string };
        my: { count: number; size: string };
    };
};

function formatUptime(s: number) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}일 ${h}시간 ${m}분`;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
}

function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="border border-zinc-800 rounded px-5 py-4 space-y-2">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                {title}
            </p>
            {children}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-zinc-400">{label}</span>
            <span className="text-sm font-mono text-zinc-200">{value}</span>
        </div>
    );
}

function Bar({ pct }: { pct: number }) {
    return (
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
            <div
                className={`h-1.5 rounded-full transition-all duration-500 ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-zinc-400"}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export default function ServerStatusPage() {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdate, setLastUpdate] = useState("");

    const fetchStatus = useCallback(async () => {
        const res = await fetch("/api/util/serverstatus");
        if (!res.ok) {
            setError("접근 권한이 없거나 오류가 발생했습니다.");
            setLoading(false);
            return;
        }
        const data = await res.json();
        setStatus(data);
        setLoading(false);
        setError("");
        setLastUpdate(new Date().toLocaleTimeString("ko-KR"));
    }, []);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, 10000);
        return () => clearInterval(id);
    }, [fetchStatus]);

    return (
        <main className="max-w-3xl mx-auto px-8 py-14 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">서버 상태</h1>
                    {lastUpdate && (
                        <p className="text-xs text-zinc-600 mt-0.5">
                            마지막 업데이트: {lastUpdate}
                        </p>
                    )}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchStatus}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        새로고침
                    </button>
                    <Link
                        href="/util"
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        유틸
                    </Link>
                </div>
            </div>

            {loading && <p className="text-zinc-500 text-sm">로딩 중...</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            {status && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="시스템">
                        <Stat label="호스트명" value={status.hostname} />
                        <Stat
                            label="플랫폼"
                            value={`${status.platform} (${status.arch})`}
                        />
                        <Stat label="Node.js" value={status.nodeVersion} />
                        <Stat
                            label="OS 업타임"
                            value={formatUptime(status.uptime)}
                        />
                        <Stat
                            label="프로세스 업타임"
                            value={formatUptime(status.processUptime)}
                        />
                    </Card>

                    <Card title="CPU">
                        <Stat
                            label="모델"
                            value={status.cpu.model.slice(0, 30)}
                        />
                        <Stat label="코어" value={`${status.cpu.cores}개`} />
                        <Stat label="사용률" value={`${status.cpu.usage}%`} />
                        <Bar pct={status.cpu.usage} />
                    </Card>

                    <Card title="메모리">
                        <Stat label="전체" value={status.memory.total} />
                        <Stat
                            label="사용 중"
                            value={`${status.memory.used} (${status.memory.pct}%)`}
                        />
                        <Stat label="여유" value={status.memory.free} />
                        <Bar pct={status.memory.pct} />
                    </Card>

                    <Card title="파일 저장소">
                        <Stat
                            label="공개 업로드"
                            value={`${status.uploads.public.count}개 · ${status.uploads.public.size}`}
                        />
                        <Stat
                            label="내 저장소"
                            value={`${status.uploads.my.count}개 · ${status.uploads.my.size}`}
                        />
                    </Card>
                </div>
            )}
        </main>
    );
}
