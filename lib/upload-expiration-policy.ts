const EXPIRE_HOURS = new Map<string, number>([
    ["1h", 1],
    ["6h", 6],
    ["24h", 24],
    ["7d", 168],
]);

type UploadExpiration =
    | { allowed: true; expiresAt: Date | null }
    | { allowed: false };

export function resolveUploadExpiration(
    expireIn: string,
    isAdmin: boolean,
    now = Date.now(),
): UploadExpiration {
    if (expireIn === "never") {
        return isAdmin
            ? { allowed: true, expiresAt: null }
            : { allowed: false };
    }

    const hours = EXPIRE_HOURS.get(expireIn) ?? 24;
    return {
        allowed: true,
        expiresAt: new Date(now + hours * 60 * 60 * 1000),
    };
}
