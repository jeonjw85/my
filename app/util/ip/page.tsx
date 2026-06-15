"use client";

import { useState, useEffect } from "react";

type IpInfo = Record<string, string | number | null>;

const FIELDS = [
    ["ip", "IP 주소"],
    ["city", "도시"],
    ["region", "지역"],
    ["country_name", "국가"],
    ["postal", "우편번호"],
    ["latitude", "위도"],
    ["longitude", "경도"],
    ["org", "ISP/기관"],
    ["timezone", "시간대"],
    ["currency", "화폐"],
];

export default function IpPage() {
    const [inputIp, setInputIp] = useState("");
    const [result, setResult] = useState<IpInfo | null>(null);
    const [myIp, setMyIp] = useState<IpInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/util/ip")
            .then((r) => r.json())
            .then((d) => setMyIp(d))
            .catch(() => {});
    }, []);

    async function lookup(ip?: string) {
        setLoading(true);
        setError("");
        setResult(null);
        const url = ip
            ? `/api/util/ip?ip=${encodeURIComponent(ip)}`
            : "/api/util/ip";
        const res = await fetch(url);
        const data = await res.json();
        setLoading(false);
        if (!res.ok || data.error) {
            setError(data.error ?? "조회 실패");
            return;
        }
        setResult(data);
    }

    function InfoCard({ info, title }: { info: IpInfo; title: string }) {
        return (
            <div className="rounded border border-zinc-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-widest">
                    {title}
                </div>
                <div className="divide-y divide-zinc-900">
                    {FIELDS.map(
                        ([key, label]) =>
                            info[key] != null && (
                                <div key={key} className="flex px-5 py-2.5">
                                    <span className="text-xs text-zinc-500 w-28 shrink-0">
                                        {label}
                                    </span>
                                    <span className="text-sm font-mono text-zinc-300">
                                        {String(info[key])}
                                    </span>
                                </div>
                            ),
                    )}
                </div>
            </div>
        );
    }

    return (
        <main className="max-w-2xl mx-auto px-8 py-16 space-y-8">
            <h1 className="text-2xl font-bold">IP 정보 조회</h1>

            {myIp && (
                <InfoCard
                    info={myIp}
                    title={`내 IP: ${myIp.detectedIp ?? myIp.ip}`}
                />
            )}

            <div className="flex gap-2">
                <input
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-500"
                    placeholder="8.8.8.8 또는 IPv6 주소"
                    value={inputIp}
                    onChange={(e) => setInputIp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookup(inputIp)}
                />
                <button
                    onClick={() => lookup(inputIp)}
                    disabled={loading || !inputIp.trim()}
                    className="px-5 py-2.5 text-sm rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
                >
                    {loading ? "조회 중..." : "조회"}
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {result && (
                <InfoCard info={result} title={`조회 결과: ${result.ip}`} />
            )}
        </main>
    );
}
