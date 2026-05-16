import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          const result = await query(
            `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.company_id, c.name as company_name
             FROM users u
             LEFT JOIN companies c ON u.company_id = c.id
             WHERE u.email = $1`,
            [credentials.email]
          );

          if (result.rows.length === 0) {
            throw new Error('Invalid email or password');
          }

          const user = result.rows[0];
          const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);

          if (!passwordMatch) {
            throw new Error('Invalid email or password');
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.full_name,
            role: user.role,
            company_id: user.company_id,
            company_name: user.company_name,
          };
        } catch {
          throw new Error('Invalid email or password');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.company_id = (user as any).company_id;
        token.company_name = (user as any).company_name;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).company_id = token.company_id;
        (session.user as any).company_name = token.company_name;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
