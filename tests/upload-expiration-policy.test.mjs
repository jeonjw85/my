import assert from "node:assert/strict";
import test from "node:test";
import { resolveUploadExpiration } from "../lib/upload-expiration-policy.ts";

const NOW = Date.UTC(2026, 8, 21, 12);

test("allows admins to create uploads that never expire", () => {
    assert.deepEqual(resolveUploadExpiration("never", true, NOW), {
        allowed: true,
        expiresAt: null,
    });
});

test("rejects anonymous requests for uploads that never expire", () => {
    assert.deepEqual(resolveUploadExpiration("never", false, NOW), {
        allowed: false,
    });
});

test("preserves finite expiration durations and the 24h fallback", () => {
    for (const [expireIn, hours] of [
        ["1h", 1],
        ["6h", 6],
        ["24h", 24],
        ["7d", 168],
        ["invalid", 24],
        ["constructor", 24],
    ]) {
        assert.deepEqual(resolveUploadExpiration(expireIn, false, NOW), {
            allowed: true,
            expiresAt: new Date(NOW + hours * 60 * 60 * 1000),
        });
    }
});
