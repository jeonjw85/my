const INLINE_PREVIEW_TYPES = new Set([
    "application/pdf",
    "image/avif",
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export function isPreviewableMime(mimeType: string): boolean {
    return mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/") ||
        INLINE_PREVIEW_TYPES.has(mimeType);
}
