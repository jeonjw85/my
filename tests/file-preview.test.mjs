import assert from "node:assert/strict";
import test from "node:test";
import { isPreviewableMime } from "../lib/file-preview.ts";

test("allows passive media previews and rejects active document types", () => {
    for (const mime of ["video/mp4", "audio/mpeg", "image/png", "application/pdf"]) {
        assert.equal(isPreviewableMime(mime), true);
    }
    for (const mime of ["text/html", "image/svg+xml", "application/javascript"]) {
        assert.equal(isPreviewableMime(mime), false);
    }
});
