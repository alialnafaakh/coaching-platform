import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import {
  assertLoginNotRateLimited,
  clearLoginRateLimits,
  getClientIpFromHeaders,
  recordFailedLoginAttempt,
} from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username =
          typeof credentials?.username === "string" ? credentials.username : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        let ip: string | null = null;
        try {
          const hdrs = await headers();
          ip = getClientIpFromHeaders(hdrs);
        } catch {
          // headers() unavailable outside a request context — treat as missing IP.
          ip = null;
        }

        const gate = await assertLoginNotRateLimited({ ip, username });
        if (gate.blocked) {
          // Same outcome as bad credentials (no enumeration). Fail-closed on limiter errors.
          return null;
        }

        const expectedUser = process.env.ADMIN_USERNAME;
        const expectedPass = process.env.ADMIN_PASSWORD;
        const ok =
          Boolean(expectedUser) &&
          Boolean(expectedPass) &&
          username === expectedUser &&
          password === expectedPass;

        if (!ok) {
          await recordFailedLoginAttempt({ ip, username });
          return null;
        }

        await clearLoginRateLimits({ ip, username });
        return { id: "1", name: "Admin", email: "admin@coaching.com" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = "admin";
      return token;
    },
    async session({ session, token }) {
      (session as { role?: unknown }).role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
