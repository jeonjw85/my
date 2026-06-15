import { prisma } from "@/lib/db";

export async function logAccess(
    type: string,
    label: string,
    request: { headers: { get: (key: string) => string | null } },
) {
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    await prisma.accessLog
        .create({ data: { type, label, ip } })
        .catch(() => {});
}
