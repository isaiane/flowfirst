import { PrismaAdapter } from '@auth/prisma-adapter'
import GitHubProvider from 'next-auth/providers/github'
import type { NextAuthOptions } from 'next-auth'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'database' },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
      }
      return session
    },
  },
}


