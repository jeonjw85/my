"use client";

import { useState } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace("#", "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const full =
        clean.length === 3
            ? clean
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : clean;
    return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
    };
}

function rgbToHsl(
    r: number,
    g: number,
    b: number,
): { h: number; s: number; l: number } {
    const rn = r / 255,
        gn = g / 255,
        bn = b / 255;
    const max = Math.max(rn, gn, bn),
        min = Math.min(rn, gn, bn);
    let h = 0,
        s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rn:
                h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
                break;
            case gn:
                h = ((bn - rn) / d + 2) / 6;
                break;
            default:
                h = ((rn - gn) / d + 4) / 6;
                break;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function toHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export default function ColorPage() {
    const [hexInput, setHexInput] = useState("#3b82f6");
    const [rInput, setRInput] = useState("59");
    const [gInput, setGInput] = useState("130");
    const [bInput, setBInput] = useState("246");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    function copy(key: string, val: string) {
        navigator.clipboard.writeText(val);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1200);
    }

    // HEX → others
    const hexRgb = hexToRgb(hexInput);
    const hexHsl = hexRgb ? rgbToHsl(hexRgb.r, hexRgb.g, hexRgb.b) : null;

    // RGB → others
    const r = Math.min(255, Math.max(0, Number(rInput) || 0));
    const g = Math.min(255, Math.max(0, Number(gInput) || 0));
    const b = Math.min(255, Math.max(0, Number(bInput) || 0));
    const rgbHex = toHex(r, g, b);
    const rgbHsl = rgbToHsl(r, g, b);

    function ResultRow({
        label,
        value,
        k,
    }: {
        label: string;
        value: string;
        k: string;
    }) {
        return (
            <div className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-zinc-500 w-28 shrink-0">
                    {label}
                </span>
                <span className="text-sm font-mono text-zinc-300 flex-1">
                    {value}
                </span>
                <button
                    onClick={() => copy(k, value)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-2"
                >
                    {copiedKey === k ? "✓" : "복사"}
                </button>
            </div>
        );
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">색상 코드 변환</h1>

            {/* HEX → */}
            <div className="space-y-4">
                <h2 className="text-base font-semibold text-zinc-300">
                    HEX → RGB / HSL
                </h2>
                <div className="flex items-center gap-3">
                    {hexRgb && (
                        <div
                            className="w-12 h-12 rounded border border-zinc-700 shrink-0"
                            style={{ backgroundColor: hexInput }}
                        />
                    )}
                    <input
                        className="bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 w-40"
                        placeholder="#3b82f6"
                        value={hexInput}
                        onChange={(e) => setHexInput(e.target.value)}
                    />
                </div>
                {hexRgb && hexHsl && (
                    <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                        <ResultRow
                            label="RGB"
                            value={`rgb(${hexRgb.r}, ${hexRgb.g}, ${hexRgb.b})`}
                            k="hrgb"
                        />
                        <ResultRow
                            label="HSL"
                            value={`hsl(${hexHsl.h}, ${hexHsl.s}%, ${hexHsl.l}%)`}
                            k="hhsl"
                        />
                        <ResultRow
                            label="HEX (정규화)"
                            value={
                                hexInput.startsWith("#")
                                    ? hexInput
                                    : "#" + hexInput
                            }
                            k="hhex"
                        />
                    </div>
                )}
                {!hexRgb && hexInput.length > 1 && (
                    <p className="text-red-400 text-sm">
                        유효하지 않은 HEX 코드
                    </p>
                )}
            </div>

            {/* RGB → */}
            <div className="space-y-4">
                <h2 className="text-base font-semibold text-zinc-300">
                    RGB → HEX / HSL
                </h2>
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded border border-zinc-700 shrink-0"
                        style={{ backgroundColor: rgbHex }}
                    />
                    {[
                        { label: "R", val: rInput, set: setRInput },
                        { label: "G", val: gInput, set: setGInput },
                        { label: "B", val: bInput, set: setBInput },
                    ].map(({ label, val, set }) => (
                        <div
                            key={label}
                            className="flex flex-col items-center gap-1"
                        >
                            <span className="text-xs text-zinc-500">
                                {label}
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={255}
                                value={val}
                                onChange={(e) => set(e.target.value)}
                                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm font-mono text-center focus:outline-none focus:border-zinc-500"
                            />
                        </div>
                    ))}
                </div>
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    <ResultRow label="HEX" value={rgbHex} k="rhex" />
                    <ResultRow
                        label="HSL"
                        value={`hsl(${rgbHsl.h}, ${rgbHsl.s}%, ${rgbHsl.l}%)`}
                        k="rhsl"
                    />
                </div>
            </div>
        </main>
    );
}
