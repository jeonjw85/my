"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

type Message = {
    id: string;
    author: string;
    content: string;
    createdAt: string;
};

type MsgGroup = {
    author: string;
    msgs: Message[];
    startTime: string;
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });
}

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (diff < 60000) return "방금";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    return new Date(iso).toLocaleDateString("ko-KR");
}

// Consecutive messages from same author within 5 min → single group
function buildDateGroups(
    messages: Message[],
): { date: string; groups: MsgGroup[] }[] {
    const dateGroups: { date: string; groups: MsgGroup[] }[] = [];
    for (const msg of messages) {
        const date = formatDate(msg.createdAt);
        let dg = dateGroups.find((d) => d.date === date);
        if (!dg) {
            dg = { date, groups: [] };
            dateGroups.push(dg);
        }
        const last = dg.groups[dg.groups.length - 1];
        const sameAuthor = last?.author === msg.author;
        const closeTime =
            last &&
            new Date(msg.createdAt).getTime() -
                new Date(last.msgs[last.msgs.length - 1].createdAt).getTime() <
                5 * 60_000;
        if (last && sameAuthor && closeTime) {
            last.msgs.push(msg);
        } else {
            dg.groups.push({
                author: msg.author,
                msgs: [msg],
                startTime: msg.createdAt,
            });
        }
    }
    return dateGroups;
}

export default function TeamChannelPage() {
    const { data: session, status } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [author, setAuthor] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [connected, setConnected] = useState(false);
    const [atBottom, setAtBottom] = useState(true);
    const [newCount, setNewCount] = useState(0);

    const lastRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const atBottomRef = useRef(true);

    // Init nickname: session name → localStorage → ""
    useEffect(() => {
        if (session?.user?.name) {
            setAuthor(session.user.name);
        } else {
            setAuthor(localStorage.getItem("tc_author") ?? "");
        }
    }, [session]);

    // Initial load
    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/team/messages")
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: Message[]) => {
                setMessages(data);
                if (data.length > 0)
                    lastRef.current = data[data.length - 1].createdAt;
                setConnected(true);
                setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
            })
            .catch(() => setConnected(false));
    }, [status]);

    // Polling every 2s
    useEffect(() => {
        if (status !== "authenticated") return;
        const id = setInterval(async () => {
            try {
                const url = lastRef.current
                    ? `/api/team/messages?after=${encodeURIComponent(lastRef.current)}`
                    : "/api/team/messages";
                const r = await fetch(url);
                if (!r.ok) {
                    setConnected(false);
                    return;
                }
                const data: Message[] = await r.json();
                setConnected(true);
                if (data.length === 0) return;
                lastRef.current = data[data.length - 1].createdAt;
                setMessages((prev) => [...prev, ...data]);
                if (atBottomRef.current) {
                    setTimeout(
                        () =>
                            bottomRef.current?.scrollIntoView({
                                behavior: "smooth",
                            }),
                        50,
                    );
                } else {
                    setNewCount((n) => n + data.length);
                }
            } catch {
                setConnected(false);
            }
        }, 2000);
        return () => clearInterval(id);
    }, [status]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const isAtBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        atBottomRef.current = isAtBottom;
        setAtBottom(isAtBottom);
        if (isAtBottom) setNewCount(0);
    }, []);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setNewCount(0);
        setAtBottom(true);
        atBottomRef.current = true;
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;
        setSending(true);
        setError("");
        const res = await fetch("/api/team/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: text,
                author: author.trim() || undefined,
            }),
        });
        if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? "전송 실패");
            setSending(false);
            return;
        }
        const msg: Message = await res.json();
        setMessages((prev) => [...prev, msg]);
        lastRef.current = msg.createdAt;
        setInput("");
        setSending(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            50,
        );
        textareaRef.current?.focus();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/team/messages?id=${id}`, { method: "DELETE" });
        setMessages((prev) => prev.filter((m) => m.id !== id));
    };

    const saveAuthor = (val: string) => {
        setAuthor(val);
        localStorage.setItem("tc_author", val);
    };

    // ─── Auth states ─────────────────────────────────────────────────────────
    if (status === "loading") {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-zinc-500 text-sm">로딩 중...</p>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-6 px-4">
                <div className="text-center space-y-2">
                    <p className="text-2xl font-bold">팀 채널</p>
                    <p className="text-sm text-zinc-400">
                        팀 채널을 이용하려면 로그인이 필요합니다.
                    </p>
                </div>
                <button
                    onClick={() => signIn()}
                    className="px-8 py-2.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                >
                    로그인
                </button>
                <Link
                    href="/"
                    className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                    홈으로
                </Link>
            </div>
        );
    }

    // ─── Build display groups ─────────────────────────────────────────────────
    const dateGroups = buildDateGroups(messages);
    const isMe = (a: string) => !!author && a === author;

    return (
        <main
            className="max-w-3xl mx-auto px-4 flex flex-col"
            style={{
                height: "100dvh",
                paddingTop: "1.25rem",
                paddingBottom: "1rem",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold">팀 채널</h1>
                    <span
                        className={`w-2 h-2 rounded-full transition-colors ${connected ? "bg-emerald-500" : "bg-zinc-600"}`}
                        title={connected ? "연결됨" : "연결 끊김"}
                    />
                    {messages.length > 0 && (
                        <span className="text-xs text-zinc-600">
                            {messages.length}개
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="닉네임"
                        value={author}
                        onChange={(e) => saveAuthor(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-28"
                    />
                    <Link
                        href="/"
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        홈
                    </Link>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto py-4 min-h-0"
            >
                {messages.length === 0 && connected && (
                    <p className="text-center text-zinc-600 text-sm mt-10">
                        첫 번째 메시지를 보내보세요!
                    </p>
                )}

                {dateGroups.map(({ date, groups }) => (
                    <div key={date}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-zinc-800" />
                            <span className="text-xs text-zinc-600 shrink-0">
                                {date}
                            </span>
                            <div className="flex-1 h-px bg-zinc-800" />
                        </div>

                        <div className="space-y-3">
                            {groups.map((g, gi) => {
                                const mine = isMe(g.author);
                                return (
                                    <div
                                        key={`${g.startTime}-${gi}`}
                                        className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}
                                    >
                                        {/* Author + relative time */}
                                        <div
                                            className={`flex items-baseline gap-1.5 px-1 ${mine ? "flex-row-reverse" : ""}`}
                                        >
                                            <span
                                                className={`text-xs font-semibold ${mine ? "text-zinc-300" : "text-zinc-400"}`}
                                            >
                                                {g.author}
                                            </span>
                                            <span
                                                className="text-xs text-zinc-700 cursor-default"
                                                title={new Date(
                                                    g.startTime,
                                                ).toLocaleString("ko-KR")}
                                            >
                                                {relativeTime(g.startTime)}
                                            </span>
                                        </div>

                                        {/* Message bubbles */}
                                        {g.msgs.map((msg, mi) => {
                                            const isFirst = mi === 0;
                                            const isLast =
                                                mi === g.msgs.length - 1;
                                            const radius = mine
                                                ? `rounded-2xl ${isFirst ? "rounded-tr-sm" : ""} ${!isLast ? "rounded-br-md" : ""}`
                                                : `rounded-2xl ${isFirst ? "rounded-tl-sm" : ""} ${!isLast ? "rounded-bl-md" : ""}`;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`group flex items-end gap-1 ${mine ? "flex-row-reverse" : ""}`}
                                                >
                                                    <div
                                                        className={`max-w-[72%] px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed ${radius} ${
                                                            mine
                                                                ? "bg-zinc-600 text-white"
                                                                : "bg-zinc-800 text-zinc-100"
                                                        }`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(msg.id)
                                                        }
                                                        className="text-xs text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 mb-1 shrink-0"
                                                        title="삭제"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom pill */}
            {!atBottom && (
                <div className="flex justify-center pb-2 shrink-0">
                    <button
                        onClick={scrollToBottom}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors border border-zinc-700"
                    >
                        {newCount > 0 && (
                            <span className="bg-zinc-500 rounded-full px-1.5 leading-5 text-white text-xs">
                                {newCount}
                            </span>
                        )}
                        새 메시지 ↓
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="shrink-0 pt-3 border-t border-zinc-800">
                {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            placeholder="메시지 입력... (Shift+Enter: 줄바꿈)"
                            value={input}
                            maxLength={2000}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height =
                                    Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none overflow-hidden"
                            style={{ minHeight: "42px" }}
                        />
                        {input.length > 1800 && (
                            <span
                                className={`absolute bottom-2 right-3 text-xs pointer-events-none ${input.length >= 1990 ? "text-red-400" : "text-zinc-500"}`}
                            >
                                {input.length}/2000
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={sending || !input.trim()}
                        className="px-5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors disabled:opacity-40 shrink-0"
                        style={{ minHeight: "42px" }}
                    >
                        {sending ? "..." : "전송"}
                    </button>
                </div>
            </div>
        </main>
    );
}
