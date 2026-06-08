import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireCurrentUserPassword, requireRole } from '@/lib/auth-helpers';
import bcrypt from 'bcryptjs';

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');

    let sql = `SELECT m.id, m.department, m.is_active,
       u.id as user_id, u.email, u.full_name, u.company_id,
       c.name as company_name
       FROM managers m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN companies c ON m.company_id = c.id`;
    
    const params: any[] = [];
    
    if (companyId) {
      sql += ` WHERE m.company_id = $1`;
      params.push(companyId);
    }
    
    sql += ` ORDER BY u.full_name`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get managers error:', error);
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

    const managerId = request.nextUrl.searchParams.get('id');
    if (!managerId) {
      return NextResponse.json({ error: 'Manager id is required' }, { status: 400 });
    }

    const managerResult = await query(
      'SELECT user_id FROM managers WHERE id = $1',
      [managerId]
    );

    if (managerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }

    await query('DELETE FROM users WHERE id = $1', [managerResult.rows[0].user_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Delete manager error:', error);
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

    const managerId = request.nextUrl.searchParams.get('id');
    if (!managerId) {
      return NextResponse.json({ error: 'Manager id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { full_name, email, password, department, is_active, company_id } = body;

    const managerResult = await query(
      `SELECT m.user_id
       FROM managers m
       WHERE m.id = $1`,
      [managerId]
    );

    if (managerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }

    const userId = managerResult.rows[0].user_id;

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
      `UPDATE managers
       SET department = COALESCE($1, department),
           is_active = COALESCE($2, is_active),
           company_id = COALESCE($3, company_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [department ?? null, typeof is_active === 'boolean' ? is_active : null, company_id ?? null, managerId]
    );

    const updatedResult = await query(
      `SELECT m.id, m.department, m.is_active,
       u.id as user_id, u.email, u.full_name, u.company_id,
       c.name as company_name
       FROM managers m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN companies c ON m.company_id = c.id
       WHERE m.id = $1`,
      [managerId]
    );

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error: any) {
    console.error('[v0] Update manager error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
