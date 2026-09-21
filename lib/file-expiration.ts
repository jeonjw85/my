export type ExpiresAtParseResult =
    | { readonly ok: true; readonly expiresAt: string | null }
    | { readonly ok: false };

export function parseExpiresAtResponse(value: unknown): ExpiresAtParseResult {
    if (typeof value !== "object" || value === null || !("expiresAt" in value)) {
        return { ok: false };
    }

    const expiresAt = value.expiresAt;
    if (expiresAt === null) return { ok: true, expiresAt: null };
    if (
        typeof expiresAt !== "string" ||
        expiresAt.trim().length === 0 ||
        Number.isNaN(Date.parse(expiresAt))
    ) {
        return { ok: false };
    }
    return { ok: true, expiresAt };
}

export function expirationLabel(
    expiresAt: string | null,
    formatFinite: (expiresAt: string) => string,
): string {
    return expiresAt === null ? "무기한" : formatFinite(expiresAt);
}

export function isExpired(expiresAt: string | null, now = Date.now()): boolean {
    return expiresAt !== null && now > Date.parse(expiresAt);
}
