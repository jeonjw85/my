"use client";

import Link from "next/link";

const TOOLS = [
    {
        href: "/util/jwt",
        title: "JWT 디코더",
        desc: "토큰 붙여넣기 → header/payload 파싱, 만료 확인",
    },
    {
        href: "/util/base64",
        title: "Base64 인코더/디코더",
        desc: "텍스트 ↔ Base64 변환",
    },
    {
        href: "/util/url",
        title: "URL 인코더/디코더",
        desc: "퍼센트 인코딩 ↔ 일반 텍스트",
    },
    {
        href: "/util/json",
        title: "JSON 포매터",
        desc: "JSON 포매팅 · 미니파이 · 검증",
    },
    {
        href: "/util/hash",
        title: "Hash 생성",
        desc: "SHA-1 / SHA-256 / SHA-384 / SHA-512",
    },
    {
        href: "/util/timestamp",
        title: "타임스탬프 변환기",
        desc: "Unix 타임스탬프 ↔ 날짜/시간",
    },
    {
        href: "/util/uuid",
        title: "UUID 생성기",
        desc: "v4 UUID 일괄 생성",
    },
    {
        href: "/util/color",
        title: "색상 코드 변환",
        desc: "HEX ↔ RGB ↔ HSL",
    },
    {
        href: "/util/regex",
        title: "정규식 테스터",
        desc: "패턴 + 텍스트 → 실시간 매칭 하이라이팅",
    },
    {
        href: "/util/diff",
        title: "텍스트 Diff",
        desc: "두 텍스트 줄 단위 비교",
    },
    {
        href: "/util/markdown",
        title: "Markdown 미리보기",
        desc: "마크다운 실시간 렌더링",
    },
    {
        href: "/util/redirect",
        title: "리다이렉트 추적기",
        desc: "URL이 어디어디 거쳐 최종 도착하는지 체인 조회",
    },
    {
        href: "/util/dns",
        title: "DNS 조회",
        desc: "도메인 → A, AAAA, MX, TXT, NS, CNAME 레코드",
    },
    {
        href: "/util/ssl",
        title: "SSL 인증서 확인",
        desc: "도메인 → 발급자, 만료일, SAN 목록, 지문",
    },
    {
        href: "/util/webhook",
        title: "웹훅 수신기",
        desc: "고유 URL 생성 → 외부 POST 수신 → 요청 내역 조회",
    },
    {
        href: "/util/onetimememo",
        title: "일회성 메모",
        desc: "텍스트 → 링크 생성 → 한 번 열면 영구 삭제",
    },
    {
        href: "/util/password",
        title: "패스워드 생성기",
        desc: "길이/문자셋 설정 → 랜덤 패스워드 생성",
    },
    {
        href: "/util/commands",
        title: "명령어 북마크",
        desc: "자주 쓰는 터미널 명령어 저장 + 원클릭 복사",
    },
    {
        href: "/util/snippet",
        title: "코드 스니펫",
        desc: "코드 저장 + 언어 태그 + 원클릭 복사",
    },
    {
        href: "/util/image",
        title: "이미지 즉시 공유",
        desc: "클립보드 붙여넣기(Ctrl+V) → 업로드 → 링크 복사",
    },
    {
        href: "/util/shorturl",
        title: "단축 URL",
        desc: "긴 URL을 짧은 코드로 단축 + 클릭 수 집계",
    },
    {
        href: "/util/envstore",
        title: "환경변수 저장소",
        desc: ".env 파일 내용 이름별 저장 + 원클릭 전체 복사",
    },
    {
        href: "/util/numberbase",
        title: "진법 변환기",
        desc: "2 / 8 / 10 / 16진수 상호 변환",
    },
    {
        href: "/util/cron",
        title: "Cron 파서",
        desc: "Cron 표현식 설명 + 다음 5회 실행 시간 계산",
    },
    {
        href: "/util/yaml",
        title: "YAML ↔ JSON",
        desc: "YAML과 JSON 양방향 변환",
    },
    {
        href: "/util/qr",
        title: "QR 코드 생성기",
        desc: "텍스트/URL → QR 코드 생성 + SVG 다운로드",
    },
    {
        href: "/util/httpclient",
        title: "HTTP 클라이언트",
        desc: "브라우저에서 직접 HTTP 요청 테스트 (CORS 우회)",
    },
    {
        href: "/util/ip",
        title: "IP 정보 조회",
        desc: "내 IP 또는 입력 IP의 위치·ISP·시간대 조회",
    },
    {
        href: "/util/lorem",
        title: "Lorem Ipsum 생성기",
        desc: "단어 / 문장 / 단락 단위로 더미 텍스트 생성",
    },
    {
        href: "/util/units",
        title: "단위 변환기",
        desc: "길이·무게·온도·데이터·속도·넓이 변환",
    },
    {
        href: "/util/pdf",
        title: "PDF 잠금 해제",
        desc: "인쇄·복사 제한이 걸린 PDF의 권한 제한 제거",
    },
    {
        href: "/util/encrypt",
        title: "텍스트 암호화",
        desc: "AES-256-GCM으로 텍스트 암호화 / 복호화 (브라우저 전용)",
    },
    {
        href: "/util/serverstatus",
        title: "서버 상태",
        desc: "CPU · 메모리 · 업타임 · 파일 저장소 현황",
    },
];

export default function UtilPage() {
    return (
        <main className="max-w-3xl mx-auto px-8 py-16 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">유틸</h1>
                <Link
                    href="/"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    홈
                </Link>
            </div>

            <div className="grid gap-3">
                {TOOLS.map((t) => (
                    <Link
                        key={t.href}
                        href={t.href}
                        className="flex items-center justify-between px-5 py-4 rounded border border-zinc-800 hover:border-zinc-600 transition-colors group"
                    >
                        <div>
                            <p className="text-base text-zinc-200 group-hover:text-white transition-colors">
                                {t.title}
                            </p>
                            <p className="text-sm text-zinc-500 mt-0.5">
                                {t.desc}
                            </p>
                        </div>
                        <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-lg">
                            →
                        </span>
                    </Link>
                ))}
            </div>
        </main>
    );
}
