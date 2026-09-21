import type { AdminFile } from "@/lib/admin-files";
import { expirationLabel, isExpired } from "@/lib/file-expiration";

const FILE_FILTERS = ["all", "public", "shared"] as const;

export type FileFilter = (typeof FILE_FILTERS)[number];

type FileLedgerProps = {
    readonly files: readonly AdminFile[];
    readonly filter: FileFilter;
    readonly codeFilter: string;
    readonly loading: boolean;
    readonly loadError: string;
    readonly actionError: string;
    readonly cleaning: boolean;
    readonly cleanResult: number | null;
    readonly extendingId: string | null;
    readonly deletingId: string | null;
    readonly onFilterChange: (filter: FileFilter) => void;
    readonly onCodeFilterChange: (value: string) => void;
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

function groupFiles(files: readonly AdminFile[]) {
    const groups = new Map<string, AdminFile[]>();
    for (const file of files) {
        const groupKey = file.shareCode ?? "__public__";
        const group = groups.get(groupKey);
        if (group) {
            group.push(file);
        } else {
            groups.set(groupKey, [file]);
        }
    }
    return Array.from(groups.entries());
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
    filter,
    codeFilter,
    loading,
    loadError,
    actionError,
    cleaning,
    cleanResult,
    extendingId,
    deletingId,
    onFilterChange,
    onCodeFilterChange,
    onCleanup,
    onExtend,
    onDelete,
}: FileLedgerProps) {
    const groups = groupFiles(files);
    const mutationPending = cleaning || extendingId !== null || deletingId !== null;

    return (
        <section
            aria-labelledby="file-ledger-heading"
            className="border-t border-zinc-800 pt-6 sm:pt-10"
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 id="file-ledger-heading" className="text-lg font-bold tracking-tight text-zinc-100">파일 원장</h2>
                    <fieldset className="mt-3">
                        <legend className="sr-only">파일 필터</legend>
                        <div className="flex flex-wrap gap-2">
                            {FILE_FILTERS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    aria-pressed={filter === item}
                                    onClick={() => onFilterChange(item)}
                                    className={`rounded-sm border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 ${
                                        filter === item
                                            ? "border-zinc-500 text-zinc-100"
                                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                    }`}
                                >
                                    {item === "all"
                                        ? "전체"
                                        : item === "public"
                                          ? "공개"
                                          : "팀 공유"}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0">
                        <label
                            htmlFor="file-code-filter"
                            className="block text-sm text-zinc-400"
                        >
                            공유 코드 필터
                        </label>
                        <input
                            id="file-code-filter"
                            type="text"
                            value={codeFilter}
                            onChange={(event) =>
                                onCodeFilterChange(event.target.value)
                            }
                            placeholder="코드 입력"
                            className="mt-1 w-full rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-base text-zinc-100 placeholder:text-zinc-500 sm:w-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onCleanup}
                        disabled={mutationPending}
                        className="rounded-sm border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                        {cleaning ? "정리 중..." : "만료 파일 정리"}
                    </button>
                </div>
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

            {loading && groups.length === 0 && <p className="mt-4 text-sm text-zinc-500">불러오는 중...</p>}

            {!loading && !loadError && groups.length === 0 && <p className="mt-4 text-sm text-zinc-500">파일 없음</p>}

            {groups.length > 0 && (
                <div className="mt-6 space-y-6 sm:space-y-10">
                    {groups.map(([key, group]) => (
                        <section key={key} className="space-y-2">
                            <h3 className="break-all text-sm font-bold text-zinc-400">
                                {key === "__public__"
                                    ? "공개 업로드"
                                    : `코드: ${key}`}
                            </h3>
                            <div className="overflow-hidden border-b border-zinc-800">
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
                                        {group.map((file) => (
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
                        </section>
                    ))}
                </div>
            )}
        </section>
    );
}
