import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getAuthEnv, isAdminEmail } from "@/lib/auth-config";

const authEnv = getAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authEnv.secret,
  providers: [
    Google({
      clientId: authEnv.googleId,
      clientSecret: authEnv.googleSecret,
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      return isAdminEmail(user.email);
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
