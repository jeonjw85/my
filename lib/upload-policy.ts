export const MAX_GENERAL_UPLOAD_SIZE = 500 * 1024 * 1024;

export function isGeneralUploadTooLarge(
    size: number,
    isAdmin: boolean,
): boolean {
    return !isAdmin && size > MAX_GENERAL_UPLOAD_SIZE;
}
