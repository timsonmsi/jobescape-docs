import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSheetRows } from "@/lib/google/sheets";

interface UserRow {
  email: string;
  password: string;
  role: string;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usersSheetId = process.env.USERS_SHEETS_ID;
        if (!usersSheetId) throw new Error("Missing USERS_SHEETS_ID env var");

        const users = await getSheetRows<UserRow>("Users", usersSheetId);
        const user = users.find(
          (u) => u.email.trim().toLowerCase() === credentials.email.trim().toLowerCase()
        );

        if (!user || user.password.trim() !== credentials.password) return null;

        return {
          id: user.email,
          email: user.email,
          name: user.email,
          role: user.role.trim().toLowerCase(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
};
