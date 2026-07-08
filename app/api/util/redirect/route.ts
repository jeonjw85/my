import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPublicHttpUrl, SsrfBlockedError } from "@/lib/ssrf";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url).searchParams.get("url");
    if (!url)
        return NextResponse.json(
            { error: "유효한 URL(http/https) 필요" },
            { status: 400 },
        );

    const chain: { url: string; status: number; statusText: string }[] = [];
    let current = url;

    for (let i = 0; i < 12; i++) {
        try {

            await assertPublicHttpUrl(current);

            const res = await fetch(current, {
                redirect: "manual",
                signal: AbortSignal.timeout(6000),
            });
            chain.push({
                url: current,
                status: res.status,
                statusText: res.statusText,
            });
            if (res.status >= 300 && res.status < 400) {
                const loc = res.headers.get("location");
                if (!loc) break;
                current = loc.startsWith("http")
                    ? loc
                    : new URL(loc, current).href;
            } else {
                break;
            }
        } catch (e) {
            chain.push({
                url: current,
                status: 0,
                statusText:
                    e instanceof SsrfBlockedError
                        ? e.message
                        : (e as Error).message,
            });
            break;
        }
    }

    return NextResponse.json(chain);
}
