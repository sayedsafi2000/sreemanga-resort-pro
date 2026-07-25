# Phase 6: Staff Management — Full HR System

**Goal:** Complete HR management with departments, designations, shifts, duty rostering, attendance tracking, leave management, and enhanced payroll.

**Depends on:** Phase 0 (foundation)

**Effort:** ~8-10 days

---

## Schema

```prisma
model Department {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  designations Designation[]
  staff        StaffProfile[]

  @@index([isActive])
}

model Designation {
  id           String     @id @default(uuid())
  title        String
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  sortOrder    Int        @default(0)
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  staff        StaffProfile[]

  @@unique([title, departmentId])
  @@index([departmentId])
}

model StaffProfile {
  id               String     @id @default(uuid())
  userId           String     @unique
  user             User       @relation(fields: [userId], references: [id])
  employeeId       String?    @unique   // Manual employee ID (e.g., "EMP-001")
  departmentId     String?
  department       Department? @relation(fields: [departmentId], references: [id])
  designationId    String?
  designation      Designation? @relation(fields: [designationId], references: [id])
  phone            String?
  emergencyContact String?
  emergencyPhone   String?
  presentAddress   String?
  permanentAddress String?
  bloodGroup       String?
  dateOfBirth      DateTime?
  joiningDate      DateTime?
  resignDate       DateTime?
  bankName         String?
  bankAccountNo    String?
  bankBranch       String?
  basicSalary      Float?      // Base salary amount
  isActive         Boolean     @default(true)
  notes            String?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime   @updatedAt

  dutyRosters      DutyRoster[]
  attendance       Attendance[]
  leaves           Leave[]

  @@index([departmentId])
  @@index([designationId])
  @@index([isActive])
}

model Shift {
  id          String   @id @default(uuid())
  name        String   // "Morning", "Evening", "Night", "General"
  startTime   String   // "09:00"
  endTime     String   // "17:00"
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  dutyRosters DutyRoster[]

  @@index([isActive])
}

model DutyRoster {
  id          String       @id @default(uuid())
  staffId     String
  staff       StaffProfile @relation(fields: [staffId], references: [id])
  shiftId     String
  shift       Shift        @relation(fields: [shiftId], references: [id])
  date        DateTime     // Only date part matters
  notes       String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([staffId, date])
  @@index([date])
  @@index([shiftId])
}

model Attendance {
  id          String       @id @default(uuid())
  staffId     String
  staff       StaffProfile @relation(fields: [staffId], references: [id])
  date        DateTime
  checkIn     DateTime?
  checkOut    DateTime?
  status      AttendanceStatus @default(PRESENT)
  notes       String?
  markedById  String?
  markedBy    User?        @relation(fields: [markedById], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([staffId, date])
  @@index([date])
  @@index([status])
  @@index([staffId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  LEAVE
  HOLIDAY
}

enum LeaveType {
  SICK
  CASUAL
  ANNUAL
  MATERNITY
  PATERNITY
  UNPAID
  OTHER
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model Leave {
  id            String       @id @default(uuid())
  staffId       String
  staff         StaffProfile @relation(fields: [staffId], references: [id])
  type          LeaveType
  startDate     DateTime     // Date only
  endDate       DateTime     // Date only
  totalDays     Int
  reason        String?
  status        LeaveStatus  @default(PENDING)
  approvedById  String?
  approvedBy    User?        @relation("ApprovedBy", fields: [approvedById], references: [id])
  rejectionReason String?
  documents     String[]     // Optional document URLs
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([staffId])
  @@index([status])
  @@index([startDate, endDate])
}
```

---

## API Endpoints

### Departments (`/api/departments`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/departments` | Any auth | List departments |
| POST | `/api/departments` | SUPER_ADMIN, MANAGER | Create department |
| PATCH | `/api/departments/:id` | SUPER_ADMIN, MANAGER | Update department |
| DELETE | `/api/departments/:id` | SUPER_ADMIN | Delete (if no staff) |

### Designations (`/api/designations`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/designations` | Any auth | List (filter by department) |
| POST | `/api/designations` | SUPER_ADMIN, MANAGER | Create |
| PATCH | `/api/designations/:id` | SUPER_ADMIN, MANAGER | Update |
| DELETE | `/api/designations/:id` | SUPER_ADMIN | Delete |

### Staff Profiles (`/api/staff`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/staff` | Any auth | List staff (filter by department, designation, status) |
| GET | `/api/staff/:id` | Any auth | Staff detail |
| POST | `/api/staff` | SUPER_ADMIN, MANAGER | Create staff profile (links to existing User) |
| PATCH | `/api/staff/:id` | SUPER_ADMIN, MANAGER | Update profile |
| DELETE | `/api/staff/:id` | SUPER_ADMIN | Deactivate |

### Shifts (`/api/shifts`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/shifts` | Any auth | List shifts |
| POST | `/api/shifts` | SUPER_ADMIN, MANAGER | Create shift |
| PATCH | `/api/shifts/:id` | SUPER_ADMIN, MANAGER | Update |
| DELETE | `/api/shifts/:id` | SUPER_ADMIN | Delete |

### Duty Rosters (`/api/duty-rosters`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/duty-rosters` | Any auth | List (filter by date, staff, shift) |
| POST | `/api/duty-rosters` | SUPER_ADMIN, MANAGER | Assign shift to staff |
| POST | `/api/duty-rosters/bulk` | SUPER_ADMIN, MANAGER | Bulk assign (multiple staff, date range) |
| PATCH | `/api/duty-rosters/:id` | SUPER_ADMIN, MANAGER | Update |
| DELETE | `/api/duty-rosters/:id` | SUPER_ADMIN, MANAGER | Remove |

### Attendance (`/api/attendance`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/attendance` | Any auth | List (filter by date, staff, department, status) |
| GET | `/api/attendance/today` | Any auth | Today's attendance summary |
| POST | `/api/attendance/check-in` | Any auth | Staff self check-in (or admin marks) |
| POST | `/api/attendance/check-out` | Any auth | Staff self check-out |
| POST | `/api/attendance/bulk` | SUPER_ADMIN, MANAGER | Bulk mark attendance |
| PATCH | `/api/attendance/:id` | SUPER_ADMIN, MANAGER | Update attendance record |

### Leaves (`/api/leaves`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/leaves` | Any auth | List (filter by staff, status, date range) |
| POST | `/api/leaves` | Any auth | Apply for leave |
| POST | `/api/leaves/:id/approve` | SUPER_ADMIN, MANAGER | Approve leave |
| POST | `/api/leaves/:id/reject` | SUPER_ADMIN, MANAGER | Reject leave |
| GET | `/api/leaves/balance/:staffId` | Any auth | Get leave balance for staff |

### Staff Dashboard (`/api/staff/dashboard`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/staff/dashboard/me` | Any auth | Staff own dashboard (today's shift, attendance, pending leaves) |
| GET | `/api/staff/dashboard/summary` | SUPER_ADMIN, MANAGER | HR summary (total staff, present today, on leave, absent) |

---

## Attendance Check-In Flow

```
Option 1: Self check-in via kiosk/device
  1. Staff enters employee ID or scans badge
  2. POST /api/attendance/check-in { staffId }
  3. System: finds or creates today's attendance record
  4. Records checkIn time, marks status PRESENT (or LATE if after shift start)

Option 2: Admin marks attendance
  1. Admin opens attendance sheet
  2. Views list of staff for today
  3. Clicks Present/Absent/Late for each
  4. POST /api/attendance/bulk { records: [{ staffId, status, notes }] }

Option 3: Auto from Duty Roster
  - If staff has duty roster for today but no attendance by end of shift → auto ABSENT
```

---

## Leave Balance Calculation

```typescript
// Configurable leave policies (stored in Settings or hardcoded defaults)
const LEAVE_POLICIES = {
  SICK: 12,      // 12 days per year
  CASUAL: 10,    // 10 days per year
  ANNUAL: 15,    // 15 days per year
  MATERNITY: 120,// 120 days
  PATERNITY: 5,  // 5 days
  UNPAID: 0,     // Unlimited (no pay)
};

async function getLeaveBalance(staffId: string, year: number) {
  const taken = await prisma.leave.groupBy({
    by: ['type'],
    where: {
      staffId,
      status: 'APPROVED',
      startDate: { gte: new Date(`${year}-01-01`) },
      endDate: { lte: new Date(`${year}-12-31`) },
    },
    _sum: { totalDays: true },
  });

  const balance: Record<string, { entitled: number; taken: number; remaining: number }> = {};
  for (const [type, entitled] of Object.entries(LEAVE_POLICIES)) {
    const takenRecord = taken.find(t => t.type === type);
    const takenDays = takenRecord?._sum?.totalDays ?? 0;
    balance[type] = {
      entitled,
      taken: takenDays,
      remaining: Math.max(0, entitled - takenDays),
    };
  }
  return balance;
}
```

---

## Admin UI Pages

### Staff Directory (enhanced from Users.tsx)
- Cards/Table: photo, name, employee ID, department, designation, phone, status
- Filters: department, designation, status
- Staff profile dialog: all fields from StaffProfile
- Link to: Attendance, Leave, Salary, Duty Roster

### Departments.tsx
- List: name, staff count, designations count
- Create/Edit dialog

### Shifts.tsx
- Table: name, start, end, description
- Create/Edit dialog

### DutyRoster.tsx
- Calendar view (month/week/day)
- Staff list with shift assignment per day
- Drag-and-drop shift assignment
- Bulk assign: select staff → select shift → select date range → apply
- Color-coded by shift

### AttendanceSheet.tsx
- Date picker (default: today)
- Table: staff name, department, shift, check-in, check-out, status, actions
- Bulk action toolbar: Mark selected as Present/Absent/Late
- Status badges
- Export to CSV

### LeaveManagement.tsx
- Tabs: Pending (default), Approved, Rejected, All
- Table: staff, type, dates, days, reason, status
- Approve/Reject buttons (with reason dialog)
- Leave balance per staff

### StaffDashboard.tsx
- HR summary cards: Total staff, Present today, On leave, Absent
- Today's absent list
- Pending leave requests count
- Department-wise breakdown chart
- Quick actions: Mark attendance, Approve leaves

---

## Payroll Enhancement

Enhance existing `StaffSalary` to integrate with the new HR data:

1. When creating salary records, show staff from StaffProfile (not just User)
2. Auto-calculate based on:
   - `StaffProfile.basicSalary` as default amount
   - Attendance deductions (unpaid absences)
   - Leave adjustments
3. Department-wise salary reports
4. Salary register export

### UI Changes in StaffSalaries.tsx
- Department filter
- Staff profile link
- Show employee ID, department, designation in table
- Batch salary creation from department view

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/departmentController.ts` | Department CRUD |
| `apps/server/src/controllers/designationController.ts` | Designation CRUD |
| `apps/server/src/controllers/staffProfileController.ts` | Staff profile CRUD |
| `apps/server/src/controllers/shiftController.ts` | Shift CRUD |
| `apps/server/src/controllers/dutyRosterController.ts` | Duty roster management |
| `apps/server/src/controllers/attendanceController.ts` | Attendance + check-in/out |
| `apps/server/src/controllers/leaveController.ts` | Leave management |
| `apps/server/src/controllers/staffDashboardController.ts` | HR dashboard + staff self-service |
| `apps/server/src/routes/departmentRoutes.ts` | Department routes |
| `apps/server/src/routes/designationRoutes.ts` | Designation routes |
| `apps/server/src/routes/staffProfileRoutes.ts` | Staff profile routes |
| `apps/server/src/routes/shiftRoutes.ts` | Shift routes |
| `apps/server/src/routes/dutyRosterRoutes.ts` | Duty roster routes |
| `apps/server/src/routes/attendanceRoutes.ts` | Attendance routes |
| `apps/server/src/routes/leaveRoutes.ts` | Leave routes |
| `apps/server/src/validators/staffValidator.ts` | Zod schemas for all HR models |
| `apps/admin/src/pages/Staff/StaffDirectory.tsx` | Staff directory |
| `apps/admin/src/pages/Staff/Departments.tsx` | Department management |
| `apps/admin/src/pages/Staff/Shifts.tsx` | Shift management |
| `apps/admin/src/pages/Staff/DutyRoster.tsx` | Duty roster calendar |
| `apps/admin/src/pages/Staff/AttendanceSheet.tsx` | Attendance sheet |
| `apps/admin/src/pages/Staff/LeaveManagement.tsx` | Leave management |
| `apps/admin/src/pages/Staff/StaffDashboard.tsx` | HR dashboard |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add all HR models |
| `apps/server/src/index.ts` | Mount all HR routes |
| `apps/server/src/controllers/salaryController.ts` | Enhance with department linking, auto-calculate from attendance |
| `apps/admin/src/config/rbac.ts` | Add Staff Management sidebar items with sub-routes |
| `apps/admin/src/App.tsx` | Add all HR routes |
| `apps/admin/src/pages/StaffSalaries/StaffSalaries.tsx` | Enhance with department filters, staff details |
| `apps/admin/src/pages/Users/Users.tsx` | May become simplified (staff mgmt moved to Staff directory) |
