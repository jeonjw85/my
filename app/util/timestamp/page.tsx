"use client";

import { useState } from "react";

function pad(n: number) {
    return String(n).padStart(2, "0");
}

function formatLocal(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatISO(d: Date) {
    return d.toISOString();
}

export default function TimestampPage() {
    const [tsInput, setTsInput] = useState("");
    const [dateInput, setDateInput] = useState(
        formatLocal(new Date()).slice(0, 10),
    );
    const [timeInput, setTimeInput] = useState(
        formatLocal(new Date()).slice(11, 19),
    );
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const now = new Date();

    function copy(key: string, val: string) {
        navigator.clipboard.writeText(val);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1200);
    }

    // Timestamp → Date conversion
    let tsResult: {
        local: string;
        utc: string;
        iso: string;
        relative: string;
    } | null = null;
    let tsError = "";
    if (tsInput.trim()) {
        const n = Number(tsInput.trim());
        if (isNaN(n)) {
            tsError = "숫자가 아닙니다.";
        } else {
            const ms = tsInput.trim().length <= 10 ? n * 1000 : n;
            const d = new Date(ms);
            if (isNaN(d.getTime())) {
                tsError = "유효하지 않은 타임스탬프";
            } else {
                const diff = Math.floor((now.getTime() - ms) / 1000);
                const abs = Math.abs(diff);
                const rel =
                    abs < 60
                        ? `${diff > 0 ? "" : "-"}${abs}초 전/후`
                        : abs < 3600
                          ? `${Math.floor(abs / 60)}분 ${diff > 0 ? "전" : "후"}`
                          : abs < 86400
                            ? `${Math.floor(abs / 3600)}시간 ${diff > 0 ? "전" : "후"}`
                            : `${Math.floor(abs / 86400)}일 ${diff > 0 ? "전" : "후"}`;
                tsResult = {
                    local: formatLocal(d),
                    utc: d.toUTCString(),
                    iso: formatISO(d),
                    relative: rel,
                };
            }
        }
    }

    // Date → Timestamp
    let dateResult: { unix: number; ms: number } | null = null;
    let dateError = "";
    if (dateInput && timeInput) {
        const d = new Date(`${dateInput}T${timeInput}`);
        if (isNaN(d.getTime())) {
            dateError = "유효하지 않은 날짜";
        } else {
            dateResult = {
                unix: Math.floor(d.getTime() / 1000),
                ms: d.getTime(),
            };
        }
    }

    const nowUnix = Math.floor(now.getTime() / 1000);

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">타임스탬프 변환기</h1>

            {/* Now */}
            <div className="rounded border border-zinc-800 p-5 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                    현재 시각
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-zinc-300">
                        {nowUnix}
                    </span>
                    <button
                        onClick={() => copy("now", String(nowUnix))}
                        className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                    >
                        {copiedKey === "now" ? "복사됨!" : "복사"}
                    </button>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                    {formatLocal(now)}
                </p>
            </div>

            {/* Unix → Date */}
            <div className="space-y-4">
                <h2 className="text-base font-semibold text-zinc-300">
                    타임스탬프 → 날짜
                </h2>
                <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    placeholder="Unix 타임스탬프 (초 또는 밀리초)"
                    value={tsInput}
                    onChange={(e) => setTsInput(e.target.value)}
                />
                {tsError && <p className="text-red-400 text-sm">{tsError}</p>}
                {tsResult && (
                    <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                        {[
                            ["로컬", tsResult.local],
                            ["UTC", tsResult.utc],
                            ["ISO 8601", tsResult.iso],
                            ["상대", tsResult.relative],
                        ].map(([label, val]) => (
                            <div
                                key={label}
                                className="flex items-center justify-between px-5 py-3"
                            >
                                <span className="text-xs text-zinc-500 w-24 shrink-0">
                                    {label}
                                </span>
                                <span className="text-sm font-mono text-zinc-300 flex-1">
                                    {val}
                                </span>
                                <button
                                    onClick={() => copy(label, val)}
                                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-2 shrink-0"
                                >
                                    {copiedKey === label ? "✓" : "복사"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Date → Unix */}
            <div className="space-y-4">
                <h2 className="text-base font-semibold text-zinc-300">
                    날짜 → 타임스탬프
                </h2>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                    />
                    <input
                        type="time"
                        step="1"
                        className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500"
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                    />
                </div>
                {dateError && (
                    <p className="text-red-400 text-sm">{dateError}</p>
                )}
                {dateResult && (
                    <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                        {[
                            ["Unix (초)", String(dateResult.unix)],
                            ["밀리초", String(dateResult.ms)],
                        ].map(([label, val]) => (
                            <div
                                key={label}
                                className="flex items-center justify-between px-5 py-3"
                            >
                                <span className="text-xs text-zinc-500 w-28 shrink-0">
                                    {label}
                                </span>
                                <span className="text-sm font-mono text-zinc-300 flex-1">
                                    {val}
                                </span>
                                <button
                                    onClick={() => copy(label + "d", val)}
                                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-2 shrink-0"
                                >
                                    {copiedKey === label + "d" ? "✓" : "복사"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
