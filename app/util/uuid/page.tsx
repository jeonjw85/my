"use client";

import { useState } from "react";

function uuidv4(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    const h = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export default function UuidPage() {
    const [count, setCount] = useState(10);
    const [uuids, setUuids] = useState<string[]>([]);
    const [uppercase, setUppercase] = useState(false);
    const [noDash, setNoDash] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    function generate() {
        setUuids(
            Array.from({ length: count }, () => {
                let u = uuidv4();
                if (noDash) u = u.replace(/-/g, "");
                if (uppercase) u = u.toUpperCase();
                return u;
            }),
        );
    }

    function copy(i: number, u: string) {
        navigator.clipboard.writeText(u);
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx(null), 1200);
    }

    function copyAll() {
        if (!uuids.length) return;
        navigator.clipboard.writeText(uuids.join("\n"));
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1200);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">UUID 생성기</h1>

            <div className="rounded border border-zinc-800 p-5 space-y-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm text-zinc-400">개수</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={count}
                        onChange={(e) =>
                            setCount(
                                Math.min(
                                    100,
                                    Math.max(1, Number(e.target.value)),
                                ),
                            )
                        }
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    />
                </div>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="accent-zinc-400"
                            checked={uppercase}
                            onChange={(e) => setUppercase(e.target.checked)}
                        />
                        대문자
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="accent-zinc-400"
                            checked={noDash}
                            onChange={(e) => setNoDash(e.target.checked)}
                        />
                        하이픈 제거
                    </label>
                </div>
                <button
                    onClick={generate}
                    className="px-5 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                >
                    생성
                </button>
            </div>

            {uuids.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            {uuids.length}개 생성됨
                        </p>
                        <button
                            onClick={copyAll}
                            className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                        >
                            {copiedAll ? "복사됨!" : "전체 복사"}
                        </button>
                    </div>
                    <div className="rounded border border-zinc-800 divide-y divide-zinc-800 max-h-96 overflow-auto">
                        {uuids.map((u, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-5 py-2.5"
                            >
                                <span className="text-sm font-mono text-zinc-300">
                                    {u}
                                </span>
                                <button
                                    onClick={() => copy(i, u)}
                                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-4 shrink-0"
                                >
                                    {copiedIdx === i ? "✓" : "복사"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
