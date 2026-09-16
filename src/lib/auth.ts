import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createHash, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import {
  assertLoginNotRateLimited,
  clearLoginRateLimits,
  getClientIpFromHeaders,
  recordFailedLoginAttempt,
} from "@/lib/rateLimit";

/**
 * Constant-time string compare via SHA-256 digests.
 * Avoids timingSafeEqual throwing on unequal lengths and avoids an
 * obvious early-return length check on the raw credential bytes.
 */
function safeEqualString(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

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

        const expectedUser = process.env.ADMIN_USERNAME ?? "";
        const expectedPass = process.env.ADMIN_PASSWORD ?? "";

        // Always compare both fields (no username-vs-password short-circuit).
        const userOk = safeEqualString(username, expectedUser);
        const passOk = safeEqualString(password, expectedPass);
        const configured = expectedUser.length > 0 && expectedPass.length > 0;
        const ok = configured && userOk && passOk;

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
