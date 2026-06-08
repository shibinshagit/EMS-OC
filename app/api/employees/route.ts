import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireCurrentUserPassword, requireRole } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = Number((session.user as any).id);
    const userRole = (session.user as any).role as string;
    const userCompanyId = Number((session.user as any).company_id);

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    const targetUserId = searchParams.get('user_id');
    const employeeId = searchParams.get('id');

    let sql = `SELECT e.id, e.employee_code, e.position, e.joining_date::text as joining_date, e.is_active,
       u.id as user_id, u.email, u.full_name, u.company_id,
       c.name as company_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN companies c ON e.company_id = c.id`;
    
    const params: any[] = [];
    const conditions: string[] = [];

    if (userRole === 'super_admin') {
      if (companyId) {
        conditions.push(`e.company_id = $${params.length + 1}`);
        params.push(companyId);
      }
      if (targetUserId) {
        conditions.push(`u.id = $${params.length + 1}`);
        params.push(targetUserId);
      }
      if (employeeId) {
        conditions.push(`e.id = $${params.length + 1}`);
        params.push(employeeId);
      }
    } else if (userRole === 'manager') {
      conditions.push(`e.company_id = $${params.length + 1}`);
      params.push(userCompanyId);
      if (targetUserId) {
        conditions.push(`u.id = $${params.length + 1}`);
        params.push(targetUserId);
      }
      if (employeeId) {
        conditions.push(`e.id = $${params.length + 1}`);
        params.push(employeeId);
      }
    } else if (userRole === 'employee') {
      conditions.push(`u.id = $${params.length + 1}`);
      params.push(userId);
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY u.full_name`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get employees error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole('super_admin');
    await requireCurrentUserPassword(request);

    const employeeId = request.nextUrl.searchParams.get('id');
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    const employeeResult = await query(
      'SELECT user_id FROM employees WHERE id = $1',
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await query('DELETE FROM users WHERE id = $1', [employeeResult.rows[0].user_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Delete employee error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      {
        status:
          error.message === 'Password is required'
            ? 400
            : error.message === 'Unauthorized' || error.message === 'Invalid password'
              ? 401
              : 403,
      }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const employeeId = request.nextUrl.searchParams.get('id');
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { full_name, email, password, position, is_active, joining_date, company_id } = body;

    const employeeResult = await query(
      `SELECT e.user_id
       FROM employees e
       WHERE e.id = $1`,
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const userId = employeeResult.rows[0].user_id;

    await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           company_id = COALESCE($3, company_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        typeof full_name === 'string' && full_name.trim() ? full_name.trim() : null,
        typeof email === 'string' && email.trim() ? email.trim() : null,
        company_id ?? null,
        userId,
      ]
    );

    if (typeof password === 'string' && password.trim()) {
      if (!isStrongPassword(password.trim())) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters and include letters and numbers' },
          { status: 400 }
        );
      }
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await query(
        `UPDATE users
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, userId]
      );
    }

    await query(
      `UPDATE employees
       SET position = COALESCE($1, position),
           is_active = COALESCE($2, is_active),
           joining_date = COALESCE($3, joining_date),
           company_id = COALESCE($4, company_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        position ?? null,
        typeof is_active === 'boolean' ? is_active : null,
        joining_date ?? null,
        company_id ?? null,
        employeeId,
      ]
    );

    const updatedResult = await query(
      `SELECT e.id, e.employee_code, e.position, e.joining_date::text as joining_date, e.is_active,
       u.id as user_id, u.email, u.full_name, u.company_id,
       c.name as company_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN companies c ON e.company_id = c.id
       WHERE e.id = $1`,
      [employeeId]
    );

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error: any) {
    console.error('[v0] Update employee error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
