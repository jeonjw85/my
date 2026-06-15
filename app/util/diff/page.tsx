"use client";

import { useState } from "react";

interface DiffLine {
    type: "same" | "added" | "removed";
    text: string;
}

function diffLines(a: string, b: string): DiffLine[] {
    const aLines = a.split("\n");
    const bLines = b.split("\n");
    // Simple LCS-based diff
    const m = aLines.length,
        n = bLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0),
    );
    for (let i = m - 1; i >= 0; i--)
        for (let j = n - 1; j >= 0; j--)
            dp[i][j] =
                aLines[i] === bLines[j]
                    ? dp[i + 1][j + 1] + 1
                    : Math.max(dp[i + 1][j], dp[i][j + 1]);

    const result: DiffLine[] = [];
    let i = 0,
        j = 0;
    while (i < m || j < n) {
        if (i < m && j < n && aLines[i] === bLines[j]) {
            result.push({ type: "same", text: aLines[i] });
            i++;
            j++;
        } else if (j < n && (i >= m || dp[i + 1][j] <= dp[i][j + 1])) {
            result.push({ type: "added", text: bLines[j] });
            j++;
        } else {
            result.push({ type: "removed", text: aLines[i] });
            i++;
        }
    }
    return result;
}

export default function DiffPage() {
    const [left, setLeft] = useState("");
    const [right, setRight] = useState("");
    const [showDiff, setShowDiff] = useState(false);

    const diff = showDiff ? diffLines(left, right) : [];
    const added = diff.filter((d) => d.type === "added").length;
    const removed = diff.filter((d) => d.type === "removed").length;

    return (
        <main className="max-w-5xl mx-auto px-8 py-16 space-y-6">
            <h1 className="text-2xl font-bold">텍스트 Diff 비교</h1>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        원본 (A)
                    </p>
                    <textarea
                        className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        placeholder="원본 텍스트..."
                        value={left}
                        onChange={(e) => {
                            setLeft(e.target.value);
                            setShowDiff(false);
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        변경 (B)
                    </p>
                    <textarea
                        className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        placeholder="변경된 텍스트..."
                        value={right}
                        onChange={(e) => {
                            setRight(e.target.value);
                            setShowDiff(false);
                        }}
                    />
                </div>
            </div>

            <button
                onClick={() => setShowDiff(true)}
                disabled={!left && !right}
                className="px-5 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40 transition-colors"
            >
                비교
            </button>

            {showDiff && diff.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            결과
                        </p>
                        {added > 0 && (
                            <span className="text-xs text-emerald-400">
                                +{added}줄 추가
                            </span>
                        )}
                        {removed > 0 && (
                            <span className="text-xs text-red-400">
                                -{removed}줄 삭제
                            </span>
                        )}
                    </div>
                    <div className="rounded border border-zinc-800 overflow-auto max-h-[32rem]">
                        {diff.map((line, i) => (
                            <div
                                key={i}
                                className={`flex px-4 py-0.5 font-mono text-sm ${
                                    line.type === "added"
                                        ? "bg-emerald-950 text-emerald-300"
                                        : line.type === "removed"
                                          ? "bg-red-950 text-red-300"
                                          : "text-zinc-400"
                                }`}
                            >
                                <span className="select-none w-5 shrink-0 text-zinc-600">
                                    {line.type === "added"
                                        ? "+"
                                        : line.type === "removed"
                                          ? "-"
                                          : " "}
                                </span>
                                <span className="whitespace-pre">
                                    {line.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
