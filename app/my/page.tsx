"use client";

import { useState, useRef, DragEvent, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MyFile = {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    note: string | null;
    createdAt: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function MyPage() {
    const router = useRouter();
    const [files, setFiles] = useState<MyFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [note, setNote] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNote, setEditNote] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchFiles = useCallback(async () => {
        const res = await fetch("/api/my");
        if (res.status === 401) {
            router.push("/admin/login");
            return;
        }
        const data = await res.json();
        setFiles(data);
        setLoading(false);
    }, [router]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (!dropped) return;
        if (dropped.size > 500 * 1024 * 1024) {
            setUploadError("파일 크기는 500MB를 종과할 수 없습니다.");
            return;
        }
        setSelectedFile(dropped);
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError("");

        const fd = new FormData();
        fd.append("file", selectedFile);
        if (note.trim()) fd.append("note", note.trim());

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
                setFiles((prev) => [data, ...prev]);
                setSelectedFile(null);
                setNote("");
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
        xhr.open("POST", "/api/my");
        xhr.send(fd);
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/my/${id}`, { method: "DELETE" });
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleSaveNote = async (id: string) => {
        await fetch(`/api/my/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: editNote.trim() || null }),
        });
        setFiles((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, note: editNote.trim() || null } : f,
            ),
        );
        setEditingId(null);
    };

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    return (
        <main className="max-w-4xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">내 저장소</h1>
                    {files.length > 0 && (
                        <p className="text-sm text-zinc-500 mt-0.5">
                            {files.length}개 · {formatBytes(totalSize)}
                        </p>
                    )}
                </div>
                <div className="flex gap-5 text-base text-zinc-400">
                    <Link
                        href="/admin"
                        className="hover:text-zinc-100 transition-colors"
                    >
                        관리
                    </Link>
                    <Link
                        href="/"
                        className="hover:text-zinc-100 transition-colors"
                    >
                        홈
                    </Link>
                </div>
            </div>

            <div className="space-y-3">
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
                                setUploadError(
                                    "파일 크기는 500MB를 종과할 수 없습니다.",
                                );
                                e.target.value = "";
                                return;
                            }
                            setSelectedFile(f);
                        }}
                    />
                    {selectedFile ? (
                        <div className="space-y-2">
                            <p className="text-zinc-200 text-base truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-zinc-500 text-sm">
                                {formatBytes(selectedFile.size)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-base">
                            클릭하거나 파일을 끌어다 놓으세요
                        </p>
                    )}
                </div>

                {selectedFile && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="메모 (선택)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="px-5 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors shrink-0"
                        >
                            {uploading ? `${uploadProgress ?? 0}%` : "저장"}
                        </button>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="px-4 py-2 text-sm rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            취소
                        </button>
                    </div>
                )}

                {uploadError && (
                    <p className="text-red-400 text-sm">{uploadError}</p>
                )}
                {uploading && uploadProgress !== null && (
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                            className="bg-zinc-300 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <p className="text-zinc-500 text-sm">로딩 중...</p>
            ) : files.length === 0 ? (
                <p className="text-zinc-600 text-sm">저장된 파일 없음</p>
            ) : (
                <div className="space-y-1">
                    {files.map((f) => (
                        <div
                            key={f.id}
                            className="border border-zinc-800 rounded px-5 py-4 space-y-2"
                        >
                            <div className="flex items-center gap-4">
                                <span className="flex-1 text-base text-zinc-200 truncate">
                                    {f.originalName}
                                </span>
                                <span className="text-sm text-zinc-500 shrink-0">
                                    {formatBytes(f.size)}
                                </span>
                                <span className="text-sm text-zinc-600 shrink-0">
                                    {new Date(f.createdAt).toLocaleDateString(
                                        "ko-KR",
                                    )}
                                </span>
                                <a
                                    href={`/api/my/${f.id}`}
                                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
                                >
                                    받기
                                </a>
                                <button
                                    onClick={() => handleDelete(f.id)}
                                    className="text-sm text-red-500 hover:text-red-400 transition-colors shrink-0"
                                >
                                    삭제
                                </button>
                            </div>

                            {editingId === f.id ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editNote}
                                        onChange={(e) =>
                                            setEditNote(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            handleSaveNote(f.id)
                                        }
                                        autoFocus
                                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-zinc-500"
                                    />
                                    <button
                                        onClick={() => handleSaveNote(f.id)}
                                        className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                                    >
                                        저장
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                    >
                                        취소
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setEditingId(f.id);
                                        setEditNote(f.note ?? "");
                                    }}
                                    className="text-left text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full"
                                >
                                    {f.note ?? "+ 메모"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
