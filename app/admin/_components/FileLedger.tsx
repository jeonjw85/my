import type { AdminFile } from "@/lib/admin-files";
import { expirationLabel, isExpired } from "@/lib/file-expiration";

type FileLedgerProps = {
    readonly files: readonly AdminFile[];
    readonly loading: boolean;
    readonly loadError: string;
    readonly actionError: string;
    readonly cleaning: boolean;
    readonly cleanResult: number | null;
    readonly extendingId: string | null;
    readonly deletingId: string | null;
    readonly onCleanup: () => void;
    readonly onExtend: (id: string) => void;
    readonly onDelete: (id: string) => void;
};

type FileRowProps = { readonly file: AdminFile; readonly mutationPending: boolean; readonly extending: boolean; readonly deleting: boolean; readonly onExtend: (id: string) => void; readonly onDelete: (id: string) => void };

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileRow({ file, mutationPending, extending, deleting, onExtend, onDelete }: FileRowProps) {
    const expired = isExpired(file.expiresAt);

    return (
        <tr
            className={`block border-t border-zinc-800 transition-colors hover:bg-zinc-900 lg:table-row ${
                expired ? "text-zinc-600" : "text-zinc-300"
            }`}
        >
            <td className="flex items-center justify-between gap-4 px-3 py-2 text-left sm:px-3 sm:py-3 lg:table-cell">
                <span className="shrink-0 text-sm text-zinc-400 lg:hidden">파일</span>
                <span className="block min-w-0 flex-1 truncate text-base text-zinc-200">
                    {file.originalName}
                </span>
            </td>
            <td className="flex items-center justify-between gap-4 px-3 py-2 text-right tabular-nums sm:px-3 sm:py-3 lg:table-cell lg:w-24">
                <span className="text-sm text-zinc-400 lg:hidden">크기</span>
                <span className="text-sm text-zinc-500">{formatBytes(file.size)}</span>
            </td>
            <td className="flex items-center justify-between gap-4 px-3 py-2 text-right tabular-nums sm:px-3 sm:py-3 lg:table-cell lg:w-24">
                <span className="text-sm text-zinc-400 lg:hidden">다운로드</span>
                <span className="text-sm text-zinc-500">
                    {file.downloadCount}
                    {file.maxDownloads ? `/${file.maxDownloads}` : ""} DL
                </span>
            </td>
            <td className="flex items-center justify-between gap-4 px-3 py-2 text-right tabular-nums sm:px-3 sm:py-3 lg:table-cell lg:w-32">
                <span className="text-sm text-zinc-400 lg:hidden">만료</span>
                <span className="whitespace-nowrap text-sm text-zinc-500">
                    {expired
                        ? "만료"
                        : expirationLabel(file.expiresAt, (expiresAt) =>
                              new Date(expiresAt).toLocaleDateString("ko-KR"),
                          )}
                </span>
            </td>
            <td className="block w-full px-3 py-2 sm:px-3 sm:py-3 lg:table-cell lg:w-72">
                <span className="text-sm text-zinc-400 lg:hidden">작업</span>
                <span className="mt-2 flex w-full flex-wrap gap-2 lg:mt-0 lg:justify-end">
                    {file.expiresAt !== null && (
                        <button
                            type="button"
                            onClick={() => onExtend(file.id)}
                            disabled={mutationPending}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                        >
                            {extending ? "연장 중..." : "+7일 연장"}
                        </button>
                    )}
                    <a
                        href={`/f/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title={`/f/${file.id}`}
                        aria-label={`${file.originalName} 공유 URL 열기`}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                    >
                        URL
                    </a>
                    {!expired && (
                        <a
                            href={`/api/files/${file.id}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                        >
                            받기
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => onDelete(file.id)}
                        disabled={mutationPending}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-zinc-700 px-3 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 lg:py-1.5"
                    >
                        {deleting ? "삭제 중..." : "삭제"}
                    </button>
                </span>
            </td>
        </tr>
    );
}

export function FileLedger({
    files,
    loading,
    loadError,
    actionError,
    cleaning,
    cleanResult,
    extendingId,
    deletingId,
    onCleanup,
    onExtend,
    onDelete,
}: FileLedgerProps) {
    const mutationPending = cleaning || extendingId !== null || deletingId !== null;

    return (
        <section
            aria-labelledby="file-ledger-heading"
            className="border-t border-zinc-800 pt-6 sm:pt-10"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="file-ledger-heading" className="text-lg font-bold tracking-tight text-zinc-100">파일 원장</h2>
                <button
                    type="button"
                    onClick={onCleanup}
                    disabled={mutationPending}
                    className="rounded-sm border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                    {cleaning ? "정리 중..." : "만료 파일 정리"}
                </button>
            </div>

            {cleanResult !== null && (
                <p role="status" aria-live="polite" className="mt-3 bg-zinc-900 px-3 py-2 text-xs tabular-nums text-zinc-300">
                    {cleanResult}개 삭제됨
                </p>
            )}

            {actionError && (
                <p role="alert" className="mt-3 bg-zinc-900 px-3 py-2 text-sm text-red-400">
                    {actionError}
                </p>
            )}

            {loadError && (
                <p role="alert" className="mt-3 bg-zinc-900 px-3 py-2 text-sm text-red-400">
                    {loadError}
                </p>
            )}

            {loading && files.length === 0 && <p className="mt-4 text-sm text-zinc-500">불러오는 중...</p>}

            {!loading && !loadError && files.length === 0 && <p className="mt-4 text-sm text-zinc-500">파일 없음</p>}

            {files.length > 0 && (
                <div className="mt-6 overflow-hidden border-b border-zinc-800">
                    <table className="block w-full table-fixed text-sm lg:table">
                        <thead className="hidden text-left lg:table-header-group">
                            <tr>
                                <th className="px-3 py-2 text-sm font-normal text-zinc-400">파일</th>
                                <th className="w-24 px-3 py-2 text-right text-sm font-normal text-zinc-400">크기</th>
                                <th className="w-24 px-3 py-2 text-right text-sm font-normal text-zinc-400">다운로드</th>
                                <th className="w-32 px-3 py-2 text-right text-sm font-normal text-zinc-400">만료</th>
                                <th className="w-72 px-3 py-2 text-right text-sm font-normal text-zinc-400">작업</th>
                            </tr>
                        </thead>
                        <tbody className="block lg:table-row-group">
                            {files.map((file) => (
                                <FileRow
                                    key={file.id}
                                    file={file}
                                    mutationPending={mutationPending}
                                    extending={extendingId === file.id}
                                    deleting={deletingId === file.id}
                                    onExtend={onExtend}
                                    onDelete={onDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
