"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

type NavItem = {
    href: string;
    label: string;
};

const PUBLIC_NAV: NavItem[] = [
    { href: "/", label: "파일 공유" },
];

const AUTH_NAV: NavItem[] = [{ href: "/my", label: "내 저장소" }];

const UTIL_GROUPS: { title: string; items: NavItem[] }[] = [
    {
        title: "네트워크",
        items: [
            { href: "/util/redirect", label: "리다이렉트 추적" },
            { href: "/util/dns", label: "DNS 조회" },
            { href: "/util/ssl", label: "SSL 인증서" },
            { href: "/util/webhook", label: "웹훅 수신기" },
            { href: "/util/httpclient", label: "HTTP 클라이언트" },
            { href: "/util/ip", label: "IP 정보 조회" },
        ],
    },
    {
        title: "인코딩 · 변환",
        items: [
            { href: "/util/jwt", label: "JWT 디코더" },
            { href: "/util/base64", label: "Base64" },
            { href: "/util/url", label: "URL 인코더" },
            { href: "/util/json", label: "JSON 포매터" },
            { href: "/util/hash", label: "Hash 생성" },
            { href: "/util/timestamp", label: "타임스탬프" },
            { href: "/util/uuid", label: "UUID 생성기" },
            { href: "/util/color", label: "색상 변환" },
            { href: "/util/numberbase", label: "진법 변환기" },
            { href: "/util/yaml", label: "YAML ↔ JSON" },
        ],
    },
    {
        title: "텍스트",
        items: [
            { href: "/util/regex", label: "정규식 테스터" },
            { href: "/util/diff", label: "텍스트 Diff" },
            { href: "/util/markdown", label: "Markdown 미리보기" },
            { href: "/util/lorem", label: "Lorem Ipsum" },
        ],
    },
    {
        title: "저장",
        items: [
            { href: "/util/onetimememo", label: "일회성 메모" },
            { href: "/util/commands", label: "명령어 북마크" },
            { href: "/util/snippet", label: "코드 스니펫" },
            { href: "/util/image", label: "이미지 공유" },
            { href: "/util/shorturl", label: "단축 URL" },
            { href: "/util/envstore", label: "환경변수 저장소" },
        ],
    },
    {
        title: "생성",
        items: [
            { href: "/util/password", label: "패스워드 생성기" },
            { href: "/util/qr", label: "QR 코드 생성" },
            { href: "/util/units", label: "단위 변환기" },
            { href: "/util/cron", label: "Cron 파서" },
        ],
    },
    {
        title: "파일 · PDF",
        items: [{ href: "/util/pdf", label: "PDF 잠금 해제" }],
    },
    {
        title: "보안 · 시스템",
        items: [
            { href: "/util/encrypt", label: "텍스트 암호화" },
            { href: "/util/serverstatus", label: "서버 상태" },
        ],
    },
];

const ADMIN_NAV: NavItem[] = [
    { href: "/admin", label: "관리자 패널" },
    { href: "/admin/logs", label: "접속 로그" },
];

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [utilOpen, setUtilOpen] = useState(pathname.startsWith("/util"));
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    const closeMenu = () => {
        setMenuOpen(false);
    };

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape") {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    const isActive = (href: string) => pathname === href;

    const linkCls = (href: string) =>
        `block px-3 py-1.5 rounded text-sm transition-colors truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 ${
            isActive(href)
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
        }`;

    const sidebarInner = (
        <>
            {/* Desktop logo */}
            <div className="hidden md:block px-4 py-5 border-b border-zinc-800 shrink-0">
                <Link
                    href="/"
                    className="text-lg font-bold tracking-tight text-zinc-100 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 rounded"
                >
                    MY
                </Link>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {PUBLIC_NAV.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={linkCls(item.href)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        onClick={closeMenu}
                    >
                        {item.label}
                    </Link>
                ))}

                {session && (
                    <>
                        <div className="pt-3" />
                        {AUTH_NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={linkCls(item.href)}
                                aria-current={
                                    isActive(item.href) ? "page" : undefined
                                }
                                onClick={closeMenu}
                            >
                                {item.label}
                            </Link>
                        ))}

                        <div className="pt-3" />
                        <button
                            onClick={() => setUtilOpen((v) => !v)}
                            aria-expanded={utilOpen}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                        >
                            <span>유틸</span>
                            <span className="text-xs">
                                {utilOpen ? "▾" : "▸"}
                            </span>
                        </button>

                        {utilOpen && (
                            <div className="space-y-3 pt-1">
                                {UTIL_GROUPS.map((group) => (
                                    <div key={group.title}>
                                        <p className="px-3 py-1 text-xs text-zinc-600 uppercase tracking-widest">
                                            {group.title}
                                        </p>
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={linkCls(item.href)}
                                                aria-current={
                                                    isActive(item.href)
                                                        ? "page"
                                                        : undefined
                                                }
                                                onClick={closeMenu}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-3" />
                        <p className="px-3 py-1 text-xs text-zinc-600 uppercase tracking-widest">
                            관리
                        </p>
                        {ADMIN_NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={linkCls(item.href)}
                                aria-current={
                                    isActive(item.href) ? "page" : undefined
                                }
                                onClick={closeMenu}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </>
                )}
            </nav>

            {session && (
                <div className="px-2 py-3 border-t border-zinc-800 shrink-0">
                    <div className="space-y-1">
                        <p className="px-3 text-xs text-zinc-600 truncate">
                            {session.user?.email}
                        </p>
                        <button
                            onClick={() => signOut()}
                            className="w-full text-left px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <header className="fixed top-0 inset-x-0 h-14 z-50 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 md:hidden">
                <button
                    ref={menuButtonRef}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                    aria-controls="mobile-sidebar"
                    className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 rounded"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                    >
                        <path d="M3 5h14M3 10h14M3 15h14" />
                    </svg>
                    <span className="sr-only">
                        {menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                    </span>
                </button>
                <Link
                    href="/"
                    className="ml-3 text-lg font-bold tracking-tight text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 rounded"
                >
                    MY
                </Link>
            </header>

            {/* Sidebar */}
            <aside
                id="mobile-sidebar"
                className={`fixed left-0 w-52 flex-col bg-zinc-950 border-r border-zinc-800 z-40 overflow-y-auto ${
                    menuOpen
                        ? "top-14 h-[calc(100dvh-3.5rem)] flex md:top-0 md:h-dvh"
                        : "hidden md:top-0 md:h-dvh md:flex"
                }`}
            >
                {sidebarInner}
            </aside>
        </>
    );
}
