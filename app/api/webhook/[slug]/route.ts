import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function handle(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;
    const endpoint = await prisma.webhookEndpoint.findUnique({
        where: { slug },
    });
    if (!endpoint)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        "unknown";

    const headersObj: Record<string, string> = {};
    request.headers.forEach((v, k) => (headersObj[k] = v));

    let body = "";
    try {
        body = await request.text();
    } catch {}
    if (body.length > 10000) body = body.slice(0, 10000) + "\n... [truncated]";

    await prisma.webhookRequest.create({
        data: {
            endpointId: endpoint.id,
            method: request.method,
            headers: JSON.stringify(headersObj),
            body,
            ip,
        },
    });

    return NextResponse.json({ ok: true });
}

export {
    handle as GET,
    handle as POST,
    handle as PUT,
    handle as PATCH,
    handle as DELETE,
};
