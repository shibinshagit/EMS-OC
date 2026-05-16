import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const body = await request.json();
    const { company_id, name, description, manager_id, start_date, end_date, employee_ids } = body;

    if (!company_id || !name || !manager_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const parsedEmployeeIds = Array.isArray(employee_ids)
      ? employee_ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const managerCheck = await client.query(
        'SELECT id FROM managers WHERE id = $1 AND company_id = $2',
        [manager_id, company_id]
      );
      if (managerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Selected manager does not belong to this company' },
          { status: 400 }
        );
      }

      if (parsedEmployeeIds.length > 0) {
        const employeesCheck = await client.query(
          `SELECT id FROM employees
           WHERE company_id = $1 AND id = ANY($2::int[])`,
          [company_id, parsedEmployeeIds]
        );
        if (employeesCheck.rows.length !== parsedEmployeeIds.length) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'One or more selected employees are invalid for this company' },
            { status: 400 }
          );
        }
      }

      const projectResult = await client.query(
        `INSERT INTO projects (company_id, name, description, manager_id, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [company_id, name, description || null, manager_id, start_date || null, end_date || null]
      );
      const project = projectResult.rows[0];

      if (parsedEmployeeIds.length > 0) {
        for (const employeeId of parsedEmployeeIds) {
          await client.query(
            `INSERT INTO project_assignments (project_id, employee_id)
             VALUES ($1, $2)
             ON CONFLICT (project_id, employee_id) DO NOTHING`,
            [project.id, employeeId]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json(project, { status: 201 });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[v0] Project creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userRole = (session.user as any).role as string;
    const userId = Number((session.user as any).id);
    const userCompanyId = Number((session.user as any).company_id);

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');

    let sql = `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.is_active,
       p.company_id, c.name as company_name,
       p.manager_id, u.full_name as manager_name,
       COALESCE(array_remove(array_agg(pa.employee_id), NULL), '{}') as assigned_employee_ids
       FROM projects p
       LEFT JOIN companies c ON p.company_id = c.id
       LEFT JOIN managers m ON p.manager_id = m.id
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN project_assignments pa ON p.id = pa.project_id`;
    
    const params: any[] = [];
    
    if (userRole === 'super_admin') {
      if (companyId) {
        sql += ` WHERE p.company_id = $1`;
        params.push(companyId);
      }
    } else if (userRole === 'manager') {
      sql += ` WHERE p.company_id = $1`;
      params.push(userCompanyId);
    } else if (userRole === 'employee') {
      const empResult = await query(
        'SELECT id FROM employees WHERE user_id = $1',
        [userId]
      );
      if (empResult.rows.length === 0) {
        return NextResponse.json([]);
      }

      sql += ` WHERE p.company_id = $1 AND p.id IN (
        SELECT project_id FROM project_assignments WHERE employee_id = $2
      )`;
      params.push(userCompanyId, empResult.rows[0].id);
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    sql += ` GROUP BY p.id, c.name, u.full_name ORDER BY p.name`;

    const result = await query(sql, params);

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('[v0] Get projects error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const projectId = request.nextUrl.searchParams.get('id');
    if (!projectId) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [projectId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Delete project error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole('super_admin');

    const projectId = request.nextUrl.searchParams.get('id');
    if (!projectId) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, start_date, end_date, is_active, company_id, manager_id, employee_ids } = body;

    const parsedEmployeeIds = Array.isArray(employee_ids)
      ? employee_ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : null;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        'SELECT id, company_id, manager_id, end_date FROM projects WHERE id = $1',
        [projectId]
      );
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const existing = existingResult.rows[0];
      const effectiveCompanyId = company_id ?? existing.company_id;
      const effectiveManagerId = manager_id ?? existing.manager_id;

      const managerCheck = await client.query(
        'SELECT id FROM managers WHERE id = $1 AND company_id = $2',
        [effectiveManagerId, effectiveCompanyId]
      );
      if (managerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Selected manager does not belong to this company' },
          { status: 400 }
        );
      }

      if (parsedEmployeeIds) {
        if (parsedEmployeeIds.length > 0) {
          const employeesCheck = await client.query(
            `SELECT id FROM employees
             WHERE company_id = $1 AND id = ANY($2::int[])`,
            [effectiveCompanyId, parsedEmployeeIds]
          );
          if (employeesCheck.rows.length !== parsedEmployeeIds.length) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: 'One or more selected employees are invalid for this company' },
              { status: 400 }
            );
          }
        }

        await client.query('DELETE FROM project_assignments WHERE project_id = $1', [projectId]);
        for (const employeeId of parsedEmployeeIds) {
          await client.query(
            `INSERT INTO project_assignments (project_id, employee_id)
             VALUES ($1, $2)
             ON CONFLICT (project_id, employee_id) DO NOTHING`,
            [projectId, employeeId]
          );
        }
      }

      const updated = await client.query(
        `UPDATE projects
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             start_date = COALESCE($3, start_date),
             end_date = $4,
             is_active = COALESCE($5, is_active),
             company_id = COALESCE($6, company_id),
             manager_id = COALESCE($7, manager_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          name ?? null,
          description ?? null,
          start_date ?? null,
          end_date === undefined ? existing.end_date : end_date,
          typeof is_active === 'boolean' ? is_active : null,
          company_id ?? null,
          manager_id ?? null,
          projectId,
        ]
      );

      await client.query('COMMIT');
      return NextResponse.json(updated.rows[0]);
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[v0] Update project error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 403 }
    );
  }
}
