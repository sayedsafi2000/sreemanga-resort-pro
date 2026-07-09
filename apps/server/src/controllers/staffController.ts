import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  departmentSchema,
  designationSchema,
  staffProfileSchema,
  shiftSchema,
  dutyRosterSchema,
  dutyRosterBulkSchema,
} from '../validators/staffValidator';

const dateOnly = (s?: string | null) => (s ? new Date(s) : null);
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

// ── Departments ────────────────────────────────────────────────────────────
export const listDepartments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { staff: true, designations: true } } },
    });
    res.json({ success: true, departments });
  } catch (error) { next(error); }
};
export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = departmentSchema.parse(req.body);
    const department = await prisma.department.create({ data });
    res.status(201).json({ success: true, department });
  } catch (error) { next(error); }
};
export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = departmentSchema.partial().parse(req.body);
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Department not found', 404);
    const department = await prisma.department.update({ where: { id: req.params.id }, data });
    res.json({ success: true, department });
  } catch (error) { next(error); }
};
export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staffProfile.count({ where: { departmentId: req.params.id } });
    if (staff > 0) throw new AppError('Department has staff; reassign them first', 409);
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) { next(error); }
};

// ── Designations ───────────────────────────────────────────────────────────
export const listDesignations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    const designations = await prisma.designation.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { department: true },
    });
    res.json({ success: true, designations });
  } catch (error) { next(error); }
};
export const createDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = designationSchema.parse(req.body);
    const designation = await prisma.designation.create({ data });
    res.status(201).json({ success: true, designation });
  } catch (error) { next(error); }
};
export const updateDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = designationSchema.partial().parse(req.body);
    const existing = await prisma.designation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Designation not found', 404);
    const designation = await prisma.designation.update({ where: { id: req.params.id }, data });
    res.json({ success: true, designation });
  } catch (error) { next(error); }
};
export const deleteDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staffProfile.count({ where: { designationId: req.params.id } });
    if (staff > 0) throw new AppError('Designation has staff; reassign them first', 409);
    await prisma.designation.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Designation deleted' });
  } catch (error) { next(error); }
};

// ── Staff Profiles ─────────────────────────────────────────────────────────
export const listStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, designationId, active } = req.query;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (designationId) where.designationId = designationId;
    if (active === 'true') where.isActive = true;
    const staff = await prisma.staffProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        department: true,
        designation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, staff });
  } catch (error) { next(error); }
};
export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, role: true } }, department: true, designation: true },
    });
    if (!staff) throw new AppError('Staff profile not found', 404);
    res.json({ success: true, staff });
  } catch (error) { next(error); }
};
export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = staffProfileSchema.parse(req.body);
    const dup = await prisma.staffProfile.findUnique({ where: { userId: data.userId } });
    if (dup) throw new AppError('This user already has a staff profile', 409);
    const staff = await prisma.staffProfile.create({
      data: {
        userId: data.userId,
        employeeId: data.employeeId ?? null,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        phone: data.phone ?? null,
        emergencyContact: data.emergencyContact ?? null,
        emergencyPhone: data.emergencyPhone ?? null,
        presentAddress: data.presentAddress ?? null,
        permanentAddress: data.permanentAddress ?? null,
        bloodGroup: data.bloodGroup ?? null,
        dateOfBirth: dateOnly(data.dateOfBirth),
        joiningDate: dateOnly(data.joiningDate),
        resignDate: dateOnly(data.resignDate),
        bankName: data.bankName ?? null,
        bankAccountNo: data.bankAccountNo ?? null,
        bankBranch: data.bankBranch ?? null,
        basicSalary: data.basicSalary ?? null,
        isActive: data.isActive ?? true,
        notes: data.notes ?? null,
      },
      include: { user: { select: { id: true, name: true, email: true } }, department: true, designation: true },
    });
    res.status(201).json({ success: true, staff });
  } catch (error) { next(error); }
};
export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = staffProfileSchema.partial().parse(req.body);
    const existing = await prisma.staffProfile.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Staff profile not found', 404);
    const staff = await prisma.staffProfile.update({
      where: { id: req.params.id },
      data: {
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.designationId !== undefined ? { designationId: data.designationId } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
        ...(data.emergencyPhone !== undefined ? { emergencyPhone: data.emergencyPhone } : {}),
        ...(data.presentAddress !== undefined ? { presentAddress: data.presentAddress } : {}),
        ...(data.permanentAddress !== undefined ? { permanentAddress: data.permanentAddress } : {}),
        ...(data.bloodGroup !== undefined ? { bloodGroup: data.bloodGroup } : {}),
        ...(data.dateOfBirth !== undefined ? { dateOfBirth: dateOnly(data.dateOfBirth) } : {}),
        ...(data.joiningDate !== undefined ? { joiningDate: dateOnly(data.joiningDate) } : {}),
        ...(data.resignDate !== undefined ? { resignDate: dateOnly(data.resignDate) } : {}),
        ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
        ...(data.bankAccountNo !== undefined ? { bankAccountNo: data.bankAccountNo } : {}),
        ...(data.bankBranch !== undefined ? { bankBranch: data.bankBranch } : {}),
        ...(data.basicSalary !== undefined ? { basicSalary: data.basicSalary } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } }, department: true, designation: true },
    });
    res.json({ success: true, staff });
  } catch (error) { next(error); }
};
export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.staffProfile.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Staff deactivated' });
  } catch (error) { next(error); }
};

// ── Shifts ─────────────────────────────────────────────────────────────────
export const listShifts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await prisma.shift.findMany({ orderBy: { startTime: 'asc' } });
    res.json({ success: true, shifts });
  } catch (error) { next(error); }
};
export const createShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shiftSchema.parse(req.body);
    const shift = await prisma.shift.create({ data });
    res.status(201).json({ success: true, shift });
  } catch (error) { next(error); }
};
export const updateShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shiftSchema.partial().parse(req.body);
    const existing = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Shift not found', 404);
    const shift = await prisma.shift.update({ where: { id: req.params.id }, data });
    res.json({ success: true, shift });
  } catch (error) { next(error); }
};
export const deleteShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.shift.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Shift deleted' });
  } catch (error) { next(error); }
};

// ── Duty Roster ────────────────────────────────────────────────────────────
export const listRosters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, staffId, shiftId } = req.query;
    const where: any = {};
    if (staffId) where.staffId = staffId;
    if (shiftId) where.shiftId = shiftId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayStart(new Date(String(from)));
      if (to) where.date.lte = dayEnd(new Date(String(to)));
    }
    const rosters = await prisma.dutyRoster.findMany({
      where,
      include: { staff: { include: { user: { select: { name: true } } } }, shift: true },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, rosters });
  } catch (error) { next(error); }
};
export const createRoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = dutyRosterSchema.parse(req.body);
    // upsert on (staffId, date)
    const roster = await prisma.dutyRoster.upsert({
      where: { staffId_date: { staffId: data.staffId, date: dayStart(new Date(data.date)) } },
      update: { shiftId: data.shiftId, notes: data.notes ?? null },
      create: { staffId: data.staffId, shiftId: data.shiftId, date: dayStart(new Date(data.date)), notes: data.notes ?? null },
      include: { staff: { include: { user: { select: { name: true } } } }, shift: true },
    });
    res.status(201).json({ success: true, roster });
  } catch (error) { next(error); }
};
export const createRosterBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = dutyRosterBulkSchema.parse(req.body);
    let count = 0;
    await prisma.$transaction(async (tx) => {
      for (const staffId of data.staffIds) {
        for (const d of data.dates) {
          await tx.dutyRoster.upsert({
            where: { staffId_date: { staffId, date: dayStart(new Date(d)) } },
            update: { shiftId: data.shiftId, notes: data.notes ?? null },
            create: { staffId, shiftId: data.shiftId, date: dayStart(new Date(d)), notes: data.notes ?? null },
          });
          count += 1;
        }
      }
    });
    res.status(201).json({ success: true, count });
  } catch (error) { next(error); }
};
export const deleteRoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.dutyRoster.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Roster entry removed' });
  } catch (error) { next(error); }
};

// ── HR Dashboard ───────────────────────────────────────────────────────────
export const hrSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = dayStart(new Date());
    const [totalStaff, presentToday, onLeaveToday, pendingLeaves, byDept] = await Promise.all([
      prisma.staffProfile.count({ where: { isActive: true } }),
      prisma.attendance.count({ where: { date: today, status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] } } }),
      prisma.attendance.count({ where: { date: today, status: 'LEAVE' } }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.staffProfile.groupBy({ by: ['departmentId'], where: { isActive: true }, _count: true }),
    ]);
    res.json({
      success: true,
      summary: { totalStaff, presentToday, onLeaveToday, pendingLeaves, absentToday: Math.max(0, totalStaff - presentToday - onLeaveToday), byDepartment: byDept },
    });
  } catch (error) { next(error); }
};
