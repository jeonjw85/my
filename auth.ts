import NextAuth from "next-auth";
import Authentik from "next-auth/providers/authentik";
import { authConfig } from "./auth.config";

const cookieOpts = {
    httpOnly: true,
    sameSite: "none" as const,
    path: "/",
    secure: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Authentik({
            clientId: process.env.AUTHENTIK_CLIENT_ID!,
            clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
            issuer: process.env.AUTHENTIK_ISSUER,
        }),
    ],
    cookies: {
        pkceCodeVerifier: {
            name: "authjs.pkce.code_verifier",
            options: cookieOpts,
        },
        state: {
            name: "authjs.state",
            options: cookieOpts,
        },
        callbackUrl: {
            name: "authjs.callback-url",
            options: cookieOpts,
        },
    },
});
