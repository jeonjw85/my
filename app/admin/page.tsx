"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    FileLedger,
    type AdminFile,
    type FileFilter,
} from "./_components/FileLedger";
import { TeamCodeLedger } from "./_components/TeamCodeLedger";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isAdminFile(value: unknown): value is AdminFile {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.originalName === "string" &&
        typeof value.mimeType === "string" &&
        typeof value.size === "number" &&
        typeof value.expiresAt === "string" &&
        typeof value.downloadCount === "number" &&
        (typeof value.maxDownloads === "number" ||
            value.maxDownloads === null) &&
        (typeof value.shareCode === "string" || value.shareCode === null) &&
        typeof value.oneTime === "boolean" &&
        typeof value.createdAt === "string"
    );
}

function parseAdminFiles(value: unknown): readonly AdminFile[] | null {
    if (!Array.isArray(value)) return null;

    const files: AdminFile[] = [];
    for (const item of value) {
        if (!isAdminFile(item)) return null;
        files.push(item);
    }
    return files;
}

function parseDeleteSuccess(value: unknown): true | null { return isRecord(value) && value.ok === true ? true : null; }

function parseDeletedCount(value: unknown): number | null {
    const deleted = isRecord(value) ? value.deleted : null;
    if (typeof deleted !== "number") return null;
    return Number.isInteger(deleted) && deleted >= 0 ? deleted : null;
}

function parseExpiresAt(value: unknown): string | null {
    const expiresAt = isRecord(value) ? value.expiresAt : null;
    if (typeof expiresAt !== "string" || expiresAt.trim().length === 0) return null;
    return Number.isNaN(Date.parse(expiresAt)) ? null : expiresAt;
}

function isRequestFailure(error: unknown): boolean { return error instanceof TypeError || error instanceof SyntaxError; }

async function fetchMutationResult<T>(
    url: string, init: RequestInit, parse: (value: unknown) => T | null,
): Promise<T | null> {
    try {
        const response = await fetch(url, init);
        if (!response.ok) return null;

        const data: unknown = await response.json();
        return parse(data);
    } catch (error) {
        if (isRequestFailure(error)) return null;
        throw error;
    }
}

export default function AdminPage() {
    const router = useRouter();
    const [files, setFiles] = useState<readonly AdminFile[]>([]);
    const [filter, setFilter] = useState<FileFilter>("all");
    const [codeFilter, setCodeFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [cleaning, setCleaning] = useState(false);
    const [cleanResult, setCleanResult] = useState<number | null>(null);
    const [extending, setExtending] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const mutationPending = cleaning || extending !== null || deletingId !== null;

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        const params = new URLSearchParams({ type: filter });
        if (codeFilter.trim()) params.set("code", codeFilter.trim());

        try {
            const response = await fetch(`/api/admin/files?${params}`);
            if (response.status === 401) {
                router.push("/admin/login");
                return;
            }
            if (!response.ok) {
                setLoadError("파일 목록을 불러오지 못했습니다.");
                return;
            }

            const data: unknown = await response.json();
            const nextFiles = parseAdminFiles(data);
            if (nextFiles === null) {
                setLoadError("파일 목록을 불러오지 못했습니다.");
                return;
            }
            setFiles(nextFiles);
        } catch (error) {
            if (isRequestFailure(error)) {
                setLoadError("파일 목록을 불러오지 못했습니다.");
                return;
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, [filter, codeFilter, router]);

    useEffect(() => {
        void fetchFiles();
    }, [fetchFiles]);

    const handleDelete = async (id: string) => {
        if (mutationPending) return;

        setDeletingId(id);
        setActionError("");
        setCleanResult(null);
        try {
            const deleted = await fetchMutationResult(
                `/api/files/${id}`,
                { method: "DELETE" },
                parseDeleteSuccess,
            );
            if (deleted === null) {
                setActionError("파일을 삭제하지 못했습니다.");
                return;
            }
            setFiles((previous) => previous.filter((file) => file.id !== id));
        } finally {
            setDeletingId(null);
        }
    };

    const handleCleanup = async () => {
        if (mutationPending) return;

        setCleaning(true);
        setActionError("");
        setCleanResult(null);
        try {
            const deleted = await fetchMutationResult(
                "/api/admin/cleanup",
                { method: "POST" },
                parseDeletedCount,
            );
            if (deleted === null) {
                setActionError("만료 파일을 정리하지 못했습니다.");
                return;
            }
            setCleanResult(deleted);
            await fetchFiles();
        } finally {
            setCleaning(false);
        }
    };

    const handleExtend = async (id: string, days = 7) => {
        if (mutationPending) return;

        setExtending(id);
        setActionError("");
        setCleanResult(null);
        try {
            const expiresAt = await fetchMutationResult(
                `/api/files/${id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days }),
                },
                parseExpiresAt,
            );
            if (expiresAt === null) {
                setActionError("파일 만료일을 연장하지 못했습니다.");
                return;
            }
            setFiles((previous) =>
                previous.map((file) =>
                    file.id === id ? { ...file, expiresAt } : file,
                ),
            );
        } finally {
            setExtending(null);
        }
    };

    const handleLogout = () => signOut({ callbackUrl: "/" });

    return (
        <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
            <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-zinc-100">
                        관리
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">
                        공유 코드와 파일 상태를 관리합니다.
                    </p>
                </div>
                <nav
                    aria-label="관리 링크"
                    className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
                >
                    <Link
                        href="/my"
                        className="text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                        내 저장소
                    </Link>
                    <Link
                        href="/admin/logs"
                        className="text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                        로그
                    </Link>
                    <Link
                        href="/"
                        className="text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                        홈
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                        로그아웃
                    </button>
                </nav>
            </header>

            <div className="space-y-6 sm:space-y-10">
                <TeamCodeLedger />
                <FileLedger
                    files={files}
                    filter={filter}
                    codeFilter={codeFilter}
                    loading={loading}
                    loadError={loadError}
                    actionError={actionError}
                    cleaning={cleaning}
                    cleanResult={cleanResult}
                    extendingId={extending}
                    deletingId={deletingId}
                    onFilterChange={setFilter}
                    onCodeFilterChange={(value) =>
                        setCodeFilter(value.toUpperCase())
                    }
                    onCleanup={handleCleanup}
                    onExtend={(id) => handleExtend(id, 7)}
                    onDelete={handleDelete}
                />
            </div>
        </main>
    );
}
