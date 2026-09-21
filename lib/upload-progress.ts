export type UploadState =
    | { phase: "idle" }
    | { phase: "uploading"; percent: number | null }
    | { phase: "processing" };

export type UploadStateAction =
    | { type: "start" }
    | {
          type: "progress";
          lengthComputable: boolean;
          loaded: number;
          total: number;
      }
    | { type: "uploaded" }
    | { type: "reset" };

export const INITIAL_UPLOAD_STATE: UploadState = { phase: "idle" };

export function uploadStateReducer(
    state: UploadState,
    action: UploadStateAction,
): UploadState {
    switch (action.type) {
        case "start":
            return { phase: "uploading", percent: null };
        case "progress":
            if (
                state.phase === "idle" ||
                !action.lengthComputable ||
                action.total <= 0
            ) {
                return state;
            }
            return {
                phase: "uploading",
                percent: Math.round((action.loaded / action.total) * 100),
            };
        case "uploaded":
            return state.phase === "idle" ? state : { phase: "processing" };
        case "reset":
            return INITIAL_UPLOAD_STATE;
    }
}

export function uploadStateLabel(state: UploadState): string {
    if (state.phase === "idle") return "업로드";
    if (state.phase === "processing") return "서버 처리 중...";
    if (state.percent === null) return "업로드 중...";
    return `업로드 중... ${state.percent}%`;
}
