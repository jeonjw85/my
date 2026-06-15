"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface UploadedImage {
    id: string;
    name: string;
    url: string;
}

export default function ImagePage() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem("util_images");
        if (saved) setImages(JSON.parse(saved));
    }, []);

    function saveImages(next: UploadedImage[]) {
        setImages(next);
        localStorage.setItem("util_images", JSON.stringify(next.slice(-50)));
    }

    async function uploadFile(file: File) {
        if (!file.type.startsWith("image/")) {
            alert("이미지 파일만 업로드 가능합니다.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert("50MB 이하 이미지만 지원합니다.");
            return;
        }
        setUploading(true);
        setProgress(0);
        try {
            const formData = new FormData();
            formData.append("file", file);
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/my");
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable)
                        setProgress(Math.round((e.loaded / e.total) * 100));
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        const url = `${window.location.origin}/api/my/${data.id}`;
                        saveImages([
                            { id: data.id, name: file.name, url },
                            ...images,
                        ]);
                        resolve();
                    } else {
                        reject(new Error("업로드 실패"));
                    }
                };
                xhr.onerror = () => reject(new Error("네트워크 오류"));
                xhr.send(formData);
            });
        } catch (e: unknown) {
            alert((e as Error).message);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    }

    useEffect(() => {
        function onPaste(e: ClipboardEvent) {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) uploadFile(file);
                    break;
                }
            }
        }
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    });

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }

    function copy(id: string, url: string) {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1200);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">이미지 즉시 공유</h1>
                <Link
                    href="/util"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    ← 유틸
                </Link>
            </div>

            <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-700 rounded-lg py-16 cursor-pointer hover:border-zinc-500 transition-colors"
            >
                <p className="text-zinc-400 text-sm">
                    Ctrl+V로 붙여넣기 또는 여기에 드래그 / 클릭하여 파일 선택
                </p>
                {uploading && (
                    <div className="w-48 h-2 rounded bg-zinc-800 overflow-hidden">
                        <div
                            className="h-full bg-zinc-300 transition-all duration-150"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                        e.target.value = "";
                    }}
                />
            </div>

            {images.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        업로드 기록 (로컬 저장)
                    </p>
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="flex items-center gap-4 rounded border border-zinc-800 p-3"
                        >
                            <img
                                src={img.url}
                                alt={img.name}
                                className="w-14 h-14 object-cover rounded shrink-0 bg-zinc-800"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300 truncate">
                                    {img.name}
                                </p>
                                <p className="text-xs font-mono text-zinc-600 truncate">
                                    {img.url}
                                </p>
                            </div>
                            <button
                                onClick={() => copy(img.id, img.url)}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors shrink-0"
                            >
                                {copiedId === img.id ? "복사됨!" : "복사"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
