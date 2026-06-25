import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { UserModel } from "./models/user";

const SUPERADMIN_EMAILS = ["ninikusradze@gmail.com", "ratige12@gmail.com"];

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await UserModel.findOne({ email: credentials.email }).lean();
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      await connectDB();
      const isSuperAdmin = SUPERADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
      if (account?.provider === "google") {
        const existing = await UserModel.findOne({ email: user.email });
        if (!existing) {
          await UserModel.create({
            name: user.name,
            email: user.email,
            role: isSuperAdmin ? "superadmin" : "tourist",
            suspended: false,
          });
        } else if (isSuperAdmin && existing.role !== "superadmin") {
          await UserModel.findByIdAndUpdate(existing._id, { role: "superadmin" });
        }
      } else {
        if (isSuperAdmin) {
          await UserModel.findOneAndUpdate({ email: user.email }, { role: "superadmin" });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        await connectDB();
        const dbUser = await UserModel.findOne({ email: user.email }).lean();
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role ?? "tourist";
        } else {
          token.id = user.id;
          token.role = "tourist";
        }
        if (SUPERADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
          token.role = "superadmin";
        }
      } else if (trigger === "update" && (token.id || token.email)) {
        await connectDB();
        const dbUser = token.id
          ? await UserModel.findById(token.id as string).lean()
          : await UserModel.findOne({ email: token.email }).lean();
        if (dbUser) token.role = dbUser.role ?? token.role;
        if (SUPERADMIN_EMAILS.includes(((token.email as string) ?? "").toLowerCase())) {
          token.role = "superadmin";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      if (SUPERADMIN_EMAILS.includes((session.user.email ?? "").toLowerCase())) {
        session.user.role = "superadmin";
      }
      return session;
    },
  },
});
