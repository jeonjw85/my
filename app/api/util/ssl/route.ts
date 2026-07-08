import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import tls from "tls";
import dns from "dns/promises";
import net from "net";
import { isPrivateIp } from "@/lib/ssrf";

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const domain = new URL(request.url).searchParams.get("domain")?.trim();
    if (!domain)
        return NextResponse.json({ error: "도메인 필요" }, { status: 400 });

    if (net.isIP(domain)) {
        if (isPrivateIp(domain))
            return NextResponse.json(
                { error: "내부 네트워크 주소는 허용되지 않습니다." },
                { status: 400 },
            );
    } else {
        try {
            const addrs = await dns.lookup(domain, { all: true });
            if (
                addrs.length === 0 ||
                addrs.some((a) => isPrivateIp(a.address))
            ) {
                return NextResponse.json(
                    { error: "내부 네트워크 주소는 허용되지 않습니다." },
                    { status: 400 },
                );
            }
        } catch {
            return NextResponse.json(
                { error: "도메인을 확인할 수 없습니다." },
                { status: 400 },
            );
        }
    }

    return new Promise<NextResponse>((resolve) => {
        const socket = tls.connect(
            443,
            domain,
            { servername: domain, rejectUnauthorized: false },
            () => {
                const cert = socket.getPeerCertificate(true);
                socket.destroy();
                if (!cert || !cert.subject) {
                    resolve(
                        NextResponse.json(
                            { error: "인증서 없음" },
                            { status: 404 },
                        ),
                    );
                    return;
                }
                resolve(
                    NextResponse.json({
                        subject: cert.subject,
                        issuer: cert.issuer,
                        validFrom: cert.valid_from,
                        validTo: cert.valid_to,
                        subjectAltName: cert.subjectaltname,
                        fingerprint: cert.fingerprint,
                        expired: new Date(cert.valid_to) < new Date(),
                    }),
                );
            },
        );
        socket.setTimeout(6000);
        socket.on("timeout", () => {
            socket.destroy();
            resolve(
                NextResponse.json({ error: "연결 시간 초과" }, { status: 408 }),
            );
        });
        socket.on("error", (e) => {
            resolve(NextResponse.json({ error: e.message }, { status: 500 }));
        });
    });
}
