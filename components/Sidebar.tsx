"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type NavItem = {
    href: string;
    label: string;
};

const PUBLIC_NAV: NavItem[] = [
    { href: "/", label: "파일 공유" },
    { href: "/share", label: "팀 저장소" },
    { href: "/team", label: "팀 채널" },
    { href: "/intragate", label: "내부망 접속" },
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

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    const linkCls = (href: string) =>
        `block px-3 py-1.5 rounded text-sm transition-colors truncate ${
            isActive(href)
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
        }`;

    return (
        <aside className="fixed top-0 left-0 h-screen w-52 flex flex-col bg-zinc-950 border-r border-zinc-800 z-40 overflow-y-auto">
            {/* Logo */}
            <div className="px-4 py-5 border-b border-zinc-800 shrink-0">
                <Link
                    href="/"
                    className="text-lg font-bold tracking-tight text-zinc-100 hover:text-white transition-colors"
                >
                    vault
                </Link>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {/* Public */}
                {PUBLIC_NAV.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={linkCls(item.href)}
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
                            >
                                {item.label}
                            </Link>
                        ))}

                        {/* Util section */}
                        <div className="pt-3" />
                        <button
                            onClick={() => setUtilOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded"
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
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Admin */}
                        <div className="pt-3" />
                        <p className="px-3 py-1 text-xs text-zinc-600 uppercase tracking-widest">
                            관리
                        </p>
                        {ADMIN_NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={linkCls(item.href)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </>
                )}
            </nav>

            {/* Bottom: login/out */}
            <div className="px-2 py-3 border-t border-zinc-800 shrink-0">
                {session ? (
                    <div className="space-y-1">
                        <p className="px-3 text-xs text-zinc-600 truncate">
                            {session.user?.email}
                        </p>
                        <button
                            onClick={() => signOut()}
                            className="w-full text-left px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                ) : (
                    <Link
                        href="/admin"
                        className="block px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors"
                    >
                        로그인
                    </Link>
                )}
            </div>
        </aside>
    );
}
