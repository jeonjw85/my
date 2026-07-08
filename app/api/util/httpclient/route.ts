import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertPublicHttpUrl, SsrfBlockedError } from "@/lib/ssrf";

const MAX_REDIRECTS = 5;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
        url,
        method,
        headers: rawHeaders,
        body,
    } = (await request.json()) as {
        url?: string;
        method?: string;
        headers?: string;
        body?: string;
    };

    if (!url)
        return NextResponse.json({ error: "URL required" }, { status: 400 });

    try {
        await assertPublicHttpUrl(url);
    } catch (e) {
        if (e instanceof SsrfBlockedError)
            return NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
    }

    const headers: Record<string, string> = {};
    if (rawHeaders?.trim()) {
        for (const line of rawHeaders.split("\n")) {
            const idx = line.indexOf(":");
            if (idx > 0) {
                headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
        }
    }

    const start = Date.now();
    try {
        let currentUrl = url;
        let res: Response;

        for (let i = 0; ; i++) {
            res = await fetch(currentUrl, {
                method: method || "GET",
                headers,
                body:
                    method !== "GET" && method !== "HEAD" && body
                        ? body
                        : undefined,
                redirect: "manual",
                signal: AbortSignal.timeout(15000),
            });

            const isRedirect = res.status >= 300 && res.status < 400;
            const location = res.headers.get("location");
            if (!isRedirect || !location) break;
            if (i >= MAX_REDIRECTS) {
                return NextResponse.json(
                    { error: "리다이렉트 횟수 초과" },
                    { status: 400 },
                );
            }
            currentUrl = new URL(location, currentUrl).href;
            try {
                await assertPublicHttpUrl(currentUrl);
            } catch (e) {
                if (e instanceof SsrfBlockedError)
                    return NextResponse.json(
                        { error: e.message },
                        { status: 400 },
                    );
                throw e;
            }
        }
        const elapsed = Date.now() - start;
        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => {
            resHeaders[k] = v;
        });

        const contentType = res.headers.get("content-type") ?? "";
        let responseBody = "";
        if (
            contentType.includes("text") ||
            contentType.includes("json") ||
            contentType.includes("xml") ||
            contentType.includes("javascript")
        ) {
            responseBody = await res.text();
            if (responseBody.length > 50000)
                responseBody =
                    responseBody.slice(0, 50000) + "\n\n[50000자 이상 잘림]";
        } else {
            responseBody = `[바이너리 응답: ${contentType}]`;
        }

        return NextResponse.json({
            status: res.status,
            statusText: res.statusText,
            headers: resHeaders,
            body: responseBody,
            elapsed,
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "요청 실패" },
            { status: 500 },
        );
    }
}
