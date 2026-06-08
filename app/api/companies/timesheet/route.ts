import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-helpers';

type OverrideStatus = 'present' | 'absent' | 'leave' | 'half_day' | 'weekend' | 'holiday';
type LeaveType = 'full_day' | 'half_day';

function toTwoDigits(value: number) {
  return String(value).padStart(2, '0');
}

function toMonthKey(year: number, month: number) {
  return `${year}-${toTwoDigits(month)}`;
}

function getDefaultMonthKey() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (currentMonth === 1) return toMonthKey(currentYear - 1, 12);
  return toMonthKey(currentYear, currentMonth - 1);
}

function parseMonthKey(value: string | null) {
  const monthKey = value || getDefaultMonthKey();
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { monthKey, year, month };
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userRole = (session.user as any).role as string;
    const sessionCompanyId = Number((session.user as any).company_id);
    const params = request.nextUrl.searchParams;

    if (!['super_admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const parsedMonth = parseMonthKey(params.get('month'));
    if (!parsedMonth) {
      return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 });
    }

    const { year, month, monthKey } = parsedMonth;
    const requestedCompanyId = Number(params.get('company_id'));

    let companyId = requestedCompanyId;
    if (userRole === 'manager') {
      if (!sessionCompanyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      if (requestedCompanyId && requestedCompanyId !== sessionCompanyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      companyId = sessionCompanyId;
    }

    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    const companyResult = await query('SELECT id, name FROM companies WHERE id = $1', [companyId]);
    if (companyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const employeesResult = await query(
      `SELECT e.id, u.full_name, COALESCE(e.position, '') AS position
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.company_id = $1
       ORDER BY u.full_name`,
      [companyId]
    );

    const employees = employeesResult.rows as Array<{ id: number; full_name: string; position: string }>;
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = Array.from({ length: daysInMonth }).map((_, index) => {
      const day = index + 1;
      const dateObj = new Date(year, month - 1, day);
      const date = `${year}-${toTwoDigits(month)}-${toTwoDigits(day)}`;
      const dayIndex = dateObj.getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const weekDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      return { day, date, weekDay, isWeekend };
    });

    if (employees.length === 0) {
      return NextResponse.json({
        company: companyResult.rows[0],
        month: monthKey,
        days,
        rows: [],
        totals: { workedDays: 0, leaveDays: 0, percentage: 0 },
      });
    }

    const [attendanceResult, overridesResult, leavesResult] = await Promise.all([
      query(
        `SELECT a.employee_id, a.attendance_date::text AS attendance_date, a.duration_minutes
         FROM attendance a
         JOIN employees e ON a.employee_id = e.id
         WHERE e.company_id = $1
           AND EXTRACT(MONTH FROM a.attendance_date) = $2
           AND EXTRACT(YEAR FROM a.attendance_date) = $3`,
        [companyId, month, year]
      ),
      query(
        `SELECT ao.employee_id, ao.attendance_date::text AS attendance_date, ao.status
         FROM attendance_overrides ao
         JOIN employees e ON ao.employee_id = e.id
         WHERE e.company_id = $1
           AND EXTRACT(MONTH FROM ao.attendance_date) = $2
           AND EXTRACT(YEAR FROM ao.attendance_date) = $3`,
        [companyId, month, year]
      ),
      query(
        `SELECT lr.employee_id, lr.leave_date::text AS leave_date, lr.leave_type
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         WHERE e.company_id = $1
           AND lr.status = 'approved'
           AND EXTRACT(MONTH FROM lr.leave_date) = $2
           AND EXTRACT(YEAR FROM lr.leave_date) = $3`,
        [companyId, month, year]
      ),
    ]);

    const attendanceByDay = new Map<string, number | null>();
    attendanceResult.rows.forEach((record: any) => {
      attendanceByDay.set(`${record.employee_id}|${record.attendance_date}`, record.duration_minutes);
    });

    const overridesByDay = new Map<string, OverrideStatus>();
    overridesResult.rows.forEach((record: any) => {
      overridesByDay.set(`${record.employee_id}|${record.attendance_date}`, record.status as OverrideStatus);
    });

    const leaveByDay = new Map<string, LeaveType>();
    leavesResult.rows.forEach((record: any) => {
      leaveByDay.set(`${record.employee_id}|${record.leave_date}`, record.leave_type as LeaveType);
    });

    const workingDayCount = days.filter((d) => !d.isWeekend).length;

    const rows = employees.map((employee) => {
      let workedDays = 0;
      let weekdayWorkedDays = 0;
      const cells = days.map((day) => {
        const mapKey = `${employee.id}|${day.date}`;
        const override = overridesByDay.get(mapKey);
        const leave = leaveByDay.get(mapKey);
        const duration = attendanceByDay.get(mapKey);

        const hasExplicitData = Boolean(override || leave || (duration && duration > 0));
        if (day.isWeekend && !hasExplicitData) return null;

        let value = 0;
        if (override) {
          if (override === 'present') value = 1;
          else if (override === 'half_day') value = 0.5;
          else value = 0;
        } else if (leave) {
          value = leave === 'half_day' ? 0.5 : 0;
        } else if (duration && duration >= 480) {
          value = 1;
        } else if (duration && duration > 0) {
          value = 0.5;
        } else {
          value = 0;
        }

        if (value > 0) {
          workedDays += value;
          if (!day.isWeekend) {
            weekdayWorkedDays += value;
          }
        } else if (!day.isWeekend) {
          // Keep weekday leave calculation stable even when no attendance row exists.
          weekdayWorkedDays += 0;
        }

        return value;
      });

      const leaveDays = workingDayCount - weekdayWorkedDays;
      const percentage = workingDayCount > 0 ? (weekdayWorkedDays / workingDayCount) * 100 : 0;

      return {
        employeeId: employee.id,
        name: employee.full_name,
        designation: employee.position || '-',
        cells,
        workedDays: roundToOne(workedDays),
        leaveDays: roundToOne(leaveDays),
        percentage: roundToOne(percentage),
      };
    });

    const totalWorkedDays = roundToOne(rows.reduce((sum, row) => sum + row.workedDays, 0));
    const totalLeaveDays = roundToOne(rows.reduce((sum, row) => sum + row.leaveDays, 0));
    const maxPossible = rows.length * workingDayCount;
    const totalPercentage = maxPossible > 0 ? roundToOne((rows.reduce((sum, row) => sum + (row.percentage * workingDayCount) / 100, 0) / maxPossible) * 100) : 0;

    return NextResponse.json({
      company: companyResult.rows[0],
      month: monthKey,
      days,
      rows,
      totals: {
        workedDays: totalWorkedDays,
        leaveDays: totalLeaveDays,
        percentage: totalPercentage,
      },
    });
  } catch (error: any) {
    console.error('[v0] Get company timesheet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

