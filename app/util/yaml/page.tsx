"use client";

import { useState, useMemo } from "react";

// Minimal YAML parser (subset: key: value, lists, nested)
function yamlToObj(yaml: string): unknown {
    const lines = yaml.split("\n");
    const stack: {
        obj: Record<string, unknown> | unknown[];
        indent: number;
    }[] = [];
    const root: Record<string, unknown> = {};
    stack.push({ obj: root, indent: -1 });

    function parseValue(v: string): unknown {
        v = v.trim();
        if (v === "true") return true;
        if (v === "false") return false;
        if (v === "null" || v === "~") return null;
        if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
        if (
            (v.startsWith('"') && v.endsWith('"')) ||
            (v.startsWith("'") && v.endsWith("'"))
        )
            return v.slice(1, -1);
        return v;
    }

    for (const line of lines) {
        if (line.trim() === "" || line.trim().startsWith("#")) continue;
        const indent = line.search(/\S/);
        const trimmed = line.trim();

        while (stack.length > 1 && stack[stack.length - 1].indent >= indent)
            stack.pop();

        const parent = stack[stack.length - 1].obj;

        if (trimmed.startsWith("- ")) {
            const val = parseValue(trimmed.slice(2));
            if (Array.isArray(parent)) parent.push(val);
        } else if (trimmed.includes(": ")) {
            const colon = trimmed.indexOf(": ");
            const key = trimmed.slice(0, colon);
            const val = trimmed.slice(colon + 2);
            if (val === "" || val === "|" || val === ">") {
                const newObj: Record<string, unknown> = {};
                if (Array.isArray(parent)) parent.push(newObj);
                else (parent as Record<string, unknown>)[key] = newObj;
                stack.push({ obj: newObj, indent });
            } else {
                if (!Array.isArray(parent))
                    (parent as Record<string, unknown>)[key] = parseValue(val);
            }
        } else if (trimmed.endsWith(":")) {
            const key = trimmed.slice(0, -1);
            const newObj: Record<string, unknown> = {};
            if (!Array.isArray(parent))
                (parent as Record<string, unknown>)[key] = newObj;
            stack.push({ obj: newObj, indent });
        }
    }
    return root;
}

function objToYaml(obj: unknown, indent = 0): string {
    const pad = "  ".repeat(indent);
    if (obj === null) return "null";
    if (typeof obj === "boolean" || typeof obj === "number") return String(obj);
    if (typeof obj === "string") {
        if (obj.includes("\n") || obj.includes(":") || obj.includes("#"))
            return `"${obj.replace(/"/g, '\\"')}"`;
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((v) => `\n${pad}- ${objToYaml(v, indent + 1)}`).join("");
    }
    if (typeof obj === "object") {
        return Object.entries(obj as Record<string, unknown>)
            .map(([k, v]) => {
                if (typeof v === "object" && v !== null && !Array.isArray(v)) {
                    return `\n${pad}${k}:${objToYaml(v, indent + 1)}`;
                }
                if (Array.isArray(v))
                    return `\n${pad}${k}:${objToYaml(v, indent + 1)}`;
                return `\n${pad}${k}: ${objToYaml(v, indent + 1)}`;
            })
            .join("");
    }
    return String(obj);
}

export default function YamlPage() {
    const [mode, setMode] = useState<"y2j" | "j2y">("y2j");
    const [input, setInput] = useState(
        `name: MY\nversion: 1.0\nfeatures:\n  - upload\n  - share\ndatabase:\n  type: sqlite\n  path: ./dev.db`,
    );
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const output = useMemo(() => {
        try {
            setError("");
            if (mode === "y2j") {
                const obj = yamlToObj(input);
                return JSON.stringify(obj, null, 2);
            } else {
                const obj = JSON.parse(input);
                return objToYaml(obj).trim();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "변환 오류");
            return "";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, input]);

    function copy() {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <main className="max-w-5xl mx-auto px-8 py-16 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">YAML ↔ JSON 변환</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode("y2j")}
                        className={`text-sm px-4 py-2 rounded border transition-colors ${mode === "y2j" ? "border-zinc-300 text-zinc-100" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                    >
                        YAML → JSON
                    </button>
                    <button
                        onClick={() => setMode("j2y")}
                        className={`text-sm px-4 py-2 rounded border transition-colors ${mode === "j2y" ? "border-zinc-300 text-zinc-100" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                    >
                        JSON → YAML
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                        입력 ({mode === "y2j" ? "YAML" : "JSON"})
                    </p>
                    <textarea
                        className="w-full h-96 bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:border-zinc-500 resize-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                            출력 ({mode === "y2j" ? "JSON" : "YAML"})
                        </p>
                        <button
                            onClick={copy}
                            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            {copied ? "✓" : "복사"}
                        </button>
                    </div>
                    {error ? (
                        <p className="text-red-400 text-sm p-4">{error}</p>
                    ) : (
                        <pre className="h-96 overflow-auto bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap">
                            {output}
                        </pre>
                    )}
                </div>
            </div>
        </main>
    );
}
