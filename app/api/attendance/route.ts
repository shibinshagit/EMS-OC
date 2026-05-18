import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { employee_id, check_in_time, check_out_time } = body;

    // Verify employee owns this data
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

    const checkInDate = new Date(check_in_time).toISOString().split('T')[0];
    let durationMinutes = null;

    if (check_out_time) {
      const checkIn = new Date(check_in_time);
      const checkOut = new Date(check_out_time);
      durationMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
    }

    const result = await query(
      `INSERT INTO attendance (employee_id, check_in_time, check_out_time, duration_minutes, attendance_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, attendance_date) 
       DO UPDATE SET check_out_time = $3, duration_minutes = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employee_id, check_in_time, check_out_time || null, durationMinutes, checkInDate]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('[v0] Attendance error:', error);
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
    const employeeId = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const userId = Number((session.user as any).id);
    const userRole = (session.user as any).role;

    let sql = `SELECT
       a.id,
       a.employee_id,
       a.check_in_time,
       a.check_out_time,
       a.duration_minutes,
       a.attendance_date::text as attendance_date,
       a.created_at,
       a.updated_at,
       e.employee_code,
       u.full_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       JOIN users u ON e.user_id = u.id`;

    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (userRole === 'employee') {
      const ownEmployee = await query(
        'SELECT id FROM employees WHERE user_id = $1',
        [userId]
      );
      if (ownEmployee.rows.length === 0) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }
      const ownEmployeeId = Number(ownEmployee.rows[0].id);
      if (employeeId && Number(employeeId) !== ownEmployeeId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      conditions.push(`a.employee_id = $${paramIndex}`);
      params.push(ownEmployeeId);
      paramIndex++;
    } else if (userRole === 'manager') {
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
      const managerCompanyId = Number(managerResult.rows[0].company_id);
      conditions.push(`e.company_id = $${paramIndex}`);
      params.push(managerCompanyId);
      paramIndex++;

      if (employeeId) {
        conditions.push(`a.employee_id = $${paramIndex}`);
        params.push(Number(employeeId));
        paramIndex++;
      }
    } else if (userRole === 'super_admin') {
      if (employeeId) {
        conditions.push(`a.employee_id = $${paramIndex}`);
        params.push(Number(employeeId));
        paramIndex++;
      }
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (month && year) {
      const monthInt = Number(month);
      const yearInt = Number(year);

      if (Number.isFinite(monthInt) && Number.isFinite(yearInt)) {
        conditions.push(`EXTRACT(MONTH FROM a.attendance_date) = $${paramIndex}`);
        conditions.push(`EXTRACT(YEAR FROM a.attendance_date) = $${paramIndex + 1}`);
        params.push(monthInt, yearInt);
        paramIndex += 2;
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY a.attendance_date DESC`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get attendance error:', error);
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
    const { employee_id, attendance_date, status } = body;

    const userId = Number((session.user as any).id);
    const userRole = (session.user as any).role;

    if (!employee_id || !status) {
      return NextResponse.json({ error: 'employee_id and status are required' }, { status: 400 });
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    if (!['active', 'present', 'absent', 'half_day', 'half-day'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const empResult = await query(
      'SELECT id, user_id FROM employees WHERE id = $1',
      [employee_id]
    );
    if (empResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (userRole === 'employee' && Number(empResult.rows[0].user_id) !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (userRole === 'manager') {
      const managerResult = await query(
        'SELECT company_id FROM managers WHERE user_id = $1',
        [userId]
      );
      if (managerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      const employeeCompanyResult = await query(
        'SELECT company_id FROM employees WHERE id = $1',
        [employee_id]
      );
      if (
        employeeCompanyResult.rows.length === 0 ||
        Number(employeeCompanyResult.rows[0].company_id) !== Number(managerResult.rows[0].company_id)
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    if (!['employee', 'manager', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const dateValue = typeof attendance_date === 'string' && attendance_date.trim()
      ? attendance_date.trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    if (normalizedStatus === 'absent') {
      await query(
        'DELETE FROM attendance WHERE employee_id = $1 AND attendance_date = $2',
        [employee_id, dateValue]
      );
      return NextResponse.json({ success: true });
    }

    const isHalfDay = normalizedStatus === 'half_day' || normalizedStatus === 'half-day';
    // Persist fixed office hours in IST so browser/location differences do not shift display time.
    const checkInTime = `${dateValue}T09:00:00+05:30`;
    const checkOutTime = isHalfDay ? `${dateValue}T13:00:00+05:30` : `${dateValue}T18:00:00+05:30`;
    const durationMinutes = isHalfDay ? 240 : 540;

    const result = await query(
      `INSERT INTO attendance (employee_id, check_in_time, check_out_time, duration_minutes, attendance_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, attendance_date)
       DO UPDATE SET
         check_in_time = EXCLUDED.check_in_time,
         check_out_time = EXCLUDED.check_out_time,
         duration_minutes = EXCLUDED.duration_minutes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employee_id, checkInTime, checkOutTime, durationMinutes, dateValue]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('[v0] Update attendance status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
