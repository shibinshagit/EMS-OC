import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = Number((session.user as any).id);

    const result = await query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.role,
         u.company_id,
         c.name as company_name,
         u.created_at,
         e.employee_code,
         e.position,
         e.joining_date::text as joining_date,
         m.department
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN managers m ON m.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('[v0] Get profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = Number((session.user as any).id);
    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'current_password and new_password are required' },
        { status: 400 }
      );
    }

    if (!isStrongPassword(String(new_password))) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters and include letters and numbers' },
        { status: 400 }
      );
    }

    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(
      String(current_password),
      userResult.rows[0].password_hash
    );
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(String(new_password), 10);
    await query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newHash, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Update profile password error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
