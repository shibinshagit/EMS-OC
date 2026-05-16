import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

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
