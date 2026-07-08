import dns from "dns/promises";
import net from "net";

// SSRF 방어: 내부망/클라우드 메타데이터 주소로의 아웃바운드 요청 차단

function ipv4ToInt(ip: string): number | null {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
        if (!/^\d{1,3}$/.test(p)) return null;
        const v = Number(p);
        if (v < 0 || v > 255) return null;
        n = (n << 8) | v;
    }
    return n >>> 0;
}

function inCidr(ipInt: number, base: string, bits: number): boolean {
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
}

const BLOCKED_V4_RANGES: [string, number][] = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16], // 링크로컬, 클라우드 메타데이터 포함
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
];

function isPrivateIPv4(ip: string): boolean {
    const ipInt = ipv4ToInt(ip);
    if (ipInt === null) return true;
    return BLOCKED_V4_RANGES.some(([base, bits]) => inCidr(ipInt, base, bits));
}

function isPrivateIPv6(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe8") || lower.startsWith("fe9")) return true;
    if (lower.startsWith("fea") || lower.startsWith("feb")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    const v4Match = lower.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (v4Match && (lower.startsWith("::ffff:") || lower.startsWith("::")))
        return isPrivateIPv4(v4Match[1]);
    return false;
}

export function isPrivateIp(ip: string): boolean {
    const family = net.isIP(ip);
    if (family === 4) return isPrivateIPv4(ip);
    if (family === 6) return isPrivateIPv6(ip);
    return true;
}

export class SsrfBlockedError extends Error {}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new SsrfBlockedError("유효하지 않은 URL입니다.");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new SsrfBlockedError("HTTP/HTTPS URL만 허용됩니다.");
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

    if (hostname.toLowerCase() === "localhost") {
        throw new SsrfBlockedError("내부 네트워크 주소는 허용되지 않습니다.");
    }

    if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            throw new SsrfBlockedError(
                "내부 네트워크 주소는 허용되지 않습니다.",
            );
        }
        return parsed;
    }

    let addresses: { address: string }[];
    try {
        addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new SsrfBlockedError("도메인을 확인할 수 없습니다.");
    }

    if (
        addresses.length === 0 ||
        addresses.some((a) => isPrivateIp(a.address))
    ) {
        throw new SsrfBlockedError("내부 네트워크 주소는 허용되지 않습니다.");
    }

    return parsed;
}
