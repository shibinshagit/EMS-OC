import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextRequest } from 'next/server';
import { query } from './db';
import bcrypt from 'bcryptjs';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth();
  const userRole = (session.user as any).role;
  
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}

export async function requireCompanyAccess(companyId: number) {
  const session = await requireAuth();
  const userRole = (session.user as any).role;
  const userCompanyId = (session.user as any).company_id;
  
  // Super admin can access any company
  if (userRole === 'super_admin') {
    return session;
  }
  
  // Manager and employee can only access their own company
  if (userCompanyId !== companyId) {
    throw new Error('Access denied');
  }
  
  return session;
}

export async function requireCurrentUserPassword(request: NextRequest) {
  const session = await requireAuth();
  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password.trim() : '';

  if (!password) {
    throw new Error('Password is required');
  }

  const userId = Number((session.user as any).id);
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new Error('Unauthorized');
  }

  const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  return session;
}
