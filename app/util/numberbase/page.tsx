"use client";

import { useState } from "react";

type Base = 2 | 8 | 10 | 16;
const BASES: { base: Base; label: string; prefix: string }[] = [
    { base: 2, label: "2진수 (Binary)", prefix: "0b" },
    { base: 8, label: "8진수 (Octal)", prefix: "0o" },
    { base: 10, label: "10진수 (Decimal)", prefix: "" },
    { base: 16, label: "16진수 (Hex)", prefix: "0x" },
];

export default function NumberBasePage() {
    const [input, setInput] = useState("");
    const [fromBase, setFromBase] = useState<Base>(10);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<Base | null>(null);

    function parse(): bigint | null {
        const v = input.trim().replace(/^0[xXbBoO]/, "");
        if (!v) return null;
        try {
            return BigInt(parseInt(v, fromBase));
        } catch {
            return null;
        }
    }

    function copy(base: Base, val: string) {
        navigator.clipboard.writeText(val);
        setCopied(base);
        setTimeout(() => setCopied(null), 1200);
    }

    const num = parse();

    return (
        <main className="max-w-2xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">진법 변환기</h1>

            <div className="space-y-4 rounded border border-zinc-800 p-5">
                <div className="flex gap-3">
                    <select
                        className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                        value={fromBase}
                        onChange={(e) => {
                            setFromBase(Number(e.target.value) as Base);
                            setError("");
                        }}
                    >
                        {BASES.map((b) => (
                            <option key={b.base} value={b.base}>
                                {b.label}
                            </option>
                        ))}
                    </select>
                    <input
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        placeholder={
                            fromBase === 16
                                ? "FF A3 1D..."
                                : fromBase === 2
                                  ? "1010 1011..."
                                  : "숫자 입력"
                        }
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setError("");
                        }}
                    />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            {num !== null && (
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    {BASES.map(({ base, label, prefix }) => {
                        const val = prefix + num.toString(base).toUpperCase();
                        return (
                            <div
                                key={base}
                                className="flex items-center justify-between px-5 py-3"
                            >
                                <div>
                                    <span className="text-xs text-zinc-500 w-36 inline-block">
                                        {label}
                                    </span>
                                    <span className="text-sm font-mono text-zinc-200">
                                        {val}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copy(base, val)}
                                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-4"
                                >
                                    {copied === base ? "✓" : "복사"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ASCII table for hex */}
            {num !== null && fromBase === 16 && num >= 0 && num <= 127 && (
                <p className="text-sm text-zinc-500">
                    ASCII:{" "}
                    <span className="font-mono text-zinc-300">
                        {String.fromCharCode(Number(num))}
                    </span>
                </p>
            )}
        </main>
    );
}
