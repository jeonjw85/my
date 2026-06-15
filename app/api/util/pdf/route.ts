import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file)
        return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        return NextResponse.json(
            { error: "PDF 파일만 지원합니다" },
            { status: 400 },
        );
    }
    // Limit file size to 50MB
    if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
            { error: "파일 크기는 최대 50MB입니다" },
            { status: 400 },
        );
    }

    const bytes = await file.arrayBuffer();

    try {
        // Try without password first
        let pdfDoc: PDFDocument;
        try {
            pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch (e1) {
            // Try with provided password using a raw decryption approach
            // pdf-lib doesn't support encrypted PDF decryption natively
            // Return helpful error message
            return NextResponse.json(
                {
                    error: "이 PDF는 암호화되어 있어 현재 도구로는 잠금 해제가 불가합니다. 소유자 권한(owner password)이 있는 경우에만 가능합니다.",
                    encrypted: true,
                },
                { status: 422 },
            );
        }

        // Save without encryption
        const unlocked = await pdfDoc.save();
        const buf = Buffer.from(unlocked);

        const safeName = file.name
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/\.pdf$/i, "");

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeName}_unlocked.pdf"`,
                "Content-Length": String(buf.length),
            },
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "처리 실패" },
            { status: 500 },
        );
    }
}
