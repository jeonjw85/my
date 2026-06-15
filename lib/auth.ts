import { auth } from "@/auth";

export async function getSession() {
    const session = await auth();
    if (!session?.user) return null;
    return { role: "admin" as const };
}
