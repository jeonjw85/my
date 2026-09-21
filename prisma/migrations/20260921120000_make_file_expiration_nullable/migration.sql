PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "expiresAt" DATETIME,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER,
    "shareCode" TEXT,
    "oneTime" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_File" (
    "id",
    "filename",
    "originalName",
    "mimeType",
    "size",
    "expiresAt",
    "downloadCount",
    "maxDownloads",
    "shareCode",
    "oneTime",
    "password",
    "createdAt"
)
SELECT
    "id",
    "filename",
    "originalName",
    "mimeType",
    "size",
    "expiresAt",
    "downloadCount",
    "maxDownloads",
    "shareCode",
    "oneTime",
    "password",
    "createdAt"
FROM "File";

DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
