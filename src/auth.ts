import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { isExeterEmail, normalizeEmail } from '@/lib/auth-utils';
import { hashOtp } from '@/lib/otp';
import { hashPassword, isValidPassword, verifyPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';
import { TIMING_SAFE_DUMMY_HASH } from '@/lib/security';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    // Used for first-time signup and for resetting a forgotten password.
    // Verifying the emailed code always (re)sets the password in the same step.
    Credentials({
      id: 'email-code',
      name: 'Email Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? normalizeEmail(credentials.email) : '';
        const code = typeof credentials?.code === 'string' ? credentials.code.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !code || !isExeterEmail(email)) {
          return null;
        }

        const otpLimit = checkRateLimit(`otp-signin:${email}`, 5, 15 * 60 * 1000);
        if (!otpLimit.ok) {
          return null;
        }

        if (!/^\d{6}$/.test(code) || !isValidPassword(password)) {
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

        const passwordHash = await hashPassword(password);
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: { email, emailVerified: new Date(), passwordHash },
          });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: user.emailVerified ?? new Date(), passwordHash },
          });
        }

        if (user.isBanned) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Everyday sign-in once a password has been set.
    Credentials({
      id: 'email-password',
      name: 'Email Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? normalizeEmail(credentials.email) : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password || !isExeterEmail(email)) {
          return null;
        }

        const limit = checkRateLimit(`password-signin:${email}`, 10, 15 * 60 * 1000, false);
        if (!limit.ok) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await verifyPassword(password, user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH);
        if (!user || !user.passwordHash || user.isBanned || !valid) {
          checkRateLimit(`password-signin:${email}`, 10, 15 * 60 * 1000);
          return null;
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
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.banned = false;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { isBanned: true, email: true },
        });
        if (!dbUser || dbUser.isBanned || !isExeterEmail(dbUser.email)) {
          token.id = undefined;
          token.banned = true;
          token.email = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;
      if (!token.id || token.banned) {
        session.user.id = '';
        session.user.email = '';
        session.user.name = '';
        session.user.image = '';
        return session;
      }
      session.user.id = token.id as string;
      return session;
    },
  },
});
