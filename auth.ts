// auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const db = await getDb();
        
        // Check if admin exists with this email
        const admin = await db
          .collection("admin")
          .findOne({ email: user.email, disabled: { $ne: true } });
        
        if (admin) {
          // Admin login - allow it
          return true;
        }
        
        // Check if trainer exists with this email
        const trainer = await db
          .collection("trainers")
          .findOne({ email: user.email, deletedAt: { $exists: false } });

        // If trainer doesn't exist, don't allow login and don't create a document
        if (!trainer) {
          return false;
        }

        return true;
      }
      return false;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial sign in, fetch trainer/admin ID and store in token
      // Only do DB lookup on sign-in, not on token refresh
      if (account && user?.email && (!token.trainerId && !token.adminId)) {
        try {
          const db = await getDb();
          
          // Check for admin first
          const admin = await db
            .collection("admin")
            .findOne({ email: user.email, disabled: { $ne: true } });
          
          if (admin) {
            token.adminId = admin._id.toString();
            token.isAdmin = true;
          } else {
            // Check for trainer
            const trainer = await db
              .collection("trainers")
              .findOne({ email: user.email, deletedAt: { $exists: false } });
            
            if (trainer) {
              token.trainerId = trainer._id.toString();
              token.isAdmin = false;
            }
          }
        } catch (error) {
          // If DB lookup fails, don't break the auth flow
          console.error("Error fetching user in jwt callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add trainerId/adminId to session from token (no DB lookup needed)
      if (token.trainerId) {
        (session as any).trainerId = token.trainerId;
        (session as any).isAdmin = false;
      }
      if (token.adminId) {
        (session as any).adminId = token.adminId;
        (session as any).isAdmin = true;
      }
      return session;
    },
  },
  pages: {
    signIn: "/pl/auth/signin",
    error: "/pl/auth/signin",
  },
});
