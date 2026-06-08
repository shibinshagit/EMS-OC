'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TimesheetDay {
  day: number;
  date: string;
  weekDay: string;
  isWeekend: boolean;
}

interface TimesheetRow {
  employeeId: number;
  name: string;
  designation: string;
  cells: Array<number | null>;
  workedDays: number;
  leaveDays: number;
  percentage: number;
}

interface TimesheetResponse {
  company: { id: number; name: string };
  month: string;
  days: TimesheetDay[];
  rows: TimesheetRow[];
  totals: {
    workedDays: number;
    leaveDays: number;
    percentage: number;
  };
}

function getDefaultMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatScore(value: number | null) {
  if (value === null) return '';
  return value.toFixed(2);
}

async function loadImageAsDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  return await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export default function CompanyTimesheetPage() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TimesheetResponse | null>(null);

  const readableMonth = useMemo(
    () => monthLabel(data?.month || selectedMonth),
    [data?.month, selectedMonth]
  );
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).replace(/ /g, '-').toUpperCase(),
    []
  );
  const submittedByName = 'Shibin Sha';
  const submittedByDesignation = 'Javascript Developer';
  const approvedByName = 'Shahid Tanwar';
  const approvedByDesignation = 'Sr. Manager Data Analytics & Innovation';

  const handleDownloadPdf = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const dynamicPageHeight = Math.max(420, 290 + data.rows.length * 16);
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [1191, dynamicPageHeight],
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${data.company.name} Monthly TimeSheet`, pageWidth / 2, 36, { align: 'center' });
    doc.setFontSize(12);
    doc.text(readableMonth, pageWidth / 2, 54, { align: 'center' });

    const weekdayRow = [
      'S/N',
      'Name',
      'Designation',
      ...data.days.map((day) => day.weekDay.toUpperCase()),
      'Total Days Worked',
      'Total Leave Days',
      '%',
    ];
    const dayRow = ['', '', '', ...data.days.map((day) => String(day.day)), '', '', ''];

    const bodyRows = data.rows.map((row, index) => [
      String(index + 1),
      row.name,
      row.designation,
      ...row.cells.map((cell) => formatScore(cell)),
      row.workedDays.toFixed(2),
      row.leaveDays.toFixed(2),
      `${row.percentage.toFixed(1)}%`,
    ]);

    bodyRows.push([
      '',
      '',
      'Total',
      ...data.days.map(() => ''),
      data.totals.workedDays.toFixed(2),
      data.totals.leaveDays.toFixed(2),
      `${data.totals.percentage.toFixed(1)}%`,
    ]);

    (autoTable as any)(doc, {
      head: [weekdayRow, dayRow],
      body: bodyRows,
      startY: 70,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, halign: 'center', valign: 'middle' },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.6,
      headStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 110, halign: 'left' },
        2: { cellWidth: 120, halign: 'left' },
      },
      didParseCell: (hookData: any) => {
        const colIndex = hookData.column.index;
        if (colIndex >= 3 && colIndex < 3 + data.days.length) {
          const dayMeta = data.days[colIndex - 3];
          if (dayMeta?.isWeekend) {
            hookData.cell.styles.fillColor = [212, 170, 0];
          }
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 400;
    const footerY = finalY + 26;
    const leftX = 70;
    const midX = pageWidth / 2 - 120;
    const rightX = pageWidth - 300;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Submitted By:', leftX, footerY);
    doc.text('Approved By:', midX, footerY);
    doc.text('Legend', rightX, footerY);

    doc.setDrawColor(130, 130, 130);
    doc.line(leftX, footerY + 24, leftX + 190, footerY + 24);
    doc.line(midX, footerY + 24, midX + 190, footerY + 24);

    const signDataUrl = await loadImageAsDataUrl('/Adobe%20Express%20-%20file.png');
    if (signDataUrl) {
      doc.addImage(signDataUrl, 'PNG', leftX + 4, footerY + 2, 90, 20);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Name: ${submittedByName}`, leftX, footerY + 40);
    doc.text(`Designation: ${submittedByDesignation}`, leftX, footerY + 54);
    doc.text(`Date: ${todayLabel}`, leftX, footerY + 68);

    doc.text(`Name: ${approvedByName}`, midX, footerY + 40);
    doc.text(`Designation: ${approvedByDesignation}`, midX, footerY + 54);
    doc.text(`Date: ${todayLabel}`, midX, footerY + 68);

    doc.text('AL - Annual Leave', rightX, footerY + 16);
    doc.text('CL - Compensate Leave', rightX, footerY + 30);
    doc.text('SL - Sick Leave', rightX, footerY + 44);
    doc.text('PH - Public Holiday', rightX, footerY + 58);

    const safeCompany = data.company.name.replace(/[^a-z0-9-_]+/gi, '-');
    const safeMonth = (data.month || selectedMonth).replace(/[^0-9-]+/g, '');
    doc.save(`${safeCompany}-timesheet-${safeMonth}.pdf`);
  };

  useEffect(() => {
    if (!Number.isFinite(companyId)) return;

    const loadTimesheet = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/companies/timesheet?company_id=${companyId}&month=${encodeURIComponent(selectedMonth)}`
        );
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to fetch timesheet');
        }
        const payload = (await res.json()) as TimesheetResponse;
        setData(payload);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch timesheet');
      } finally {
        setLoading(false);
      }
    };

    loadTimesheet();
  }, [companyId, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/admin/companies" className="text-blue-600 hover:underline">
            ← Back to Companies
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {data?.company.name || 'Company'} Monthly Timesheet
          </h1>
          <p className="text-sm text-slate-600">{readableMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-slate-300 px-2 text-sm"
          />
          <Button onClick={handleDownloadPdf}>Download PDF</Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <div className="space-y-1 text-center">
            <CardTitle className="text-xl">{data?.company.name || 'Company'} Monthly TimeSheet</CardTitle>
            <CardDescription className="font-medium text-slate-700">{readableMonth}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-8 text-center text-slate-600">Loading timesheet...</div>
          ) : !data || data.rows.length === 0 ? (
            <div className="py-8 text-center text-slate-600">No employees found for this company.</div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1" rowSpan={2}>S/N</th>
                    <th className="border border-black px-2 py-1 min-w-[180px]" rowSpan={2}>Name</th>
                    <th className="border border-black px-2 py-1 min-w-[180px]" rowSpan={2}>Designation</th>
                    {data.days.map((day) => (
                      <th
                        key={`${day.date}-weekday`}
                        className={`border border-black px-1 py-1 uppercase ${
                          day.isWeekend ? 'bg-yellow-500' : ''
                        }`}
                      >
                        {day.weekDay}
                      </th>
                    ))}
                    <th className="border border-black px-2 py-1" rowSpan={2}>Total Days Worked</th>
                    <th className="border border-black px-2 py-1" rowSpan={2}>Total Leave Days</th>
                    <th className="border border-black px-2 py-1" rowSpan={2}>%</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {data.days.map((day) => (
                      <th
                        key={`${day.date}-day`}
                        className={`border border-black px-1 py-1 ${
                          day.isWeekend ? 'bg-yellow-500' : ''
                        }`}
                      >
                        {day.day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={row.employeeId} className="hover:bg-slate-50">
                      <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                      <td className="border border-black px-2 py-1">{row.name}</td>
                      <td className="border border-black px-2 py-1">{row.designation}</td>
                      {row.cells.map((value, dayIndex) => (
                        <td
                          key={`${row.employeeId}-${data.days[dayIndex].date}`}
                          className={`border border-black px-1 py-1 text-center ${
                            data.days[dayIndex].isWeekend ? 'bg-yellow-500' : ''
                          }`}
                        >
                          {formatScore(value)}
                        </td>
                      ))}
                      <td className="border border-black px-2 py-1 text-center">{row.workedDays.toFixed(2)}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.leaveDays.toFixed(2)}</td>
                      <td className="border border-black px-2 py-1 text-center">{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold">
                    <td className="border border-black px-2 py-1 text-center" colSpan={3}>
                      Total
                    </td>
                    {data.days.map((day) => (
                      <td
                        key={`total-${day.date}`}
                        className={`border border-black px-1 py-1 text-center ${
                          day.isWeekend ? 'bg-yellow-500' : ''
                        }`}
                      />
                    ))}
                    <td className="border border-black px-2 py-1 text-center">
                      {data.totals.workedDays.toFixed(2)}
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {data.totals.leaveDays.toFixed(2)}
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {data.totals.percentage.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-3">
              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-semibold underline">Submitted By:</p>
                <div className="space-y-1">
                  <div className="h-12 border-b border-slate-400 pb-1">
                    <img
                      src="/Adobe%20Express%20-%20file.png"
                      alt="Submitted signature"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <p>Name: {submittedByName}</p>
                  <p>Designation: {submittedByDesignation}</p>
                  <p>Date: {todayLabel}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-semibold underline">Approved By:</p>
                <div className="space-y-1">
                  <div className="h-12 border-b border-slate-400 pb-1" />
                  <p>Name: {approvedByName}</p>
                  <p>Designation: {approvedByDesignation}</p>
                  <p>Date: {todayLabel}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-700">
                <p className="font-semibold">Legend</p>
                <p>AL - Annual Leave</p>
                <p>CL - Compensate Leave</p>
                <p>SL - Sick Leave</p>
                <p>PH - Public Holiday</p>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

