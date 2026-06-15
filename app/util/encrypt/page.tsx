"use client";

import { useState } from "react";
import Link from "next/link";

async function deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const rawKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("fileserver-salt-v1"),
            iterations: 200000,
            hash: "SHA-256",
        },
        rawKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

function toBase64(buf: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(s: string) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function encryptText(
    plaintext: string,
    password: string,
): Promise<string> {
    const key = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(plaintext),
    );
    const combined = new Uint8Array(12 + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), 12);
    return toBase64(combined.buffer);
}

async function decryptText(encoded: string, password: string): Promise<string> {
    const key = await deriveKey(password);
    const combined = fromBase64(encoded.trim());
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data,
    );
    return new TextDecoder().decode(plaintext);
}

export default function EncryptPage() {
    const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
    const [input, setInput] = useState("");
    const [password, setPassword] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleRun = async () => {
        if (!input.trim()) return setError("텍스트를 입력하세요");
        if (!password) return setError("비밀번호를 입력하세요");
        setError("");
        setOutput("");
        setLoading(true);
        try {
            if (mode === "encrypt") {
                setOutput(await encryptText(input, password));
            } else {
                setOutput(await decryptText(input, password));
            }
        } catch {
            setError(
                mode === "decrypt"
                    ? "복호화 실패 — 비밀번호가 올바른지 확인하세요"
                    : "암호화 중 오류 발생",
            );
        } finally {
            setLoading(false);
        }
    };

    const copy = () => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const switchMode = (m: "encrypt" | "decrypt") => {
        setMode(m);
        setInput("");
        setOutput("");
        setError("");
    };

    return (
        <main className="max-w-2xl mx-auto px-8 py-14 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">텍스트 암호화</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        AES-256-GCM · 브라우저에서만 처리됨
                    </p>
                </div>
                <Link
                    href="/util"
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    유틸
                </Link>
            </div>

            <div className="flex gap-2">
                {(["encrypt", "decrypt"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`px-4 py-2 text-sm rounded border transition-colors ${
                            mode === m
                                ? "border-zinc-300 text-zinc-100"
                                : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                        }`}
                    >
                        {m === "encrypt" ? "암호화" : "복호화"}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <textarea
                    rows={6}
                    placeholder={
                        mode === "encrypt"
                            ? "암호화할 텍스트..."
                            : "복호화할 암호문 (base64)..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRun()}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-zinc-500"
                />
                <button
                    onClick={handleRun}
                    disabled={loading}
                    className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors disabled:opacity-40"
                >
                    {loading
                        ? "처리 중..."
                        : mode === "encrypt"
                          ? "암호화"
                          : "복호화"}
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {output && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">결과</p>
                        <button
                            onClick={copy}
                            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {copied ? "복사됨" : "복사"}
                        </button>
                    </div>
                    <textarea
                        rows={6}
                        readOnly
                        value={output}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none resize-none"
                    />
                </div>
            )}
        </main>
    );
}
