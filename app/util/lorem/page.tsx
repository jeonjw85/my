"use client";

import { useState } from "react";

const LOREM_WORDS = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
    "enim",
    "ad",
    "minim",
    "veniam",
    "quis",
    "nostrud",
    "exercitation",
    "ullamco",
    "laboris",
    "nisi",
    "aliquip",
    "ex",
    "ea",
    "commodo",
    "consequat",
    "duis",
    "aute",
    "irure",
    "in",
    "reprehenderit",
    "voluptate",
    "velit",
    "esse",
    "cillum",
    "fugiat",
    "nulla",
    "pariatur",
    "excepteur",
    "sint",
    "occaecat",
    "cupidatat",
    "non",
    "proident",
    "sunt",
    "culpa",
    "qui",
    "officia",
    "deserunt",
    "mollit",
    "anim",
    "id",
    "est",
    "laborum",
    "curabitur",
    "pretium",
    "tincidunt",
    "lacus",
    "nec",
    "blandit",
    "luctus",
    "volutpat",
    "venenatis",
    "ornare",
    "purus",
    "commodo",
    "accumsan",
    "risus",
    "vitae",
    "erat",
    "fringilla",
    "placerat",
    "convallis",
    "diam",
];

function randomWord(exclude?: string) {
    let w = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
    while (w === exclude)
        w = LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
    return w;
}

function genWords(count: number, startClassic = false): string {
    const words: string[] = [];
    if (startClassic) words.push("Lorem", "ipsum", "dolor", "sit", "amet");
    while (words.length < count)
        words.push(randomWord(words[words.length - 1]));
    return words.join(" ");
}

function genSentence(wordCount = 8, first = false): string {
    const count = wordCount + Math.floor(Math.random() * 5);
    const words = genWords(count, first);
    return words.charAt(0).toUpperCase() + words.slice(1) + ".";
}

function genParagraph(sentences = 4, firstSentence = false): string {
    return Array.from({ length: sentences }, (_, i) =>
        genSentence(
            8 + Math.floor(Math.random() * 4),
            firstSentence && i === 0,
        ),
    ).join(" ");
}

export default function LoremPage() {
    const [type, setType] = useState<"words" | "sentences" | "paragraphs">(
        "paragraphs",
    );
    const [count, setCount] = useState(3);
    const [startClassic, setStartClassic] = useState(true);
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);

    function generate() {
        let result = "";
        if (type === "words") result = genWords(count, startClassic);
        else if (type === "sentences")
            result = Array.from({ length: count }, (_, i) =>
                genSentence(8, startClassic && i === 0),
            ).join(" ");
        else
            result = Array.from({ length: count }, (_, i) =>
                genParagraph(
                    4 + Math.floor(Math.random() * 2),
                    startClassic && i === 0,
                ),
            ).join("\n\n");
        setOutput(result);
    }

    function copy() {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">Lorem Ipsum 생성기</h1>

            <div className="rounded border border-zinc-800 p-5 space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500">타입</label>
                        <select
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                            value={type}
                            onChange={(e) =>
                                setType(e.target.value as typeof type)
                            }
                        >
                            <option value="words">단어</option>
                            <option value="sentences">문장</option>
                            <option value="paragraphs">단락</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500">개수</label>
                        <input
                            type="number"
                            min={1}
                            max={500}
                            className="w-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                            value={count}
                            onChange={(e) =>
                                setCount(Math.max(1, Number(e.target.value)))
                            }
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={startClassic}
                            onChange={(e) => setStartClassic(e.target.checked)}
                            className="accent-zinc-400"
                        />
                        Lorem ipsum으로 시작
                    </label>
                    <button
                        onClick={generate}
                        className="px-5 py-2.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                    >
                        생성
                    </button>
                </div>
            </div>

            {output && (
                <div className="space-y-2">
                    <div className="flex justify-end">
                        <button
                            onClick={copy}
                            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            {copied ? "✓ 복사됨" : "복사"}
                        </button>
                    </div>
                    <pre className="rounded border border-zinc-800 p-5 text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {output}
                    </pre>
                </div>
            )}
        </main>
    );
}
