import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

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

    // Validate URL - only allow http/https
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return NextResponse.json(
            { error: "유효하지 않은 URL" },
            { status: 400 },
        );
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
            { error: "HTTP/HTTPS URL만 허용됩니다." },
            { status: 400 },
        );
    }
    // Block internal/private IP ranges
    const hostname = parsedUrl.hostname;
    if (
        /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|localhost$|::1$)/i.test(
            hostname,
        )
    ) {
        return NextResponse.json(
            { error: "내부 네트워크 주소는 허용되지 않습니다." },
            { status: 403 },
        );
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
        const res = await fetch(url, {
            method: method || "GET",
            headers,
            body:
                method !== "GET" && method !== "HEAD" && body
                    ? body
                    : undefined,
            redirect: "follow",
            signal: AbortSignal.timeout(15000),
        });
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
