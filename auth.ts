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
        
        // Check if trainer exists with this email
        const trainer = await db
          .collection("trainers")
          .findOne({ email: user.email });

        // If trainer doesn't exist, create one
        if (!trainer) {
          await db.collection("trainers").insertOne({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            maxClients: 10,
            isPaid: false,
            exerciseNames: [],
            expirationDate: null, // Will be set by admin
          });
        }

        return true;
      }
      return false;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial sign in, fetch trainer ID and store in token
      // Only do DB lookup on sign-in, not on token refresh
      if (account && user?.email && !token.trainerId) {
        try {
          const db = await getDb();
          const trainer = await db
            .collection("trainers")
            .findOne({ email: user.email });
          
          if (trainer) {
            token.trainerId = trainer._id.toString();
          }
        } catch (error) {
          // If DB lookup fails, don't break the auth flow
          console.error("Error fetching trainer in jwt callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add trainerId to session from token (no DB lookup needed)
      if (token.trainerId) {
        (session as any).trainerId = token.trainerId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/pl/auth/signin",
  },
});
