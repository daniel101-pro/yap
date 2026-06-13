import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { isExeterEmail } from '@/lib/auth-utils';
import { hashOtp } from '@/lib/otp';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: 'email-code',
      name: 'Email Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const code = typeof credentials?.code === 'string' ? credentials.code.trim() : '';

        if (!email || !code || !isExeterEmail(email)) {
          return null;
        }

        if (!/^\d{6}$/.test(code)) {
          return null;
        }

        const hashed = hashOtp(email, code);

        const token = await prisma.verificationToken.findUnique({
          where: { identifier_token: { identifier: email, token: hashed } },
        });

        if (!token || token.expires < new Date()) {
          return null;
        }

        await prisma.verificationToken.delete({
          where: { identifier_token: { identifier: email, token: hashed } },
        });

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: { email, emailVerified: new Date() },
          });
        } else if (!user.emailVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: '/',
    error: '/?auth=error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
