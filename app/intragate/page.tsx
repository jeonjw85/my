"use client";

import { useState, useEffect, useRef } from "react";

export default function IntragatePage() {
    const [status, setStatus] = useState<"idle" | "trying" | "ok" | "fail">(
        "idle",
    );
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    function launch() {
        setStatus("trying");

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        const start = Date.now();

        const onBlur = () => {
            cleanup();
            setStatus("ok");
        };

        const cleanup = () => {
            window.removeEventListener("blur", onBlur);
            if (document.body.contains(iframe))
                document.body.removeChild(iframe);
            if (timerRef.current) clearTimeout(timerRef.current);
        };

        window.addEventListener("blur", onBlur);

        try {
            iframe.contentWindow!.location.href = "intra://open";
        } catch {
            window.location.href = "intra://open";
        }

        timerRef.current = setTimeout(() => {
            cleanup();
            if (Date.now() - start >= 2400) setStatus("fail");
        }, 2500);
    }

    return (
        <main className="max-w-xl mx-auto px-8 py-16 space-y-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">내부망 접속</h1>
                <p className="text-sm text-zinc-500">intragate 프로토콜</p>
            </div>

            <div className="rounded border border-zinc-800 p-8 flex flex-col items-center gap-6">
                <p className="text-sm font-mono text-zinc-500">intra://open</p>

                <button
                    onClick={launch}
                    disabled={status === "trying"}
                    className="px-10 py-4 text-base rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                >
                    {status === "trying" ? "접속 중..." : "접속"}
                </button>

                {status === "ok" && (
                    <p className="text-emerald-400 text-sm">
                        intragate가 실행완료
                    </p>
                )}
                {status === "fail" && (
                    <div className="text-center space-y-1">
                        <p className="text-red-400 text-sm">
                            intragate 실행 실패
                        </p>
                        <p className="text-zinc-600 text-xs">
                            IntraGate가 설치되어 있지 않음 또는 프로토콜 핸들러
                            등록 실패
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
