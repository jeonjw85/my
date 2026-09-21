PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "_RemovedTeamFile" (
    "filename" TEXT NOT NULL
);

INSERT INTO "_RemovedTeamFile" ("filename")
SELECT "filename" FROM "File" WHERE "shareCode" IS NOT NULL;

DELETE FROM "FilePassword"
WHERE "fileId" IN (
    SELECT "id" FROM "File" WHERE "shareCode" IS NOT NULL
);

CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "expiresAt" DATETIME,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER,
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
    "oneTime",
    "password",
    "createdAt"
FROM "File"
WHERE "shareCode" IS NULL;

DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";

DELETE FROM "AccessLog" WHERE "type" IN ('upload_team', 'code_lookup');
DROP TABLE IF EXISTS "TeamMessage";
DROP TABLE IF EXISTS "TeamNotice";
DROP TABLE IF EXISTS "TeamMemo";
DROP TABLE IF EXISTS "ShareCode";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
