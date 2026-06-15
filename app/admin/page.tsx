"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";

type FileRecord = {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    expiresAt: string;
    downloadCount: number;
    maxDownloads: number | null;
    shareCode: string | null;
    oneTime: boolean;
    createdAt: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isExpired(expiresAt: string) {
    return new Date() > new Date(expiresAt);
}

export default function AdminPage() {
    const router = useRouter();
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [filter, setFilter] = useState<"all" | "public" | "shared">("all");
    const [codeFilter, setCodeFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);
    const [cleanResult, setCleanResult] = useState<number | null>(null);
    const [shareCodes, setShareCodes] = useState<
        { id: string; code: string; createdAt: string }[]
    >([]);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [generatingCode, setGeneratingCode] = useState(false);

    const fetchCodes = useCallback(async () => {
        const res = await fetch("/api/admin/codes");
        if (res.ok) setShareCodes(await res.json());
    }, []);

    const generateCode = async () => {
        setGeneratingCode(true);
        const res = await fetch("/api/admin/codes", { method: "POST" });
        if (res.ok) {
            const record = await res.json();
            setShareCodes((prev) => [record, ...prev]);
        }
        setGeneratingCode(false);
    };

    const deleteCode = async (code: string) => {
        await fetch(`/api/admin/codes?code=${code}`, { method: "DELETE" });
        setShareCodes((prev) => prev.filter((c) => c.code !== code));
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ type: filter });
        if (codeFilter.trim()) params.set("code", codeFilter.trim());

        const res = await fetch(`/api/admin/files?${params}`);
        if (res.status === 401) {
            router.push("/admin/login");
            return;
        }
        const data = await res.json();
        setFiles(data);
        setLoading(false);
    }, [filter, codeFilter, router]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleDelete = async (id: string) => {
        await fetch(`/api/files/${id}`, { method: "DELETE" });
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleCleanup = async () => {
        setCleaning(true);
        setCleanResult(null);
        const res = await fetch("/api/admin/cleanup", { method: "POST" });
        const data = await res.json();
        setCleanResult(data.deleted);
        setCleaning(false);
        fetchFiles();
    };

    const [extending, setExtending] = useState<string | null>(null);

    const handleExtend = async (id: string, days = 7) => {
        setExtending(id);
        const res = await fetch(`/api/files/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days }),
        });
        if (res.ok) {
            const { expiresAt } = await res.json();
            setFiles((prev) =>
                prev.map((f) => (f.id === id ? { ...f, expiresAt } : f)),
            );
        }
        setExtending(null);
    };

    const handleLogout = () => signOut({ callbackUrl: "/" });

    const groups = files.reduce<Record<string, FileRecord[]>>((acc, f) => {
        const key = f.shareCode ?? "__public__";
        if (!acc[key]) acc[key] = [];
        acc[key].push(f);
        return acc;
    }, {});

    return (
        <main className="max-w-5xl mx-auto px-8 py-14 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">관리</h1>
                <div className="flex gap-4 text-base">
                    <Link
                        href="/my"
                        className="text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        내 저장소
                    </Link>
                    <Link
                        href="/admin/logs"
                        className="text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        로그
                    </Link>
                    <Link
                        href="/"
                        className="text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        홈
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        로그아웃
                    </button>
                </div>
            </div>

            <div className="border border-zinc-800 rounded px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">팀 공유 코드</p>
                    <button
                        onClick={generateCode}
                        disabled={generatingCode}
                        className="px-4 py-1.5 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                    >
                        {generatingCode ? "생성 중..." : "코드 생성"}
                    </button>
                </div>
                {shareCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {shareCodes.map(({ code }) => (
                            <div key={code} className="flex items-center gap-1">
                                <button
                                    onClick={() => copyCode(code)}
                                    className="px-3 py-1.5 text-sm font-mono rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
                                >
                                    {copiedCode === code ? "복사됨" : code}
                                </button>
                                <button
                                    onClick={() => deleteCode(code)}
                                    className="px-2 py-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors"
                                    title="삭제"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                {(["all", "public", "shared"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                            filter === t
                                ? "border-zinc-300 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                        }`}
                    >
                        {t === "all"
                            ? "전체"
                            : t === "public"
                              ? "공개"
                              : "팀 공유"}
                    </button>
                ))}
                <input
                    type="text"
                    placeholder="코드 필터"
                    value={codeFilter}
                    onChange={(e) =>
                        setCodeFilter(e.target.value.toUpperCase())
                    }
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-32"
                />
                <button
                    onClick={handleCleanup}
                    disabled={cleaning}
                    className="px-4 py-1.5 text-sm rounded border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors ml-auto"
                >
                    {cleaning ? "정리 중..." : "만료 파일 정리"}
                </button>
                {cleanResult !== null && (
                    <span className="text-sm text-zinc-500">
                        {cleanResult}개 삭제됨
                    </span>
                )}
            </div>

            {loading ? (
                <p className="text-zinc-500 text-sm">로딩 중...</p>
            ) : files.length === 0 ? (
                <p className="text-zinc-500 text-sm">파일 없음</p>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groups).map(([key, groupFiles]) => (
                        <div key={key} className="space-y-2">
                            <p className="text-sm text-zinc-500 font-medium">
                                {key === "__public__"
                                    ? "공개 업로드"
                                    : `코드: ${key}`}
                            </p>
                            <div className="space-y-1.5">
                                {groupFiles.map((f) => (
                                    <div
                                        key={f.id}
                                        className={`flex items-center gap-4 border rounded px-4 py-3 text-sm ${
                                            isExpired(f.expiresAt)
                                                ? "border-zinc-800 text-zinc-600"
                                                : "border-zinc-800 text-zinc-300"
                                        }`}
                                    >
                                        <span className="flex-1 truncate">
                                            {f.originalName}
                                        </span>
                                        <span className="text-zinc-500 shrink-0">
                                            {formatBytes(f.size)}
                                        </span>
                                        <span className="text-zinc-500 shrink-0">
                                            {f.downloadCount}
                                            {f.maxDownloads
                                                ? `/${f.maxDownloads}`
                                                : ""}{" "}
                                            DL
                                        </span>
                                        <span className="text-zinc-600 shrink-0">
                                            {isExpired(f.expiresAt)
                                                ? "만료"
                                                : new Date(
                                                      f.expiresAt,
                                                  ).toLocaleDateString("ko-KR")}
                                        </span>
                                        <button
                                            onClick={() =>
                                                handleExtend(f.id, 7)
                                            }
                                            disabled={extending === f.id}
                                            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 disabled:opacity-40"
                                            title="+7일 연장"
                                        >
                                            {extending === f.id
                                                ? "..."
                                                : "+7일"}
                                        </button>
                                        {!isExpired(f.expiresAt) && (
                                            <a
                                                href={`/api/files/${f.id}`}
                                                className="text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
                                            >
                                                받기
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            className="text-red-500 hover:text-red-400 transition-colors shrink-0"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
