"use client";

import { useRef, useState } from "react";

export default function PdfPage() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleUnlock() {
        if (!file) return;
        setError("");
        setSuccess("");
        setLoading(true);

        const fd = new FormData();
        fd.append("file", file);
        if (password.trim()) fd.append("password", password.trim());

        const res = await fetch("/api/util/pdf", { method: "POST", body: fd });
        setLoading(false);

        if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "처리 실패");
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const cd = res.headers.get("content-disposition") ?? "";
        const nameMatch = cd.match(/filename="([^"]+)"/);
        a.href = url;
        a.download =
            nameMatch?.[1] ?? `${file.name.replace(".pdf", "")}_unlocked.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess("잠금 해제 완료! 파일이 다운로드됩니다.");
    }

    return (
        <main className="max-w-2xl mx-auto px-8 py-16 space-y-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">PDF 잠금 해제</h1>
                <p className="text-sm text-zinc-500">
                    인쇄/복사 제한이 걸린 PDF의 권한 제한을 제거합니다.
                </p>
            </div>

            {/* Drop zone */}
            <div
                className={`rounded-lg border-2 border-dashed transition-colors p-10 text-center cursor-pointer ${file ? "border-zinc-500 bg-zinc-900/40" : "border-zinc-700 hover:border-zinc-600"}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (
                        f?.type === "application/pdf" ||
                        f?.name.endsWith(".pdf")
                    ) {
                        setFile(f);
                        setError("");
                        setSuccess("");
                    } else setError("PDF 파일만 가능합니다");
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                            setFile(f);
                            setError("");
                            setSuccess("");
                        }
                    }}
                />
                {file ? (
                    <div className="space-y-1">
                        <p className="text-zinc-200 font-mono text-sm">
                            {file.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-zinc-400">
                            PDF 파일을 드래그하거나 클릭해서 선택
                        </p>
                        <p className="text-xs text-zinc-600">최대 50MB</p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm text-zinc-500">
                    비밀번호 (설정된 경우)
                </label>
                <input
                    type="password"
                    placeholder="PDF 열기 비밀번호 (있는 경우)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-zinc-500"
                />
            </div>

            <button
                onClick={handleUnlock}
                disabled={!file || loading}
                className="w-full py-3 text-sm rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? "처리 중..." : "잠금 해제 & 다운로드"}
            </button>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-emerald-400 text-sm">{success}</p>}

            <div className="rounded border border-zinc-800 p-4 space-y-2 text-xs text-zinc-500">
                <p className="font-semibold text-zinc-400">
                    이 도구로 할 수 있는 것:
                </p>
                <ul className="list-disc list-inside space-y-1">
                    <li>인쇄/편집/복사 권한 제한 제거</li>
                    <li>소유자 권한 잠금이 걸린 PDF 해제</li>
                </ul>
                <p className="font-semibold text-zinc-400 mt-2">
                    할 수 없는 것:
                </p>
                <ul className="list-disc list-inside space-y-1">
                    <li>강력한 사용자 비밀번호(열기 비밀번호)가 걸린 파일</li>
                    <li>256-bit AES 암호화된 파일</li>
                </ul>
            </div>
        </main>
    );
}
