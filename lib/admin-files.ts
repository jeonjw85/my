export type AdminFile = {
    readonly id: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly size: number;
    readonly expiresAt: string | null;
    readonly downloadCount: number;
    readonly maxDownloads: number | null;
    readonly oneTime: boolean;
    readonly createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isAdminFile(value: unknown): value is AdminFile {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.originalName === "string" &&
        typeof value.mimeType === "string" &&
        typeof value.size === "number" &&
        (typeof value.expiresAt === "string" || value.expiresAt === null) &&
        typeof value.downloadCount === "number" &&
        (typeof value.maxDownloads === "number" ||
            value.maxDownloads === null) &&
        typeof value.oneTime === "boolean" &&
        typeof value.createdAt === "string"
    );
}

export function parseAdminFiles(value: unknown): readonly AdminFile[] | null {
    if (!Array.isArray(value)) return null;
    return value.every(isAdminFile) ? value : null;
}
