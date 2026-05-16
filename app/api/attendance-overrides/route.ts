import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireRole } from '@/lib/auth-helpers';

const ALLOWED_STATUSES = ['present', 'absent', 'leave', 'half_day', 'weekend', 'holiday'] as const;
type AttendanceStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: 'employee_id, month and year are required' }, { status: 400 });
    }

    const client = await getClient();
    try {
      const result = await client.query(
        `SELECT employee_id, attendance_date::text as attendance_date, status
         FROM attendance_overrides
         WHERE employee_id = $1
           AND EXTRACT(MONTH FROM attendance_date) = $2
           AND EXTRACT(YEAR FROM attendance_date) = $3`,
        [Number(employeeId), Number(month), Number(year)]
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[v0] Get attendance overrides error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole('super_admin');

    const body = await request.json();
    const { employee_id, attendance_date, status } = body;

    if (!employee_id || !attendance_date || !status) {
      return NextResponse.json({ error: 'employee_id, attendance_date and status are required' }, { status: 400 });
    }

    const normalizedStatus = String(status).toLowerCase() as AttendanceStatus;
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      if (normalizedStatus === 'present' || normalizedStatus === 'half_day') {
        const checkInTime =
          normalizedStatus === 'present'
            ? `${attendance_date}T09:00:00.000Z`
            : `${attendance_date}T09:00:00.000Z`;
        const checkOutTime =
          normalizedStatus === 'present'
            ? `${attendance_date}T18:00:00.000Z`
            : `${attendance_date}T13:00:00.000Z`;
        const durationMinutes = normalizedStatus === 'present' ? 540 : 240;

        await client.query(
          `INSERT INTO attendance (employee_id, check_in_time, check_out_time, duration_minutes, attendance_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (employee_id, attendance_date)
           DO UPDATE SET
             check_in_time = EXCLUDED.check_in_time,
             check_out_time = EXCLUDED.check_out_time,
             duration_minutes = EXCLUDED.duration_minutes,
             updated_at = CURRENT_TIMESTAMP`,
          [employee_id, checkInTime, checkOutTime, durationMinutes, attendance_date]
        );
      } else {
        await client.query(
          `DELETE FROM attendance
           WHERE employee_id = $1 AND attendance_date = $2`,
          [employee_id, attendance_date]
        );
      }

      await client.query(
        `INSERT INTO attendance_overrides (employee_id, attendance_date, status, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [employee_id, attendance_date, normalizedStatus, Number((session.user as any).id)]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[v0] Update attendance override error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

