import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const body = await request.json();
    const { email, password, full_name, role, company_id, position, joining_date, department } = body;
    const normalizedPosition =
      typeof position === 'string' && position.trim().length > 0 ? position.trim() : null;
    const normalizedJoiningDate =
      typeof joining_date === 'string' && joining_date.trim().length > 0 ? joining_date.trim() : null;
    const normalizedDepartment =
      typeof department === 'string' && department.trim().length > 0 ? department.trim() : null;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (!isStrongPassword(String(password))) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include letters and numbers' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, company_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, company_id`,
      [email, password_hash, full_name, role, company_id || null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const user = result.rows[0];

    // If employee, create employee record
    if (role === 'employee' && company_id) {
      await query(
        `INSERT INTO employees (user_id, company_id, employee_code, position, joining_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          company_id,
          `EMP-${user.id}-${Date.now()}`,
          normalizedPosition,
          normalizedJoiningDate,
        ]
      );
    }

    // If manager, create manager record
    if (role === 'manager' && company_id) {
      await query(
        `INSERT INTO managers (user_id, company_id, department)
         VALUES ($1, $2, $3)`,
        [user.id, company_id, normalizedDepartment]
      );
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error('[v0] User creation error:', error);
    const status =
      error?.message === 'Unauthorized'
        ? 401
        : error?.message === 'Insufficient permissions'
        ? 403
        : 500;
    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : 'Unauthorized' },
      { status }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.company_id, c.name as company_name, u.created_at
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       ORDER BY u.created_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get users error:', error);
    const status = error?.message === 'Unauthorized' ? 401 : 403;
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status }
    );
  }
}
