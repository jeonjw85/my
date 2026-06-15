"use client";

import { useState, useCallback } from "react";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

function generate(
    length: number,
    useUpper: boolean,
    useLower: boolean,
    useDigits: boolean,
    useSymbols: boolean,
    count: number,
): string[] {
    const charset = [
        useUpper ? UPPER : "",
        useLower ? LOWER : "",
        useDigits ? DIGITS : "",
        useSymbols ? SYMBOLS : "",
    ].join("");
    if (!charset) return [];
    const arr = new Uint32Array(length * count);
    crypto.getRandomValues(arr);
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
        let pw = "";
        for (let j = 0; j < length; j++) {
            pw += charset[arr[i * length + j] % charset.length];
        }
        results.push(pw);
    }
    return results;
}

export default function PasswordPage() {
    const [length, setLength] = useState(20);
    const [useUpper, setUseUpper] = useState(true);
    const [useLower, setUseLower] = useState(true);
    const [useDigits, setUseDigits] = useState(true);
    const [useSymbols, setUseSymbols] = useState(false);
    const [count, setCount] = useState(5);
    const [passwords, setPasswords] = useState<string[]>([]);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const gen = useCallback(() => {
        setPasswords(
            generate(length, useUpper, useLower, useDigits, useSymbols, count),
        );
    }, [length, useUpper, useLower, useDigits, useSymbols, count]);

    function copy(i: number, pw: string) {
        navigator.clipboard.writeText(pw);
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx(null), 1200);
    }

    const Toggle = ({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: boolean;
        onChange: (v: boolean) => void;
    }) => (
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
            <input
                type="checkbox"
                className="accent-zinc-400"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </label>
    );

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">패스워드 생성기</h1>

            <div className="rounded border border-zinc-800 p-5 space-y-5">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-zinc-400">길이</label>
                        <span className="text-sm font-mono text-zinc-300">
                            {length}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={8}
                        max={128}
                        step={1}
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="w-full accent-zinc-400"
                    />
                </div>

                <div className="flex flex-wrap gap-4">
                    <Toggle
                        label="대문자 (A-Z)"
                        value={useUpper}
                        onChange={setUseUpper}
                    />
                    <Toggle
                        label="소문자 (a-z)"
                        value={useLower}
                        onChange={setUseLower}
                    />
                    <Toggle
                        label="숫자 (0-9)"
                        value={useDigits}
                        onChange={setUseDigits}
                    />
                    <Toggle
                        label={`특수문자 (!@#…)`}
                        value={useSymbols}
                        onChange={setUseSymbols}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <label className="text-sm text-zinc-400 shrink-0">
                        개수
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={count}
                        onChange={(e) =>
                            setCount(
                                Math.min(
                                    20,
                                    Math.max(1, Number(e.target.value)),
                                ),
                            )
                        }
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    />
                    <button
                        onClick={gen}
                        className="px-5 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                    >
                        생성
                    </button>
                </div>
            </div>

            {passwords.length > 0 && (
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    {passwords.map((pw, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-5 py-3"
                        >
                            <span className="text-sm font-mono text-zinc-200 break-all flex-1">
                                {pw}
                            </span>
                            <button
                                onClick={() => copy(i, pw)}
                                className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-4 shrink-0"
                            >
                                {copiedIdx === i ? "복사됨!" : "복사"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
