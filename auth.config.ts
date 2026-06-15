import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/admin/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const path = nextUrl.pathname;

            // Public routes (no auth needed)
            if (
                path.startsWith("/paste") ||
                path.startsWith("/s/") ||
                path.startsWith("/api/paste") ||
                path.startsWith("/util/ip") ||
                path.startsWith("/util/qr") ||
                path.startsWith("/util/lorem") ||
                path.startsWith("/util/units") ||
                path.startsWith("/util/cron") ||
                path.startsWith("/util/yaml") ||
                path.startsWith("/util/numberbase") ||
                path.startsWith("/util/pdf") ||
                path.startsWith("/util/encrypt") ||
                path.startsWith("/api/util/ip") ||
                path.startsWith("/api/util/pdf")
            )
                return true;

            const isProtected =
                path.startsWith("/admin") ||
                path.startsWith("/my") ||
                path.startsWith("/util");
            if (isProtected) return isLoggedIn;
            return true;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
