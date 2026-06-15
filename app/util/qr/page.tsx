"use client";

import { useState, useEffect, useRef } from "react";

// QR code generation using canvas - pure implementation via qr-code-generator algorithm
// We'll use a simple approach with an SVG-based QR via URL

export default function QrPage() {
    const [text, setText] = useState("https://example.com");
    const [size, setSize] = useState(256);
    const [fgColor, setFgColor] = useState("#ffffff");
    const [bgColor, setBgColor] = useState("#18181b");
    const [qrSrc, setQrSrc] = useState("");
    const [copied, setCopied] = useState(false);

    // Use QR Server API (free, no auth)
    function buildUrl(t: string) {
        if (!t.trim()) return "";
        return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(t)}&size=${size}x${size}&color=${fgColor.replace("#", "")}&bgcolor=${bgColor.replace("#", "")}&format=svg`;
    }

    useEffect(() => {
        setQrSrc(buildUrl(text));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, size, fgColor, bgColor]);

    async function download() {
        if (!qrSrc) return;
        const res = await fetch(qrSrc);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qrcode.svg";
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyUrl() {
        navigator.clipboard.writeText(qrSrc);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">QR 코드 생성기</h1>

            <div className="rounded border border-zinc-800 p-5 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest">
                        내용
                    </label>
                    <textarea
                        className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="URL, 텍스트, 전화번호..."
                    />
                </div>
                <div className="flex gap-6 flex-wrap">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500">크기</label>
                        <select
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                        >
                            {[128, 256, 512].map((s) => (
                                <option key={s} value={s}>
                                    {s}px
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500">전경색</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={fgColor}
                                onChange={(e) => setFgColor(e.target.value)}
                                className="h-8 w-10 rounded cursor-pointer bg-transparent border-0"
                            />
                            <span className="text-xs font-mono text-zinc-400">
                                {fgColor}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500">배경색</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="h-8 w-10 rounded cursor-pointer bg-transparent border-0"
                            />
                            <span className="text-xs font-mono text-zinc-400">
                                {bgColor}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {qrSrc && text.trim() && (
                <div className="flex flex-col items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={qrSrc}
                        alt="QR Code"
                        width={size}
                        height={size}
                        className="rounded border border-zinc-800"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={download}
                            className="px-5 py-2.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                        >
                            SVG 다운로드
                        </button>
                        <button
                            onClick={copyUrl}
                            className="px-5 py-2.5 text-sm rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            {copied ? "✓ URL 복사됨" : "URL 복사"}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
