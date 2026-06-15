import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dns from "dns/promises";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const domain = new URL(request.url).searchParams.get("domain")?.trim();
    if (!domain)
        return NextResponse.json({ error: "도메인 필요" }, { status: 400 });

    const result: Record<string, unknown> = {};

    await Promise.allSettled([
        dns
            .resolve4(domain)
            .then((r) => (result.A = r))
            .catch(() => {}),
        dns
            .resolve6(domain)
            .then((r) => (result.AAAA = r))
            .catch(() => {}),
        dns
            .resolveMx(domain)
            .then((r) => (result.MX = r))
            .catch(() => {}),
        dns
            .resolveTxt(domain)
            .then((r) => (result.TXT = r.map((a) => a.join(" "))))
            .catch(() => {}),
        dns
            .resolveNs(domain)
            .then((r) => (result.NS = r))
            .catch(() => {}),
        dns
            .resolveCname(domain)
            .then((r) => (result.CNAME = r))
            .catch(() => {}),
    ]);

    if (Object.keys(result).length === 0)
        return NextResponse.json(
            { error: "조회 결과 없음 (도메인 확인 필요)" },
            { status: 404 },
        );

    return NextResponse.json(result);
}
