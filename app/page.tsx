"use client";

import { useState, useRef, DragEvent } from "react";
import { useSession } from "next-auth/react";

const EXPIRE_OPTIONS = [
    { value: "1h", label: "1시간" },
    { value: "6h", label: "6시간" },
    { value: "24h", label: "24시간" },
    { value: "7d", label: "7일" },
];

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
    const { data: session } = useSession();
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [expireIn, setExpireIn] = useState("24h");
    const [oneTime, setOneTime] = useState(false);
    const [filePassword, setFilePassword] = useState("");
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{
        id: string;
        expiresAt: string;
    } | null>(null);
    const [error, setError] = useState("");
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (!dropped) return;
        if (dropped.size > 500 * 1024 * 1024) {
            setError("파일 크기는 500MB를 종과할 수 없습니다.");
            return;
        }
        setFile(dropped);
    };

    const handleUpload = () => {
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);
        setError("");
        setResult(null);

        const fd = new FormData();
        fd.append("file", file);
        fd.append("expireIn", expireIn);
        fd.append("oneTime", String(oneTime));
        if (filePassword.trim()) fd.append("password", filePassword.trim());

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 400)
                    throw new Error(data.error ?? "Upload failed");
                setResult(data);
                setFile(null);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Upload failed");
            } finally {
                setUploading(false);
                setUploadProgress(null);
            }
        };
        xhr.onerror = () => {
            setError("Network error");
            setUploading(false);
            setUploadProgress(null);
        };
        xhr.open("POST", "/api/upload");
        xhr.send(fd);
    };

    const shareUrl = result ? `${location.origin}/f/${result.id}` : "";

    return (
        <main className="max-w-3xl mx-auto px-8 py-20 space-y-10">
            <div className="flex items-center">
                <h1 className="text-3xl font-bold tracking-tight">MY</h1>
            </div>

            <div
                className={`border border-dashed rounded p-20 text-center cursor-pointer transition-colors ${
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
                            setError("파일 크기는 500MB를 초과할 수 없습니다.");
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
                    <p className="text-zinc-500 text-base">파일 업로드</p>
                )}
            </div>

            <div className="flex gap-4 flex-wrap">
                {EXPIRE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setExpireIn(opt.value)}
                        className={`px-5 py-2 text-base rounded border transition-colors ${
                            expireIn === opt.value
                                ? "border-zinc-300 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <label className="flex items-center gap-3 text-lg text-zinc-400 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => setOneTime(e.target.checked)}
                    className="accent-zinc-400"
                />
                1회 다운로드 후 삭제
            </label>

            <div className="space-y-2">
                <label className="text-sm text-zinc-500">비밀번호 (선택)</label>
                <input
                    type="password"
                    placeholder="설정 시 다운로드 전 비밀번호 입력 필요"
                    value={filePassword}
                    onChange={(e) => setFilePassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-base focus:outline-none focus:border-zinc-500"
                />
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-4 text-lg rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {uploading ? `업로드 중... ${uploadProgress ?? 0}%` : "업로드"}
            </button>

            {uploading && uploadProgress !== null && (
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                        className="bg-zinc-300 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {result && (
                <div className="border border-zinc-700 rounded p-5 space-y-4">
                    <p className="text-sm text-zinc-500">
                        만료:{" "}
                        {new Date(result.expiresAt).toLocaleString("ko-KR")}
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={shareUrl}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 truncate"
                        />
                        <button
                            onClick={() =>
                                navigator.clipboard.writeText(shareUrl)
                            }
                            className="px-4 py-2 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors shrink-0"
                        >
                            복사
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
