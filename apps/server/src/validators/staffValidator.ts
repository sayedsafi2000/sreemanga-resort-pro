import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const designationSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  departmentId: z.string().uuid(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const staffProfileSchema = z.object({
  userId: z.string().uuid(),
  employeeId: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  designationId: z.string().uuid().optional().nullable(),
  phone: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  presentAddress: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  resignDate: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  basicSalary: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const shiftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const dutyRosterSchema = z.object({
  staffId: z.string().uuid(),
  shiftId: z.string().uuid(),
  date: z.string(),
  notes: z.string().optional().nullable(),
});

export const dutyRosterBulkSchema = z.object({
  staffIds: z.array(z.string().uuid()).min(1),
  shiftId: z.string().uuid(),
  dates: z.array(z.string()).min(1),
  notes: z.string().optional().nullable(),
});

export const attendanceMarkSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY']).optional(),
  notes: z.string().optional().nullable(),
});

export const attendanceBulkSchema = z.object({
  date: z.string(),
  records: z.array(
    z.object({
      staffId: z.string().uuid(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY']),
      notes: z.string().optional().nullable(),
    })
  ).min(1),
});

export const leaveSchema = z.object({
  staffId: z.string().uuid(),
  type: z.enum(['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional().nullable(),
});
