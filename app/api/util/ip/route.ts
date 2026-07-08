import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const ipParam = request.nextUrl.searchParams.get("ip");

    if (ipParam) {
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Pattern = /^[0-9a-fA-F:]+$/;
        if (!ipv4Pattern.test(ipParam) && !ipv6Pattern.test(ipParam)) {
            return NextResponse.json(
                { error: "유효하지 않은 IP 주소" },
                { status: 400 },
            );
        }

        try {
            const res = await fetch(
                `https://ipapi.co/${encodeURIComponent(ipParam)}/json/`,
                {
                    headers: { "User-Agent": "my-app/1.0" },
                    signal: AbortSignal.timeout(8000),
                },
            );
            const data = await res.json();
            if (data.error)
                return NextResponse.json(
                    { error: data.reason ?? "조회 실패" },
                    { status: 400 },
                );
            return NextResponse.json(data);
        } catch {
            return NextResponse.json(
                { error: "IP 정보 조회 실패" },
                { status: 500 },
            );
        }
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() ?? realIp ?? "알 수 없음";

    if (ip !== "알 수 없음" && ip !== "::1" && ip !== "127.0.0.1") {
        try {
            const res = await fetch(
                `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
                {
                    headers: { "User-Agent": "my-app/1.0" },
                    signal: AbortSignal.timeout(8000),
                },
            );
            const data = await res.json();
            return NextResponse.json({ ...data, detectedIp: ip });
        } catch {
            // fall through
        }
    }
    return NextResponse.json({ detectedIp: ip, ip });
}
