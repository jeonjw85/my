import assert from "node:assert/strict";
import test from "node:test";
import {
    expirationLabel,
    isExpired,
    parseExpiresAtResponse,
} from "../lib/file-expiration.ts";
import { parseAdminFiles } from "../lib/admin-files.ts";

const FINITE_EXPIRY = "2026-09-22T12:00:00.000Z";

function adminFile(id, expiresAt) {
    return {
        id,
        originalName: `${id}.txt`,
        mimeType: "text/plain",
        size: 10,
        expiresAt,
        downloadCount: 0,
        maxDownloads: null,
        shareCode: null,
        oneTime: false,
        createdAt: "2026-09-21T12:00:00.000Z",
    };
}

test("parses mixed finite and permanent admin file rows", () => {
    const files = parseAdminFiles([
        adminFile("finite", FINITE_EXPIRY),
        adminFile("permanent", null),
    ]);

    assert.notEqual(files, null);
    assert.equal(files?.[0].expiresAt, FINITE_EXPIRY);
    assert.equal(files?.[1].expiresAt, null);
});

test("treats a null PATCH expiry as a successful permanent expiry", () => {
    assert.deepEqual(parseExpiresAtResponse({ expiresAt: null }), {
        ok: true,
        expiresAt: null,
    });
    assert.deepEqual(parseExpiresAtResponse({ expiresAt: "invalid" }), {
        ok: false,
    });
});

test("labels permanent files and keeps them active", () => {
    assert.equal(expirationLabel(null, () => "finite"), "무기한");
    assert.equal(isExpired(null, Date.UTC(2100, 0, 1)), false);
});
