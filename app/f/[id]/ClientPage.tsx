"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type FileInfo = {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    expiresAt: string;
    downloadCount: number;
    maxDownloads: number | null;
    password: string | null;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(mime: string) {
    return mime.startsWith("image/");
}
function isVideo(mime: string) {
    return mime.startsWith("video/");
}
function isAudio(mime: string) {
    return mime.startsWith("audio/");
}
function isText(mime: string) {
    return (
        mime.startsWith("text/") ||
        [
            "application/json",
            "application/xml",
            "application/javascript",
        ].includes(mime)
    );
}
function isPdf(mime: string) {
    return mime === "application/pdf";
}

export default function FilePageClient() {
    const { id } = useParams<{ id: string }>();
    const [file, setFile] = useState<FileInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [expired, setExpired] = useState(false);
    const [limitReached, setLimitReached] = useState(false);
    const [needPw, setNeedPw] = useState(false);
    const [pwInput, setPwInput] = useState("");
    const [pwError, setPwError] = useState("");
    const [pw, setPw] = useState("");

    useEffect(() => {
        fetch(`/api/fileinfo/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error === "Not found") {
                    setNotFound(true);
                    return;
                }
                if (data.expired) {
                    setExpired(true);
                    return;
                }
                if (data.limitReached) {
                    setLimitReached(true);
                    return;
                }
                setFile(data);
                if (data.password) setNeedPw(true);
            });
    }, [id]);

    function submitPw() {
        setPwError("");
        setPw(pwInput);
        setNeedPw(false);
    }

    if (notFound)
        return (
            <main className="max-w-xl mx-auto px-4 py-12">
                <p className="text-zinc-400">파일을 찾을 수 없습니다.</p>
            </main>
        );
    if (expired)
        return (
            <main className="max-w-xl mx-auto px-4 py-12">
                <p className="text-red-400">만료된 파일입니다.</p>
            </main>
        );
    if (limitReached)
        return (
            <main className="max-w-xl mx-auto px-4 py-12">
                <p className="text-red-400">다운로드 횟수가 초과되었습니다.</p>
            </main>
        );
    if (!file)
        return (
            <main className="max-w-xl mx-auto px-4 py-12">
                <p className="text-zinc-500 text-sm">불러오는 중...</p>
            </main>
        );

    if (needPw)
        return (
            <main className="max-w-sm mx-auto px-8 py-16 space-y-6">
                <h1 className="text-xl font-bold">비밀번호 보호 파일</h1>
                <p className="text-sm text-zinc-400">{file.originalName}</p>
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
                    {pwError && (
                        <p className="text-red-400 text-sm">{pwError}</p>
                    )}
                    <button
                        onClick={submitPw}
                        className="w-full py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                    >
                        확인
                    </button>
                </div>
            </main>
        );

    const downloadUrl = `/api/files/${file.id}${pw ? `?pw=${encodeURIComponent(pw)}` : ""}`;
    const previewUrl = downloadUrl + (pw ? "&" : "?") + "preview=1";
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const qrUrl = shareUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=160x160&color=d4d4d8&bgcolor=09090b&format=svg`
        : "";

    return (
        <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold truncate">
                        {file.originalName}
                    </h1>
                    <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                        <p>
                            크기: {formatBytes(file.size)} · {file.mimeType}
                        </p>
                        <p>
                            만료:{" "}
                            {new Date(file.expiresAt).toLocaleString("ko-KR")}
                        </p>
                        <p>
                            다운로드: {file.downloadCount}
                            {file.maxDownloads !== null
                                ? ` / ${file.maxDownloads}`
                                : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-3 shrink-0">
                    {qrUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={qrUrl}
                            alt="QR"
                            width={64}
                            height={64}
                            className="rounded border border-zinc-800 opacity-80"
                            title="이 링크의 QR 코드"
                        />
                    )}
                    <a
                        href={downloadUrl}
                        download={file.originalName}
                        className="px-5 py-2.5 text-sm rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                        다운로드
                    </a>
                </div>
            </div>

            {/* Preview */}
            {isImage(file.mimeType) && (
                <div className="rounded border border-zinc-800 overflow-hidden bg-zinc-900 flex items-center justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={downloadUrl}
                        alt={file.originalName}
                        className="max-w-full max-h-[60vh] object-contain rounded"
                    />
                </div>
            )}
            {isVideo(file.mimeType) && (
                <video
                    src={downloadUrl}
                    controls
                    className="w-full rounded border border-zinc-800 max-h-[60vh]"
                />
            )}
            {isAudio(file.mimeType) && (
                <audio src={downloadUrl} controls className="w-full" />
            )}
            {isPdf(file.mimeType) && (
                <div
                    className="rounded border border-zinc-800 overflow-hidden"
                    style={{ height: "70vh" }}
                >
                    <iframe
                        src={downloadUrl}
                        className="w-full h-full"
                        title={file.originalName}
                    />
                </div>
            )}
        </main>
    );
}
