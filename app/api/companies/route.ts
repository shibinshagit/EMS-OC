import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireCurrentUserPassword, requireRole } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const body = await request.json();
    const { name, location, country } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO companies (name, location, country)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, location || null, country || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('[v0] Company creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userRole = (session.user as any).role;
    const userCompanyId = Number((session.user as any).company_id);
    const requestedId = request.nextUrl.searchParams.get('id');

    if (!['super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let sql = `SELECT id, name, location, country, created_at, updated_at
       FROM companies`;
    const params: any[] = [];

    if (userRole === 'super_admin') {
      if (requestedId) {
        sql += ` WHERE id = $1`;
        params.push(Number(requestedId));
      }
    } else {
      // Manager can only access their own company.
      const effectiveCompanyId = requestedId ? Number(requestedId) : userCompanyId;
      if (!effectiveCompanyId || effectiveCompanyId !== userCompanyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      sql += ` WHERE id = $1`;
      params.push(effectiveCompanyId);
    }

    sql += ` ORDER BY name`;
    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get companies error:', error);
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

    const companyId = request.nextUrl.searchParams.get('id');
    if (!companyId) {
      return NextResponse.json({ error: 'Company id is required' }, { status: 400 });
    }

    // Users table does not enforce a FK on company_id, so clear company users first.
    await query(
      `DELETE FROM users
       WHERE company_id = $1 AND role IN ('manager', 'employee')`,
      [companyId]
    );

    const result = await query(
      'DELETE FROM companies WHERE id = $1 RETURNING id',
      [companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Delete company error:', error);
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

    const companyId = request.nextUrl.searchParams.get('id');
    if (!companyId) {
      return NextResponse.json({ error: 'Company id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, location, country } = body;

    const result = await query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           location = COALESCE($2, location),
           country = COALESCE($3, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name ?? null, location ?? null, country ?? null, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('[v0] Update company error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
