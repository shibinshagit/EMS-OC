# OpenCoders - Employee Management Portal

A comprehensive, scalable employee management system built with Next.js 16, React 19, and PostgreSQL (Neon). Manage employees across multiple companies, track attendance, handle leave requests, and manage projects and assignments.

## Features

### Multi-Tenant Architecture
- Support for multiple companies across different countries
- Company isolation with secure data access
- Managers can only see their company's data
- Employees see only their own information

### Role-Based Access Control
- **Super Admin**: Full system control, manage all companies, employees, managers, projects, and approve leave requests
- **Manager**: Manage team members, view projects, approve leave requests from their team
- **Employee**: Track attendance, request leaves, view calendar with work history

### Attendance Tracking
- Manual check-in/check-out system
- Automatic duration calculation
- Monthly attendance views with filtering
- Calendar view showing worked days, half days, and leaves

### Leave Management
- Employees request full day or half day leaves with reasons
- Manager approval workflow (final approval level)
- Super Admin can force-approve if manager unavailable
- Approval history tracking

### Projects & Assignments
- Create projects within companies
- Assign project managers
- Assign employees to projects
- Track active and archived projects

### Authentication
- Email/password based authentication
- Secure password hashing with bcryptjs
- Session-based authentication with NextAuth.js
- JWT token support

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL (Neon)
- **ORM/Query**: Native pg driver
- **Security**: bcryptjs for password hashing

## Getting Started

### Prerequisites

- Node.js 18+ with pnpm
- Neon PostgreSQL database
- Environment variables configured

### Environment Variables

Create a `.env.local` file with:

```
DATABASE_URL=postgresql://username:password@host/database?sslmode=require&channel_binding=require
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit http://localhost:3000 to access the application.


Database schema and data should be managed through SQL migrations/scripts run from trusted environments only.

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Users
- `POST /api/users` - Create new user (admin only)
- `GET /api/users` - List all users (admin only)

### Companies
- `POST /api/companies` - Create company (admin only)
- `GET /api/companies` - List companies (admin only)

### Employees
- `GET /api/employees` - List employees

### Managers
- `GET /api/managers` - List managers (admin only)

### Projects
- `POST /api/projects` - Create project (admin only)
- `GET /api/projects` - List projects

### Attendance
- `POST /api/attendance` - Check-in/check-out
- `GET /api/attendance` - Get attendance records with month filtering

### Leave Requests
- `POST /api/leave-requests` - Submit leave request
- `GET /api/leave-requests` - Get leave requests
- `PATCH /api/leave-requests` - Approve/reject leave request

## Database Schema

### Core Tables
- `users` - All user accounts (admin, manager, employee)
- `companies` - Organization data
- `employees` - Employee records linked to users and companies
- `managers` - Manager records linked to users and companies
- `projects` - Company projects with assigned managers
- `project_assignments` - Maps employees to projects
- `attendance` - Daily check-in/check-out records
- `leave_requests` - Leave request tracking with approvals

## Project Structure

```
app/
├── api/                      # API routes
│   ├── auth/
│   ├── users/
│   ├── companies/
│   ├── employees/
│   ├── managers/
│   ├── projects/
│   ├── attendance/
│   └── leave-requests/
├── admin/                     # Super admin dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   ├── companies/
│   ├── employees/
│   ├── managers/
│   ├── projects/
│   └── leave-approvals/
├── manager/                   # Manager dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   ├── team/
│   ├── projects/
│   └── leave-approvals/
├── employee/                  # Employee dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   ├── attendance/
│   └── leave-requests/
├── login/                     # Authentication
└── dashboard/                 # Role-based redirect

lib/
├── db.ts                      # Database connection
├── auth.ts                    # NextAuth configuration
└── auth-helpers.ts            # Authorization utilities

scripts/
├── init-db.sql                # Database schema

components/
├── ui/                        # Shadcn UI components
└── SessionWrapper.tsx         # Auth session provider
```

## Features Breakdown

### Admin Dashboard
- View statistics (companies, employees, managers, projects, pending leaves)
- Manage companies, employees, managers, and projects
- Review and approve/reject all leave requests
- Force-approve manager-level leaves if needed

### Manager Dashboard
- View team members and projects
- Monitor attendance through employee data
- Approve leave requests from team members
- Quick access to key management functions

### Employee Dashboard
- Check-in/check-out tracking
- View monthly attendance with calendar filtering
- Request leaves with type selection (full day/half day)
- Track leave request status and approval history
- View statistics on worked days and pending requests

## Security Features

- Password hashing with bcryptjs (10 rounds)
- Session-based authentication with JWT tokens
- Role-based access control (RBAC)
- Company-level data isolation
- Parameterized queries to prevent SQL injection
- CSRF protection via NextAuth.js
- Secure HTTP-only cookies

## Scalability Considerations

- PostgreSQL connection pooling via Neon
- Optimized database indexes on frequently queried columns
- Stateless session management (JWT)
- Prepared statements for query efficiency
- Client-side caching with SWR
- Efficient role-based query filtering

## Future Enhancements

- Email notifications for leave approvals
- Attendance analytics and reporting
- Project timeline and milestone tracking
- Bulk employee import
- Attendance correction requests
- Leave balance management
- Performance reviews and ratings
- Document management for employees

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure Neon database is active
- Check network connectivity

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again
- Check user role matches expected access level

### Permission Denied Errors
- Verify user role is correct
- Check company_id matches for managers/employees
- Review API authorization in auth-helpers.ts

## Support

For issues or feature requests, contact the OpenCoders team or submit feedback through the application.
