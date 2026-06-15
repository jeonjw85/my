"use client";

import { useState, useRef, DragEvent, useCallback, useEffect } from "react";
import Link from "next/link";

type Notice = {
    id: string;
    content: string;
    pinned: boolean;
    createdAt: string;
};

type ShareFile = {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    expiresAt: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SharePage() {
    const [codeInput, setCodeInput] = useState("");
    const [activeCode, setActiveCode] = useState("");
    const [files, setFiles] = useState<ShareFile[]>([]);
    const [loadError, setLoadError] = useState("");
    const [loading, setLoading] = useState(false);

    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState("");
    const [overwriteTarget, setOverwriteTarget] = useState<ShareFile | null>(
        null,
    );

    const inputRef = useRef<HTMLInputElement>(null);
    const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [memo, setMemo] = useState("");
    const [memoUpdatedAt, setMemoUpdatedAt] = useState<string | null>(null);
    const [memoSaving, setMemoSaving] = useState(false);

    const [notices, setNotices] = useState<Notice[]>([]);
    const [newNotice, setNewNotice] = useState("");
    const [noticePinned, setNoticePinned] = useState(false);

    const fetchFiles = useCallback(async (code: string) => {
        setLoading(true);
        setLoadError("");
        const res = await fetch(`/api/share?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) {
            setLoadError(data.error ?? "오류가 발생했습니다.");
            setFiles([]);
        } else {
            setFiles(data);
        }
        setLoading(false);
    }, []);

    const fetchMemo = useCallback(async (code: string) => {
        const res = await fetch(
            `/api/share/memo?code=${encodeURIComponent(code)}`,
        );
        if (res.ok) {
            const data = await res.json();
            setMemo(data.content ?? "");
            setMemoUpdatedAt(data.updatedAt ?? null);
        }
    }, []);

    useEffect(() => {
        if (activeCode && !loadError) fetchMemo(activeCode);
    }, [activeCode, loadError, fetchMemo]);

    const fetchNotices = useCallback(async (code: string) => {
        const res = await fetch(
            `/api/share/notice?code=${encodeURIComponent(code)}`,
        );
        if (res.ok) setNotices(await res.json());
    }, []);

    useEffect(() => {
        if (activeCode && !loadError) fetchNotices(activeCode);
    }, [activeCode, loadError, fetchNotices]);

    const postNotice = async () => {
        if (!newNotice.trim() || !activeCode) return;
        await fetch("/api/share/notice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: activeCode,
                content: newNotice,
                pinned: noticePinned,
            }),
        });
        setNewNotice("");
        setNoticePinned(false);
        fetchNotices(activeCode);
    };

    const deleteNotice = async (id: string) => {
        await fetch("/api/share/notice", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        fetchNotices(activeCode);
    };

    const handleMemoChange = (value: string) => {
        setMemo(value);
        if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
        memoTimerRef.current = setTimeout(async () => {
            setMemoSaving(true);
            const res = await fetch("/api/share/memo", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: activeCode, content: value }),
            });
            if (res.ok) {
                const data = await res.json();
                setMemoUpdatedAt(data.updatedAt);
            }
            setMemoSaving(false);
        }, 1500);
    };

    const handleLookup = () => {
        const code = codeInput.trim().toUpperCase();
        if (!code) return;
        setActiveCode(code);
        fetchFiles(code);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (!dropped) return;
        if (dropped.size > 500 * 1024 * 1024) {
            setUploadError("파일 크기는 500MB를 초과할 수 없습니다.");
            return;
        }
        setFile(dropped);
    };

    const doUpload = (overwriteId?: string) => {
        if (!file || !activeCode) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError("");
        setOverwriteTarget(null);

        const fd = new FormData();
        fd.append("file", file);
        fd.append("shareCode", activeCode);
        if (overwriteId) fd.append("overwriteId", overwriteId);

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = async () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 400)
                    throw new Error(data.error ?? "Upload failed");
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
                await fetchFiles(activeCode);
            } catch (e) {
                setUploadError(
                    e instanceof Error ? e.message : "Upload failed",
                );
            } finally {
                setUploading(false);
                setUploadProgress(null);
            }
        };
        xhr.onerror = () => {
            setUploadError("Network error");
            setUploading(false);
            setUploadProgress(null);
        };
        xhr.open("POST", "/api/share");
        xhr.send(fd);
    };

    const handleUpload = () => {
        if (!file || !activeCode) return;
        const dup = files.find((f) => f.originalName === file.name);
        if (dup) {
            setOverwriteTarget(dup);
            return;
        }
        doUpload();
    };

    return (
        <main className="max-w-3xl mx-auto px-8 py-20 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">팀 저장소</h1>
                <Link
                    href="/"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    홈
                </Link>
            </div>

            {/* 코드 입력 */}
            <div className="flex gap-3">
                <input
                    type="text"
                    placeholder="팀 코드"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    maxLength={20}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-5 py-4 text-lg placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                    onClick={handleLookup}
                    disabled={!codeInput.trim() || loading}
                    className="px-6 py-4 text-lg rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                    조회
                </button>
            </div>

            {loadError && <p className="text-red-400 text-sm">{loadError}</p>}

            {/* 파일 목록 */}
            {activeCode && !loadError && (
                <div className="space-y-2">
                    {loading ? (
                        <p className="text-zinc-500 text-sm">불러오는 중...</p>
                    ) : files.length === 0 ? (
                        <p className="text-zinc-600 text-sm">파일 없음</p>
                    ) : (
                        files.map((f) => (
                            <div
                                key={f.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-zinc-900 rounded border border-zinc-800"
                            >
                                <div className="min-w-0">
                                    <p className="text-zinc-200 text-base truncate">
                                        {f.originalName}
                                    </p>
                                    <p className="text-zinc-600 text-xs mt-0.5">
                                        {formatDate(f.createdAt)} ·{" "}
                                        {formatBytes(f.size)}
                                    </p>
                                </div>
                                <a
                                    href={`/api/files/${f.id}`}
                                    download={f.originalName}
                                    className="shrink-0 px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                                >
                                    다운로드
                                </a>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 업로드 영역 */}
            {activeCode && !loadError && (
                <div className="space-y-4 pt-2 border-t border-zinc-800">
                    <div
                        className={`border border-dashed rounded p-16 text-center cursor-pointer transition-colors ${
                            dragging
                                ? "border-zinc-400 bg-zinc-900"
                                : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                if (f.size > 500 * 1024 * 1024) {
                                    setUploadError(
                                        "파일 크기는 500MB를 종과할 수 없습니다.",
                                    );
                                    e.target.value = "";
                                    return;
                                }
                                setFile(f);
                            }}
                        />
                        {file ? (
                            <div className="space-y-2">
                                <p className="text-zinc-200 text-base truncate">
                                    {file.name}
                                </p>
                                <p className="text-zinc-500 text-sm">
                                    {formatBytes(file.size)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-base">
                                파일 업로드
                            </p>
                        )}
                    </div>

                    {/* 덮어쓰기 확인 */}
                    {overwriteTarget && (
                        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded border border-yellow-800 bg-yellow-950/30">
                            <p className="text-yellow-400 text-sm">
                                <span className="font-mono">
                                    {overwriteTarget.originalName}
                                </span>
                                이(가) 이미 있습니다. 덮어쓰겠습니까?
                            </p>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => doUpload(overwriteTarget.id)}
                                    className="px-3 py-1.5 text-sm rounded bg-yellow-700 hover:bg-yellow-600 text-white transition-colors"
                                >
                                    덮어쓰기
                                </button>
                                <button
                                    onClick={() => {
                                        setOverwriteTarget(null);
                                        setFile(null);
                                        if (inputRef.current)
                                            inputRef.current.value = "";
                                    }}
                                    className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading || !!overwriteTarget}
                        className="w-full py-4 text-lg rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {uploading
                            ? `업로드 중... ${uploadProgress ?? 0}%`
                            : "업로드"}
                    </button>

                    {uploading && uploadProgress !== null && (
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                                className="bg-zinc-300 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    {uploadError && (
                        <p className="text-red-400 text-sm">{uploadError}</p>
                    )}
                </div>
            )}

            {/* 공지사항 */}
            {activeCode && !loadError && (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                    <p className="text-sm text-zinc-500">공지사항</p>
                    {notices.map((n) => (
                        <div
                            key={n.id}
                            className={`flex items-start justify-between gap-3 px-4 py-3 rounded border ${n.pinned ? "border-yellow-800 bg-yellow-950/20" : "border-zinc-800 bg-zinc-900"}`}
                        >
                            <div className="flex-1 min-w-0">
                                {n.pinned && (
                                    <span className="text-xs text-yellow-500 mr-2">
                                        📌 고정
                                    </span>
                                )}
                                <span className="text-sm text-zinc-200 whitespace-pre-wrap">
                                    {n.content}
                                </span>
                                <p className="text-xs text-zinc-600 mt-1">
                                    {formatDate(n.createdAt)}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteNotice(n.id)}
                                className="text-xs text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                            >
                                삭제
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <textarea
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 resize-none"
                            rows={2}
                            placeholder="공지사항 작성..."
                            value={newNotice}
                            onChange={(e) => setNewNotice(e.target.value)}
                        />
                        <div className="flex flex-col gap-2 shrink-0">
                            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="accent-yellow-500"
                                    checked={noticePinned}
                                    onChange={(e) =>
                                        setNoticePinned(e.target.checked)
                                    }
                                />
                                고정
                            </label>
                            <button
                                onClick={postNotice}
                                className="px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 공동 메모 */}
            {activeCode && !loadError && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-500">공동 메모</p>
                        <p className="text-xs text-zinc-600">
                            {memoSaving
                                ? "저장 중..."
                                : memoUpdatedAt
                                  ? `마지막 저장: ${formatDate(memoUpdatedAt)}`
                                  : ""}
                        </p>
                    </div>
                    <textarea
                        value={memo}
                        onChange={(e) => handleMemoChange(e.target.value)}
                        placeholder="메모 공유"
                        maxLength={50000}
                        rows={6}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
                    />
                    <p className="text-xs text-zinc-700 text-right">
                        {memo.length.toLocaleString()} / 50,000
                    </p>
                </div>
            )}
        </main>
    );
}
