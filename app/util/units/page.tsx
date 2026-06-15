"use client";

import { useState } from "react";

type Category = "length" | "weight" | "temp" | "data" | "speed" | "area";

const UNITS: Record<
    Category,
    {
        label: string;
        units: {
            name: string;
            toBase: (v: number) => number;
            fromBase: (v: number) => number;
        }[];
    }
> = {
    length: {
        label: "길이",
        units: [
            { name: "mm", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
            { name: "cm", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
            { name: "m", toBase: (v) => v, fromBase: (v) => v },
            { name: "km", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
            {
                name: "inch",
                toBase: (v) => v * 0.0254,
                fromBase: (v) => v / 0.0254,
            },
            {
                name: "feet",
                toBase: (v) => v * 0.3048,
                fromBase: (v) => v / 0.3048,
            },
            {
                name: "yard",
                toBase: (v) => v * 0.9144,
                fromBase: (v) => v / 0.9144,
            },
            {
                name: "mile",
                toBase: (v) => v * 1609.344,
                fromBase: (v) => v / 1609.344,
            },
            {
                name: "해리",
                toBase: (v) => v * 1852,
                fromBase: (v) => v / 1852,
            },
        ],
    },
    weight: {
        label: "무게",
        units: [
            { name: "mg", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
            { name: "g", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
            { name: "kg", toBase: (v) => v, fromBase: (v) => v },
            {
                name: "t (톤)",
                toBase: (v) => v * 1000,
                fromBase: (v) => v / 1000,
            },
            {
                name: "oz",
                toBase: (v) => v * 0.028349,
                fromBase: (v) => v / 0.028349,
            },
            {
                name: "lb",
                toBase: (v) => v * 0.453592,
                fromBase: (v) => v / 0.453592,
            },
        ],
    },
    temp: {
        label: "온도",
        units: [
            { name: "°C", toBase: (v) => v, fromBase: (v) => v },
            {
                name: "°F",
                toBase: (v) => ((v - 32) * 5) / 9,
                fromBase: (v) => (v * 9) / 5 + 32,
            },
            {
                name: "K",
                toBase: (v) => v - 273.15,
                fromBase: (v) => v + 273.15,
            },
        ],
    },
    data: {
        label: "데이터",
        units: [
            { name: "B", toBase: (v) => v, fromBase: (v) => v },
            { name: "KB", toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
            {
                name: "MB",
                toBase: (v) => v * 1024 ** 2,
                fromBase: (v) => v / 1024 ** 2,
            },
            {
                name: "GB",
                toBase: (v) => v * 1024 ** 3,
                fromBase: (v) => v / 1024 ** 3,
            },
            {
                name: "TB",
                toBase: (v) => v * 1024 ** 4,
                fromBase: (v) => v / 1024 ** 4,
            },
            { name: "Kbit", toBase: (v) => v * 125, fromBase: (v) => v / 125 },
            {
                name: "Mbit",
                toBase: (v) => v * 125000,
                fromBase: (v) => v / 125000,
            },
            {
                name: "Gbit",
                toBase: (v) => v * 1.25e8,
                fromBase: (v) => v / 1.25e8,
            },
        ],
    },
    speed: {
        label: "속도",
        units: [
            { name: "m/s", toBase: (v) => v, fromBase: (v) => v },
            { name: "km/h", toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
            {
                name: "mph",
                toBase: (v) => v * 0.44704,
                fromBase: (v) => v / 0.44704,
            },
            {
                name: "knot",
                toBase: (v) => v * 0.514444,
                fromBase: (v) => v / 0.514444,
            },
        ],
    },
    area: {
        label: "넓이",
        units: [
            { name: "mm²", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
            {
                name: "cm²",
                toBase: (v) => v / 10000,
                fromBase: (v) => v * 10000,
            },
            { name: "m²", toBase: (v) => v, fromBase: (v) => v },
            { name: "km²", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
            {
                name: "평",
                toBase: (v) => v * 3.30579,
                fromBase: (v) => v / 3.30579,
            },
            {
                name: "acre",
                toBase: (v) => v * 4046.86,
                fromBase: (v) => v / 4046.86,
            },
            {
                name: "ft²",
                toBase: (v) => v * 0.092903,
                fromBase: (v) => v / 0.092903,
            },
        ],
    },
};

function fmt(v: number): string {
    if (!isFinite(v)) return "∞";
    if (Math.abs(v) < 1e-9 && v !== 0) return v.toExponential(4);
    if (Math.abs(v) >= 1e12) return v.toExponential(4);
    const s = parseFloat(v.toPrecision(8)).toString();
    return s;
}

export default function UnitsPage() {
    const [cat, setCat] = useState<Category>("length");
    const [value, setValue] = useState("1");
    const [fromUnit, setFromUnit] = useState(0);
    const [copied, setCopied] = useState<string | null>(null);

    const catDef = UNITS[cat];
    const parsed = parseFloat(value);
    const baseValue = isNaN(parsed)
        ? null
        : catDef.units[fromUnit].toBase(parsed);

    function copy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 1200);
    }

    return (
        <main className="max-w-2xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">단위 변환기</h1>

            <div className="flex flex-wrap gap-2">
                {(Object.keys(UNITS) as Category[]).map((c) => (
                    <button
                        key={c}
                        onClick={() => {
                            setCat(c);
                            setFromUnit(0);
                        }}
                        className={`px-4 py-2 text-sm rounded border transition-colors ${cat === c ? "border-zinc-300 text-zinc-100" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                    >
                        {UNITS[c].label}
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="number"
                    className="w-40 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <select
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500"
                    value={fromUnit}
                    onChange={(e) => setFromUnit(Number(e.target.value))}
                >
                    {catDef.units.map((u, i) => (
                        <option key={u.name} value={i}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </div>

            {baseValue !== null && (
                <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
                    {catDef.units.map((u, i) => {
                        const result = u.fromBase(baseValue);
                        const display = fmt(result);
                        return (
                            <div
                                key={u.name}
                                className={`flex items-center justify-between px-5 py-3 ${i === fromUnit ? "bg-zinc-900/40" : ""}`}
                            >
                                <div>
                                    <span className="text-xs text-zinc-500 w-16 inline-block">
                                        {u.name}
                                    </span>
                                    <span className="text-sm font-mono text-zinc-200">
                                        {display}
                                    </span>
                                </div>
                                <button
                                    onClick={() => copy(display)}
                                    className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ml-4"
                                >
                                    {copied === display ? "✓" : "복사"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
