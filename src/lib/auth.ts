import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { UserModel } from "./models/user";

// Site owners — bootstrapped to the "admin" role on sign-in.
const OWNER_EMAILS = ["ninikusradze@gmail.com", "ratige12@gmail.com"];

function isOwnerEmail(email?: string | null) {
  return OWNER_EMAILS.includes((email ?? "").toLowerCase());
}

// Legacy "superadmin" tokens/records are folded into "admin".
function normalizeRole(role?: string | null) {
  return role === "superadmin" ? "admin" : role ?? "tourist";
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
              role: isOwnerEmail(email) ? "admin" : "tourist",
              suspended: false,
            });
          } catch (err: unknown) {
            // E11000 duplicate key — another request created the doc first; fine to continue
            const code = (err as { code?: number }).code;
            if (code !== 11000) throw err;
          }
        } else if (isOwnerEmail(email) && existing.role !== "admin") {
          await UserModel.findByIdAndUpdate(existing._id, { role: "admin" });
        }
      } else {
        if (isOwnerEmail(email)) {
          await UserModel.findOneAndUpdate({ email }, { role: "admin" });
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
          token.role = normalizeRole(dbUser.role);
        } else {
          // Fallback: store Google OAuth id temporarily; pages must handle non-ObjectId ids
          token.id = user.id;
          token.role = "tourist";
        }
        if (isOwnerEmail(email)) {
          token.role = "admin";
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
            token.role = normalizeRole(dbUser.role ?? (token.role as string));
          }
        } catch {
          // Non-critical: role stays as-is in the token
        }
        if (isOwnerEmail(email)) {
          token.role = "admin";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = normalizeRole(token.role as string);
      if (isOwnerEmail(session.user.email)) {
        session.user.role = "admin";
      }
      return session;
    },
  },
});
