"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useSession } from "next-auth/react";

import {
    INITIAL_UPLOAD_STATE,
    uploadStateLabel,
    uploadStateReducer,
} from "@/lib/upload-progress";
import { expirationLabel } from "@/lib/file-expiration";
import {
    MAX_GENERAL_UPLOAD_SIZE,
    isGeneralUploadTooLarge,
} from "@/lib/upload-policy";
import {
    CHUNK_SIZE,
    uploadDirect,
    uploadInChunks,
} from "@/lib/upload-client";

const EXPIRE_OPTIONS = [
    { value: "1h", label: "1시간" },
    { value: "6h", label: "6시간" },
    { value: "24h", label: "24시간" },
    { value: "7d", label: "7일" },
] as const;

const NEVER_EXPIRE_OPTION = { value: "never", label: "무기한" } as const;

const GENERAL_UPLOAD_SIZE_ERROR = `파일 크기는 ${MAX_GENERAL_UPLOAD_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.`;

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
    const { data: session, status } = useSession();
    const isAdmin = status === "authenticated" && Boolean(session?.user);
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [expireIn, setExpireIn] = useState("24h");
    const [oneTime, setOneTime] = useState(false);
    const [filePassword, setFilePassword] = useState("");
    const [uploadState, dispatchUploadState] = useReducer(
        uploadStateReducer,
        INITIAL_UPLOAD_STATE,
    );
    const uploading = uploadState.phase !== "idle";
    const [result, setResult] = useState<{
        id: string;
        expiresAt: string | null;
    } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status !== "loading" && !isAdmin && expireIn === "never") {
            setExpireIn("24h");
        }
    }, [expireIn, isAdmin, status]);

    const validateFile = useCallback((f: File) => {
        if (isGeneralUploadTooLarge(f.size, isAdmin)) {
            setError(GENERAL_UPLOAD_SIZE_ERROR);
            return false;
        }
        setError("");
        return true;
    }, [isAdmin]);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLLabelElement>) => {
            e.preventDefault();
            setDragging(false);
            if (status === "loading") return;
            const dropped = e.dataTransfer.files[0];
            if (!dropped) return;
            if (validateFile(dropped)) {
                setFile(dropped);
            }
        },
        [status, validateFile],
    );

    const handleFileChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            if (status === "loading") {
                e.target.value = "";
                return;
            }
            const f = e.target.files?.[0];
            if (!f) return;
            if (validateFile(f)) {
                setFile(f);
            } else {
                e.target.value = "";
            }
        },
        [status, validateFile],
    );

    const handleUpload = useCallback(async () => {
        if (status === "loading" || !file) return;
        if (!validateFile(file)) return;
        dispatchUploadState({ type: "start" });
        setError("");
        setResult(null);

        const options = {
            expireIn,
            oneTime,
            password: filePassword.trim() || undefined,
        };
        const callbacks = {
            onProgress: (progress: {
                lengthComputable: boolean;
                loaded: number;
                total: number;
            }) => dispatchUploadState({ type: "progress", ...progress }),
            onProcessing: () => dispatchUploadState({ type: "uploaded" }),
        };

        try {
            const data = isAdmin && file.size > CHUNK_SIZE
                ? await uploadInChunks(file, options, callbacks)
                : await uploadDirect(file, options, callbacks);
            setResult(data);
            setFile(null);
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "업로드 요청에 실패했습니다.",
            );
        } finally {
            dispatchUploadState({ type: "reset" });
        }
    }, [status, file, validateFile, expireIn, oneTime, filePassword, isAdmin]);

    const shareUrl = result ? `${location.origin}/f/${result.id}` : "";

    return (
        <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    파일 공유
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                    파일을 업로드하고 공유 링크를 생성합니다
                </p>
            </div>

            {/* Upload surface */}
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    if (status === "loading") return;
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`block border border-dashed rounded cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-zinc-500 ${
                    dragging
                        ? "border-zinc-400 bg-zinc-900"
                        : "border-zinc-700 hover:border-zinc-500"
                }`}
            >
                <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={status === "loading"}
                />
                <div className="px-6 py-10 sm:px-10 sm:py-14 text-center">
                    {file ? (
                        <div className="space-y-1">
                            <p className="text-zinc-200 text-base truncate max-w-full">
                                {file.name}
                            </p>
                            <p className="text-zinc-500 text-sm">
                                {formatBytes(file.size)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-base">
                            파일을 드래그하거나 클릭하여 선택
                        </p>
                    )}
                </div>
            </label>

            {/* Expiration controls */}
            <fieldset>
                <legend className="text-sm text-zinc-400 mb-2">
                    만료 시간
                </legend>
                <div className="flex gap-3 flex-wrap">
                    {[
                        ...EXPIRE_OPTIONS,
                        ...(isAdmin ? [NEVER_EXPIRE_OPTION] : []),
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setExpireIn(opt.value)}
                            aria-pressed={expireIn === opt.value}
                            className={`px-3 py-1.5 text-sm rounded border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 ${
                                expireIn === opt.value
                                    ? "border-zinc-500 text-zinc-100"
                                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </fieldset>

            <label className="flex items-center gap-3 text-base text-zinc-400 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => setOneTime(e.target.checked)}
                    className="accent-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                />
                1회 다운로드 후 삭제
            </label>

            <div className="space-y-1.5">
                <label
                    htmlFor="file-password"
                    className="text-sm text-zinc-400"
                >
                    비밀번호 (선택)
                </label>
                <input
                    id="file-password"
                    type="password"
                    placeholder="설정 시 다운로드 전 비밀번호 입력 필요"
                    value={filePassword}
                    onChange={(e) => setFilePassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-base placeholder:text-zinc-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 focus:border-zinc-500 transition-colors"
                />
            </div>

            <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading || status === "loading"}
                className="w-full py-3 text-base rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
            >
                {uploadStateLabel(uploadState)}
            </button>

            {uploadState.phase === "uploading" &&
                uploadState.percent !== null && (
                    <progress
                        role="progressbar"
                        aria-valuenow={uploadState.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="업로드 진행률"
                        value={uploadState.percent}
                        max={100}
                        className="w-full h-1.5 [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-zinc-300 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-zinc-300 [&::-moz-progress-bar]:rounded-full"
                    />
                )}

            {error && (
                <p role="alert" className="text-red-400 text-sm">
                    {error}
                </p>
            )}

            {result && (
                <div
                    role="status"
                    aria-live="polite"
                    className="border border-zinc-700 rounded p-4 sm:p-5 space-y-3"
                >
                    <p className="text-sm text-zinc-500">
                        만료:{" "}
                        {expirationLabel(result.expiresAt, (expiresAt) =>
                            new Date(expiresAt).toLocaleString("ko-KR"),
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                            readOnly
                            value={shareUrl}
                            aria-label="공유 링크"
                            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 truncate"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                navigator.clipboard.writeText(shareUrl)
                            }
                            className="px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                        >
                            복사
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
