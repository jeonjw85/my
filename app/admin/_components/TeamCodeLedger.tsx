"use client";

import { useCallback, useEffect, useState } from "react";

type TeamCode = { readonly id: string; readonly code: string; readonly createdAt: string };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

function isTeamCode(value: unknown): value is TeamCode {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.code === "string" &&
        typeof value.createdAt === "string"
    );
}

function parseTeamCodes(value: unknown): readonly TeamCode[] | null {
    if (!Array.isArray(value)) return null;

    const codes: TeamCode[] = [];
    for (const item of value) {
        if (!isTeamCode(item)) return null;
        codes.push(item);
    }
    return codes;
}

function isDeleteSuccess(value: unknown): boolean { return isRecord(value) && value.ok === true; }

function isRequestFailure(error: unknown): boolean { return error instanceof TypeError || error instanceof SyntaxError; }

export function TeamCodeLedger() {
    const [codes, setCodes] = useState<readonly TeamCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingCode, setDeletingCode] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [createdCode, setCreatedCode] = useState<string | null>(null);

    const loadCodes = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const response = await fetch("/api/admin/codes");
            if (!response.ok) {
                setLoadError("팀 공유 코드를 불러오지 못했습니다.");
                return;
            }

            const data: unknown = await response.json();
            const nextCodes = parseTeamCodes(data);
            if (nextCodes === null) {
                setLoadError("팀 공유 코드를 불러오지 못했습니다.");
                return;
            }
            setCodes(nextCodes);
        } catch (error) {
            if (isRequestFailure(error)) {
                setLoadError("팀 공유 코드를 불러오지 못했습니다.");
                return;
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadCodes(); }, [loadCodes]);

    const createCode = async () => {
        setCreating(true);
        setActionError("");
        setCreatedCode(null);
        try {
            const response = await fetch("/api/admin/codes", { method: "POST" });
            if (!response.ok) {
                setActionError("팀 공유 코드를 생성하지 못했습니다.");
                return;
            }

            const data: unknown = await response.json();
            if (!isTeamCode(data)) {
                setActionError("팀 공유 코드를 생성하지 못했습니다.");
                return;
            }
            setCodes((previous) => [data, ...previous]);
            setCreatedCode(data.code);
        } catch (error) {
            if (isRequestFailure(error)) {
                setActionError("팀 공유 코드를 생성하지 못했습니다.");
                return;
            }
            throw error;
        } finally {
            setCreating(false);
        }
    };

    const deleteCode = async (code: string) => {
        setDeletingCode(code);
        setActionError("");
        setCreatedCode(null);
        try {
            const response = await fetch(
                `/api/admin/codes?code=${encodeURIComponent(code)}`,
                { method: "DELETE" },
            );
            if (!response.ok) {
                setActionError("팀 공유 코드를 삭제하지 못했습니다.");
                return;
            }

            const data: unknown = await response.json();
            if (!isDeleteSuccess(data)) {
                setActionError("팀 공유 코드를 삭제하지 못했습니다.");
                return;
            }
            setCodes((previous) => previous.filter((item) => item.code !== code));
            setCopiedCode((current) => (current === code ? null : current));
        } catch (error) {
            if (isRequestFailure(error)) {
                setActionError("팀 공유 코드를 삭제하지 못했습니다.");
                return;
            }
            throw error;
        } finally {
            setDeletingCode(null);
        }
    };

    const copyCode = async (code: string) => {
        setActionError("");
        if (!navigator.clipboard) {
            setActionError("코드를 복사하지 못했습니다.");
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            window.setTimeout(() => {
                setCopiedCode((current) => (current === code ? null : current));
            }, 2000);
        } catch (error) {
            if (error instanceof DOMException || error instanceof TypeError) {
                setActionError("코드를 복사하지 못했습니다.");
                return;
            }
            throw error;
        }
    };

    return (
        <section
            aria-labelledby="team-code-heading"
            className="border-t border-zinc-800 pt-6 sm:pt-10"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2
                        id="team-code-heading"
                        className="text-lg font-bold tracking-tight text-zinc-100"
                    >
                        팀 공유 코드
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        팀 저장소와 채널에 사용하는 코드입니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={createCode}
                    disabled={creating}
                    className="rounded-sm bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                    {creating ? "생성 중..." : "코드 생성"}
                </button>
            </div>

            <div className="mt-4 space-y-2">
                {creating && <p className="bg-zinc-900 px-3 py-2 text-xs text-zinc-400">코드 생성 중...</p>}
                {createdCode && (
                    <p
                        role="status"
                        aria-live="polite"
                        className="bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
                    >코드 {createdCode} 생성됨</p>
                )}
                {(loadError || actionError) && (
                    <p
                        role="alert"
                        className="bg-zinc-900 px-3 py-2 text-xs text-red-400"
                    >
                        {loadError || actionError}
                    </p>
                )}
            </div>

            {loading ? (
                <p className="mt-4 text-sm text-zinc-500">불러오는 중...</p>
            ) : codes.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">생성된 코드 없음</p>
            ) : (
                <div className="mt-4 overflow-hidden border-b border-zinc-800">
                    <table className="block w-full table-fixed text-sm lg:table">
                        <thead className="hidden text-left lg:table-header-group">
                            <tr>
                                <th className="px-3 py-2 text-sm font-normal text-zinc-400">코드</th>
                                <th className="w-32 px-3 py-2 text-right text-sm font-normal text-zinc-400">생성일</th>
                                <th className="w-48 px-3 py-2 text-right text-sm font-normal text-zinc-400">작업</th>
                            </tr>
                        </thead>
                        <tbody className="block lg:table-row-group">
                            {codes.map((item) => (
                                <tr
                                    key={item.id}
                                    className="block border-t border-zinc-800 transition-colors hover:bg-zinc-900 lg:table-row"
                                >
                                    <td className="flex items-center justify-between gap-4 px-3 py-2 sm:px-3 sm:py-3 lg:table-cell">
                                        <span className="shrink-0 text-sm text-zinc-400 lg:hidden">코드</span>
                                        <span className="min-w-0 break-all font-mono text-base tabular-nums text-zinc-100">
                                            {item.code}
                                        </span>
                                    </td>
                                    <td className="flex items-center justify-between gap-4 px-3 py-2 text-right tabular-nums sm:px-3 sm:py-3 lg:table-cell lg:w-32">
                                        <span className="text-sm text-zinc-400 lg:hidden">생성일</span>
                                        <span className="whitespace-nowrap text-sm text-zinc-500">
                                            {new Date(item.createdAt).toLocaleDateString(
                                                "ko-KR",
                                            )}
                                        </span>
                                    </td>
                                    <td className="block w-full px-3 py-2 sm:px-3 sm:py-3 lg:table-cell lg:w-48">
                                        <span className="text-sm text-zinc-400 lg:hidden">작업</span>
                                        <span className="mt-2 flex w-full flex-wrap gap-2 lg:mt-0 lg:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => copyCode(item.code)}
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                                            >
                                                {copiedCode === item.code
                                                    ? "복사됨"
                                                    : "복사"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteCode(item.code)}
                                                disabled={deletingCode === item.code}
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                                            >
                                                {deletingCode === item.code
                                                    ? "삭제 중..."
                                                    : "삭제"}
                                            </button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
