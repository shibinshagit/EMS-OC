import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireCurrentUserPassword, requireRole } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { employee_id, leave_date, leave_type, reason } = body;

    if (!employee_id || !leave_date || !leave_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const normalizedLeaveDate = String(leave_date).slice(0, 10);
    const todayDate = new Date().toISOString().slice(0, 10);
    if (normalizedLeaveDate < todayDate) {
      return NextResponse.json(
        { error: 'Previous dates are not allowed' },
        { status: 400 }
      );
    }

    // Verify employee owns this request
    const userId = Number((session.user as any).id);
    const empResult = await query(
      'SELECT id FROM employees WHERE user_id = $1',
      [userId]
    );

    if (empResult.rows.length === 0 || Number(empResult.rows[0].id) !== Number(employee_id)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const result = await query(
      `INSERT INTO leave_requests (employee_id, leave_date, leave_type, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         employee_id,
         leave_date::text as leave_date,
         leave_type,
         reason,
         status,
         manager_approval_date,
         manager_approved_by,
         admin_approval_date,
         admin_approved_by,
         created_at,
         updated_at`,
      [employee_id, normalizedLeaveDate, leave_type, reason || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('[v0] Leave request creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    let sql = `SELECT
       lr.id,
       lr.employee_id,
       lr.leave_date::text as leave_date,
       lr.leave_type,
       lr.reason,
       lr.status,
       lr.manager_approval_date,
       lr.manager_approved_by,
       lr.admin_approval_date,
       lr.admin_approved_by,
       lr.created_at,
       lr.updated_at,
       e.employee_code,
       u.full_name as employee_name,
       c.name as company_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       JOIN companies c ON e.company_id = c.id`;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (status) {
      conditions.push(`lr.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      conditions.push(`lr.employee_id = $${paramIndex}`);
      params.push(employeeId);
      paramIndex++;
    }

    // If not super_admin, restrict based on role
    if (userRole === 'employee') {
      conditions.push(`e.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'manager') {
      // Manager can see leave requests of their employees
      conditions.push(`e.company_id = (SELECT company_id FROM managers WHERE user_id = $${paramIndex})`);
      params.push(userId);
      paramIndex++;
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY lr.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get leave requests error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userId = Number((session.user as any).id);
    const userRole = (session.user as any).role;
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!['approved', 'rejected'].includes(normalizedStatus)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get the leave request
    const leaveResult = await query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );

    if (leaveResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const leaveRequest = leaveResult.rows[0];

    // Check permissions
    if (userRole === 'manager') {
      // Manager can approve leaves for their employees
      const managerResult = await query(
        'SELECT company_id FROM managers WHERE user_id = $1',
        [userId]
      );

      if (managerResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const managerCompanyId = managerResult.rows[0].company_id;
      const empResult = await query(
        'SELECT company_id FROM employees WHERE id = $1',
        [leaveRequest.employee_id]
      );

      if (empResult.rows[0].company_id !== managerCompanyId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Update with manager approval
      const result = await query(
        `UPDATE leave_requests SET status = $1, manager_approval_date = CURRENT_TIMESTAMP, manager_approved_by = $2
         WHERE id = $3
         RETURNING
           id,
           employee_id,
           leave_date::text as leave_date,
           leave_type,
           reason,
           status,
           manager_approval_date,
           manager_approved_by,
           admin_approval_date,
           admin_approved_by,
           created_at,
           updated_at`,
        [normalizedStatus, leaveRequest.manager_approved_by || (await query('SELECT id FROM managers WHERE user_id = $1', [userId])).rows[0].id, id]
      );

      return NextResponse.json(result.rows[0]);
    } else if (userRole === 'super_admin') {
      // Admin can approve or force-approve
      const result = await query(
        `UPDATE leave_requests SET status = $1, admin_approval_date = CURRENT_TIMESTAMP, admin_approved_by = $2
         WHERE id = $3
         RETURNING
           id,
           employee_id,
           leave_date::text as leave_date,
           leave_type,
           reason,
           status,
           manager_approval_date,
           manager_approved_by,
           admin_approval_date,
           admin_approved_by,
           created_at,
           updated_at`,
        [normalizedStatus, userId, id]
      );

      return NextResponse.json(result.rows[0]);
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error('[v0] Leave request update error:', error);
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
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Leave request id is required' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM leave_requests WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Leave request delete error:', error);
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
