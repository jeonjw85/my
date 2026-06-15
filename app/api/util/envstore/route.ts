import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const envs = await prisma.envStore.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(envs);
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { name, content } = (await request.json()) as {
        name?: string;
        content?: string;
    };
    if (!name?.trim())
        return NextResponse.json(
            { error: "이름을 입력하세요." },
            { status: 400 },
        );
    const env = await prisma.envStore.create({
        data: { name: name.trim(), content: content ?? "" },
    });
    return NextResponse.json(env, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, name, content } = (await request.json()) as {
        id?: string;
        name?: string;
        content?: string;
    };
    if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });
    const env = await prisma.envStore.update({
        where: { id },
        data: { name: name?.trim(), content },
    });
    return NextResponse.json(env);
}

export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = (await request.json()) as { id?: string };
    if (!id)
        return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.envStore.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
