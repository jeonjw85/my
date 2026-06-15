"use client";

import { useState } from "react";

// Parse cron expression and describe it
function parseCron(
    expr: string,
): { desc: string; next: Date[] } | { error: string } {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6)
        return { error: "5~6개 필드를 입력하세요 (분 시 일 월 요일 [년])" };

    const [min, hour, dom, month, dow] = parts;

    function descField(
        val: string,
        unit: string,
        min: number,
        max: number,
        names?: string[],
    ) {
        if (val === "*") return `모든 ${unit}`;
        if (val.startsWith("*/")) return `${val.slice(2)}${unit}마다`;
        if (val.includes(","))
            return (
                val
                    .split(",")
                    .map((v) => names?.[Number(v)] ?? v)
                    .join(", ") + ` ${unit}`
            );
        if (val.includes("-")) {
            const [a, b] = val.split("-");
            return `${a}~${b} ${unit}`;
        }
        return (names?.[Number(val)] ?? val) + ` ${unit}`;
    }

    const MONTHS = [
        "",
        "1월",
        "2월",
        "3월",
        "4월",
        "5월",
        "6월",
        "7월",
        "8월",
        "9월",
        "10월",
        "11월",
        "12월",
    ];
    const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

    const desc = [
        descField(min, "분", 0, 59),
        descField(hour, "시", 0, 23),
        descField(dom, "일", 1, 31),
        descField(month, "월", 1, 12, MONTHS),
        descField(dow, "요일", 0, 6, DAYS),
    ].join(" / ");

    // Calculate next 5 occurrences (simplified - use actual next-run logic)
    const next: Date[] = [];
    try {
        const now = new Date();
        let candidate = new Date(now.getTime() + 60_000);
        candidate.setSeconds(0, 0);
        let attempts = 0;

        while (next.length < 5 && attempts < 100000) {
            attempts++;
            if (matchesCron(candidate, parts)) {
                next.push(new Date(candidate));
            }
            candidate = new Date(candidate.getTime() + 60_000);
        }
    } catch {
        /* ignore */
    }

    return { desc, next };
}

function matchesCron(d: Date, parts: string[]): boolean {
    const [min, hour, dom, month, dow] = parts;
    return (
        matchField(d.getMinutes(), min, 0, 59) &&
        matchField(d.getHours(), hour, 0, 23) &&
        matchField(d.getDate(), dom, 1, 31) &&
        matchField(d.getMonth() + 1, month, 1, 12) &&
        matchField(d.getDay(), dow, 0, 6)
    );
}

function matchField(
    val: number,
    expr: string,
    min: number,
    max: number,
): boolean {
    if (expr === "*") return true;
    if (expr.startsWith("*/")) {
        const step = parseInt(expr.slice(2));
        return (val - min) % step === 0;
    }
    if (expr.includes(",")) return expr.split(",").map(Number).includes(val);
    if (expr.includes("-")) {
        const [a, b] = expr.split("-").map(Number);
        return val >= a && val <= b;
    }
    return val === Number(expr);
}

const EXAMPLES = [
    { label: "매 분", expr: "* * * * *" },
    { label: "매 시간 정각", expr: "0 * * * *" },
    { label: "매일 자정", expr: "0 0 * * *" },
    { label: "매일 오전 9시", expr: "0 9 * * *" },
    { label: "매주 월요일 9시", expr: "0 9 * * 1" },
    { label: "매월 1일 자정", expr: "0 0 1 * *" },
    { label: "매 5분", expr: "*/5 * * * *" },
    { label: "평일 오전 9-18시 매 30분", expr: "*/30 9-18 * * 1-5" },
];

export default function CronPage() {
    const [expr, setExpr] = useState("0 9 * * 1-5");

    const result = parseCron(expr);

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">Cron 표현식 파서</h1>

            <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-widest">
                    Cron 표현식
                </label>
                <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-lg font-mono focus:outline-none focus:border-zinc-500"
                    value={expr}
                    onChange={(e) => setExpr(e.target.value)}
                    placeholder="* * * * *"
                />
                <p className="text-xs text-zinc-600">
                    분 &nbsp; 시 &nbsp; 일 &nbsp; 월 &nbsp; 요일
                </p>
            </div>

            {"error" in result ? (
                <p className="text-red-400 text-sm">{result.error}</p>
            ) : (
                <div className="space-y-4">
                    <div className="rounded border border-zinc-800 p-5 space-y-3">
                        <p className="text-sm text-zinc-400">
                            설명:{" "}
                            <span className="text-zinc-100">{result.desc}</span>
                        </p>
                    </div>
                    {result.next.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                다음 실행 시간
                            </p>
                            <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                                {result.next.map((d, i) => (
                                    <div
                                        key={i}
                                        className="px-5 py-2.5 text-sm font-mono text-zinc-300"
                                    >
                                        {d.toLocaleString("ko-KR")}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                    예시
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {EXAMPLES.map((ex) => (
                        <button
                            key={ex.expr}
                            onClick={() => setExpr(ex.expr)}
                            className="text-left px-4 py-2.5 rounded border border-zinc-800 hover:border-zinc-600 transition-colors"
                        >
                            <p className="text-sm text-zinc-300">{ex.label}</p>
                            <p className="text-xs font-mono text-zinc-600 mt-0.5">
                                {ex.expr}
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </main>
    );
}
