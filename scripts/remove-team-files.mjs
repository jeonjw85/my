import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

try {
    const markerTable = await prisma.$queryRawUnsafe(
        `SELECT "name" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = '_RemovedTeamFile'`,
    );

    if (markerTable.length === 0) process.exitCode = 0;
    else {
        const files = await prisma.$queryRawUnsafe(
            `SELECT "filename" FROM "_RemovedTeamFile"`,
        );

        for (const file of files) {
            if (
                typeof file.filename !== "string" ||
                path.basename(file.filename) !== file.filename
            ) {
                throw new Error("Invalid retired team filename");
            }
            await rm(path.join(uploadDir, file.filename), { force: true });
        }

        await prisma.$executeRawUnsafe(`DROP TABLE "_RemovedTeamFile"`);
        console.log(`Removed ${files.length} retired team file(s).`);
    }
} finally {
    await prisma.$disconnect();
}
