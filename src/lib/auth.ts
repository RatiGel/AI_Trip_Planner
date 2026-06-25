import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { UserModel } from "./models/user";

const SUPERADMIN_EMAILS = ["ninikusradze@gmail.com", "ratige12@gmail.com"];

function isSuperAdminEmail(email?: string | null) {
  return SUPERADMIN_EMAILS.includes((email ?? "").toLowerCase());
}

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
        const email = (credentials.email as string).toLowerCase().trim();
        const user = await UserModel.findOne({ email }).lean();
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
      const email = (user.email ?? "").toLowerCase().trim();
      if (account?.provider === "google") {
        // findOne with the lowercased email to match Mongoose's lowercase:true storage
        const existing = await UserModel.findOne({ email });
        if (!existing) {
          try {
            await UserModel.create({
              name: user.name?.trim() || email.split("@")[0],
              email,
              role: isSuperAdminEmail(email) ? "superadmin" : "tourist",
              suspended: false,
            });
          } catch (err: unknown) {
            // E11000 duplicate key — another request created the doc first; fine to continue
            const code = (err as { code?: number }).code;
            if (code !== 11000) throw err;
          }
        } else if (isSuperAdminEmail(email) && existing.role !== "superadmin") {
          await UserModel.findByIdAndUpdate(existing._id, { role: "superadmin" });
        }
      } else {
        if (isSuperAdminEmail(email)) {
          await UserModel.findOneAndUpdate({ email }, { role: "superadmin" });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        await connectDB();
        const email = (user.email ?? "").toLowerCase().trim();
        // Always query by lowercased email to match Mongoose lowercase:true storage
        const dbUser = await UserModel.findOne({ email }).lean();
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role ?? "tourist";
        } else {
          // Fallback: store Google OAuth id temporarily; pages must handle non-ObjectId ids
          token.id = user.id;
          token.role = "tourist";
        }
        if (isSuperAdminEmail(email)) {
          token.role = "superadmin";
        }
      } else if (trigger === "update" && token.email) {
        // Client called session.update() — re-read role from DB.
        // Always use email (safe) rather than findById which needs a valid ObjectId.
        await connectDB();
        const email = ((token.email as string) ?? "").toLowerCase().trim();
        try {
          const dbUser = await UserModel.findOne({ email }).lean();
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role ?? token.role;
          }
        } catch {
          // Non-critical: role stays as-is in the token
        }
        if (isSuperAdminEmail(email)) {
          token.role = "superadmin";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      if (isSuperAdminEmail(session.user.email)) {
        session.user.role = "superadmin";
      }
      return session;
    },
  },
});
