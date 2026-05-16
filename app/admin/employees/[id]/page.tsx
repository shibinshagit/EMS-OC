'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Employee {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  employee_code: string;
  position: string;
  company_name: string;
  is_active: boolean;
}

interface AttendanceRecord {
  id: number;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
}

interface LeaveRecord {
  id: number;
  leave_date: string;
  leave_type: 'full_day' | 'half_day';
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
}

interface ProjectRecord {
  id: number;
  name: string;
  company_name: string;
  manager_name: string;
  is_active: boolean;
  assigned_employee_ids: number[];
}

interface AttendanceOverride {
  employee_id: number;
  attendance_date: string;
  status: 'present' | 'absent' | 'leave' | 'half_day' | 'weekend' | 'holiday';
}

type CalendarStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'half_day'
  | 'weekend'
  | 'holiday'
  | 'pending';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKeyFromParts(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toDateKey(raw: string) {
  return raw.slice(0, 10);
}

export default function EmployeeActivityPage() {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [overrides, setOverrides] = useState<AttendanceOverride[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CalendarStatus>('absent');
  const [savingStatus, setSavingStatus] = useState(false);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  useEffect(() => {
    if (!Number.isFinite(employeeId)) return;

    const fetchStaticData = async () => {
      setLoading(true);
      setError('');
      try {
        const [empRes, leaveRes, projectRes] = await Promise.all([
          fetch(`/api/employees?id=${employeeId}`),
          fetch(`/api/leave-requests?employee_id=${employeeId}`),
          fetch('/api/projects'),
        ]);

        if (!empRes.ok) throw new Error('Failed to fetch employee details');
        const empData = await empRes.json();
        if (!Array.isArray(empData) || empData.length === 0) {
          throw new Error('Employee not found');
        }
        setEmployee(empData[0]);

        if (leaveRes.ok) {
          setLeaves(await leaveRes.json());
        }

        if (projectRes.ok) {
          const allProjects = (await projectRes.json()) as ProjectRecord[];
          setProjects(
            allProjects.filter((project) =>
              Array.isArray(project.assigned_employee_ids) &&
              project.assigned_employee_ids.includes(employeeId)
            )
          );
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load employee activity');
      } finally {
        setLoading(false);
      }
    };

    fetchStaticData();
  }, [employeeId]);

  useEffect(() => {
    if (!Number.isFinite(employeeId)) return;

    const fetchAttendance = async () => {
      setCalendarLoading(true);
      try {
        const monthNum = String(month + 1).padStart(2, '0');
        const [attendanceRes, overrideRes] = await Promise.all([
          fetch(`/api/attendance?employee_id=${employeeId}&month=${monthNum}&year=${year}`),
          fetch(`/api/attendance-overrides?employee_id=${employeeId}&month=${monthNum}&year=${year}`),
        ]);
        if (!attendanceRes.ok) throw new Error('Failed to fetch attendance');
        if (!overrideRes.ok) throw new Error('Failed to fetch attendance overrides');
        setAttendance(await attendanceRes.json());
        setOverrides(await overrideRes.json());
      } catch (err: any) {
        setError(err.message || 'Failed to load attendance');
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchAttendance();
  }, [employeeId, month, year]);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((record) => {
      map.set(toDateKey(record.attendance_date), record);
    });
    return map;
  }, [attendance]);

  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveRecord>();
    leaves.forEach((record) => {
      map.set(toDateKey(record.leave_date), record);
    });
    return map;
  }, [leaves]);

  const overridesByDate = useMemo(() => {
    const map = new Map<string, AttendanceOverride>();
    overrides.forEach((record) => {
      map.set(toDateKey(record.attendance_date), record);
    });
    return map;
  }, [overrides]);

  const resolveStatus = (dateKey: string, isWeekend: boolean): CalendarStatus => {
    const override = overridesByDate.get(dateKey);
    if (override) return override.status;

    const leave = leavesByDate.get(dateKey);
    if (leave && leave.status === 'approved') return 'leave';
    if (leave && leave.status === 'pending') return 'pending';

    const dayAttendance = attendanceByDate.get(dateKey);
    if (dayAttendance?.duration_minutes && dayAttendance.duration_minutes >= 480) return 'present';
    if (dayAttendance?.duration_minutes) return 'half_day';
    if (isWeekend) return 'weekend';
    return 'absent';
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, key: `blank-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, key: `day-${day}` });
    }
    return cells;
  }, [month, year]);

  const monthStatusCounts = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const counts: Record<CalendarStatus, number> = {
      present: 0,
      absent: 0,
      leave: 0,
      half_day: 0,
      weekend: 0,
      holiday: 0,
      pending: 0,
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKeyFromParts(year, month, day);
      const dayOfWeek = new Date(year, month, day).getDay();
      const status = resolveStatus(dateKey, dayOfWeek === 0 || dayOfWeek === 6);
      counts[status] += 1;
    }
    return counts;
  }, [month, year, attendanceByDate, leavesByDate, overridesByDate]);

  const workedDays = monthStatusCounts.present;
  const halfDays = monthStatusCounts.half_day;
  const monthApprovedLeaves = monthStatusCounts.leave;

  const saveCalendarStatus = async () => {
    if (!selectedDate) return;
    setSavingStatus(true);
    setError('');
    try {
      const res = await fetch('/api/attendance-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          attendance_date: selectedDate,
          status: selectedStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }

      const monthNum = String(month + 1).padStart(2, '0');
      const [attendanceRes, overrideRes] = await Promise.all([
        fetch(`/api/attendance?employee_id=${employeeId}&month=${monthNum}&year=${year}`),
        fetch(`/api/attendance-overrides?employee_id=${employeeId}&month=${monthNum}&year=${year}`),
      ]);
      if (attendanceRes.ok) setAttendance(await attendanceRes.json());
      if (overrideRes.ok) setOverrides(await overrideRes.json());
      setSelectedDate(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Day Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Date: <span className="font-medium">{selectedDate || '-'}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as CalendarStatus)}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="half_day">Half Day</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)} disabled={savingStatus}>
              Cancel
            </Button>
            <Button onClick={saveCalendarStatus} disabled={savingStatus}>
              {savingStatus ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Link href="/admin/employees" className="text-blue-600 hover:underline block">
        ← Back to Employees
      </Link>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{employee?.full_name || 'Employee Activity'}</CardTitle>
          <CardDescription>
            {employee
              ? `${employee.employee_code} • ${employee.email} • ${employee.company_name}`
              : 'Loading employee details...'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Worked Days</CardDescription>
            <CardTitle>{loading || calendarLoading ? '-' : workedDays}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Half Days</CardDescription>
            <CardTitle>{loading || calendarLoading ? '-' : halfDays}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approved Leaves</CardDescription>
            <CardTitle>{loading ? '-' : monthApprovedLeaves}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Assigned Projects</CardDescription>
            <CardTitle>{loading ? '-' : projects.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monthly Activity Calendar</CardTitle>
              <CardDescription>
                {monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
              >
                Next →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendarLoading ? (
            <>
              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAYS.map((day) => (
                  <Skeleton key={day} className="h-4 w-full" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, idx) => (
                  <Skeleton key={`calendar-skeleton-${idx}`} className="h-20 w-full" />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-600">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="text-center">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                  if (!cell.day) {
                    return <div key={cell.key} className="h-20 border rounded-md bg-gray-50" />;
                  }

                  const dateKey = toDateKeyFromParts(year, month, cell.day);
                  const dayOfWeek = new Date(year, month, cell.day).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const status = resolveStatus(dateKey, isWeekend);
                  const statusLabels: Record<CalendarStatus, string> = {
                    present: 'Present',
                    absent: 'Absent',
                    leave: 'Leave',
                    half_day: 'Half Day',
                    weekend: 'Weekend',
                    holiday: 'Holiday',
                    pending: 'Pending',
                  };
                  const statusClasses: Record<CalendarStatus, string> = {
                    present: 'bg-green-100 text-green-700',
                    absent: 'bg-red-100 text-red-700',
                    leave: 'bg-yellow-100 text-yellow-700',
                    half_day: 'bg-blue-100 text-blue-700',
                    weekend: 'bg-gray-100 text-gray-600',
                    holiday: 'bg-purple-100 text-purple-700',
                    pending: 'bg-orange-100 text-orange-700',
                  };

                  return (
                    <div
                      key={cell.key}
                      className="h-20 border rounded-md p-2 flex flex-col justify-between cursor-pointer hover:border-blue-400"
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setSelectedStatus(status === 'pending' ? 'leave' : status);
                      }}
                    >
                      <span className="text-xs font-semibold text-gray-800">{cell.day}</span>
                      <span className={`text-[10px] rounded px-1 py-0.5 text-center ${statusClasses[status]}`}>
                        {statusLabels[status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>For selected month</CardDescription>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-sm text-gray-600">No attendance records in this month.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>In</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{toDateKey(record.attendance_date)}</TableCell>
                        <TableCell>{new Date(record.check_in_time).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}
                        </TableCell>
                        <TableCell>{record.duration_minutes ?? '-'} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>Employee leave history</CardDescription>
          </CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <div className="text-sm text-gray-600">No leave records.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{toDateKey(leave.leave_date)}</TableCell>
                        <TableCell>{leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}</TableCell>
                        <TableCell className="capitalize">{leave.status}</TableCell>
                        <TableCell>{leave.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Assignments</CardTitle>
          <CardDescription>Projects where this employee is assigned</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-sm text-gray-600">No project assignments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.company_name}</TableCell>
                      <TableCell>{project.manager_name || '-'}</TableCell>
                      <TableCell>{project.is_active ? 'Active' : 'Inactive'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

