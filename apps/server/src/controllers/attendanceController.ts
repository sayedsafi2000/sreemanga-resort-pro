import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { attendanceMarkSchema, attendanceBulkSchema, leaveSchema } from '../validators/staffValidator';

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

// Configurable annual leave entitlements.
const LEAVE_POLICIES: Record<string, number> = {
  SICK: 12, CASUAL: 10, ANNUAL: 15, MATERNITY: 120, PATERNITY: 5, UNPAID: 0, OTHER: 0,
};

// ── Attendance ─────────────────────────────────────────────────────────────
export const listAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, staffId, status, from, to } = req.query;
    const where: any = {};
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (date) where.date = dayStart(new Date(String(date)));
    else if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayStart(new Date(String(from)));
      if (to) where.date.lte = dayEnd(new Date(String(to)));
    }
    const attendance = await prisma.attendance.findMany({
      where,
      include: { staff: { include: { user: { select: { name: true } }, department: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
};

export const todayAttendance = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = dayStart(new Date());
    const [staff, records] = await Promise.all([
      prisma.staffProfile.findMany({ where: { isActive: true }, include: { user: { select: { name: true } }, department: true } }),
      prisma.attendance.findMany({ where: { date: today } }),
    ]);
    const byStaff = new Map(records.map((r) => [r.staffId, r]));
    const rows = staff.map((s) => ({ staff: s, attendance: byStaff.get(s.id) ?? null }));
    res.json({ success: true, date: today, rows });
  } catch (error) { next(error); }
};

// Self or admin check-in. Marks LATE if after 09:15 (simple heuristic).
export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = attendanceMarkSchema.parse(req.body);
    const date = dayStart(data.date ? new Date(data.date) : new Date());
    const now = new Date();
    const late = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const attendance = await prisma.attendance.upsert({
      where: { staffId_date: { staffId: data.staffId, date } },
      update: { checkIn: now, status: late ? 'LATE' : 'PRESENT' },
      create: { staffId: data.staffId, date, checkIn: now, status: late ? 'LATE' : 'PRESENT', markedById: (req as any).user?.id },
    });
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = attendanceMarkSchema.parse(req.body);
    const date = dayStart(data.date ? new Date(data.date) : new Date());
    const existing = await prisma.attendance.findUnique({ where: { staffId_date: { staffId: data.staffId, date } } });
    if (!existing) throw new AppError('No check-in record for today', 400);
    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: new Date() },
    });
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
};

export const markAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = attendanceMarkSchema.parse(req.body);
    const date = dayStart(data.date ? new Date(data.date) : new Date());
    const attendance = await prisma.attendance.upsert({
      where: { staffId_date: { staffId: data.staffId, date } },
      update: { status: data.status ?? 'PRESENT', notes: data.notes ?? null, markedById: (req as any).user?.id },
      create: { staffId: data.staffId, date, status: data.status ?? 'PRESENT', notes: data.notes ?? null, markedById: (req as any).user?.id },
    });
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
};

export const bulkAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = attendanceBulkSchema.parse(req.body);
    const date = dayStart(new Date(data.date));
    const userId = (req as any).user?.id;
    await prisma.$transaction(async (tx) => {
      for (const r of data.records) {
        await tx.attendance.upsert({
          where: { staffId_date: { staffId: r.staffId, date } },
          update: { status: r.status, notes: r.notes ?? null, markedById: userId },
          create: { staffId: r.staffId, date, status: r.status, notes: r.notes ?? null, markedById: userId },
        });
      }
    });
    res.json({ success: true, count: data.records.length });
  } catch (error) { next(error); }
};

// ── Leave ──────────────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date): number {
  const ms = dayStart(b).getTime() - dayStart(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export const listLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId, status } = req.query;
    const where: any = {};
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    const leaves = await prisma.leave.findMany({
      where,
      include: { staff: { include: { user: { select: { name: true } }, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, leaves });
  } catch (error) { next(error); }
};

export const applyLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = leaveSchema.parse(req.body);
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw new AppError('End date must be after start date', 400);
    const totalDays = daysBetween(start, end);
    const leave = await prisma.leave.create({
      data: {
        staffId: data.staffId, type: data.type, startDate: dayStart(start), endDate: dayStart(end),
        totalDays, reason: data.reason ?? null, status: 'PENDING',
      },
    });
    res.status(201).json({ success: true, leave });
  } catch (error) { next(error); }
};

export const approveLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leave = await prisma.leave.findUnique({ where: { id: req.params.id } });
    if (!leave) throw new AppError('Leave not found', 404);
    if (leave.status !== 'PENDING') throw new AppError('Only pending leaves can be approved', 400);
    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.leave.update({
        where: { id: leave.id },
        data: { status: 'APPROVED', approvedById: (req as any).user?.id },
      });
      // Mark attendance LEAVE for each covered day.
      for (let d = new Date(l.startDate); d <= l.endDate; d.setDate(d.getDate() + 1)) {
        const date = dayStart(new Date(d));
        await tx.attendance.upsert({
          where: { staffId_date: { staffId: l.staffId, date } },
          update: { status: 'LEAVE' },
          create: { staffId: l.staffId, date, status: 'LEAVE' },
        });
      }
      return l;
    });
    res.json({ success: true, leave: updated });
  } catch (error) { next(error); }
};

export const rejectLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leave = await prisma.leave.findUnique({ where: { id: req.params.id } });
    if (!leave) throw new AppError('Leave not found', 404);
    if (leave.status !== 'PENDING') throw new AppError('Only pending leaves can be rejected', 400);
    const updated = await prisma.leave.update({
      where: { id: leave.id },
      data: { status: 'REJECTED', approvedById: (req as any).user?.id, rejectionReason: req.body?.reason ?? null },
    });
    res.json({ success: true, leave: updated });
  } catch (error) { next(error); }
};

export const leaveBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const taken = await prisma.leave.groupBy({
      by: ['type'],
      where: {
        staffId: req.params.staffId,
        status: 'APPROVED',
        startDate: { gte: new Date(`${year}-01-01`) },
        endDate: { lte: new Date(`${year}-12-31`) },
      },
      _sum: { totalDays: true },
    });
    const balance: Record<string, { entitled: number; taken: number; remaining: number }> = {};
    for (const [type, entitled] of Object.entries(LEAVE_POLICIES)) {
      const rec = taken.find((t) => t.type === type);
      const takenDays = rec?._sum?.totalDays ?? 0;
      balance[type] = { entitled, taken: takenDays, remaining: Math.max(0, entitled - takenDays) };
    }
    res.json({ success: true, year, balance });
  } catch (error) { next(error); }
};
