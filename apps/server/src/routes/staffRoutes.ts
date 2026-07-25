import { Router } from 'express';
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listDesignations, createDesignation, updateDesignation, deleteDesignation,
  listStaff, getStaff, createStaff, updateStaff, deleteStaff,
  listShifts, createShift, updateShift, deleteShift,
  listRosters, createRoster, createRosterBulk, deleteRoster,
  hrSummary,
} from '../controllers/staffController';
import {
  listAttendance, todayAttendance, checkIn, checkOut, markAttendance, bulkAttendance,
  listLeaves, applyLeave, approveLeave, rejectLeave, leaveBalance,
} from '../controllers/attendanceController';
import { roleCheck } from '../middleware/roleCheck';

const MANAGE = ['SUPER_ADMIN', 'MANAGER'] as const;
const ADMIN = ['SUPER_ADMIN'] as const;

const router = Router();

// Departments
router.get('/departments', listDepartments);
router.post('/departments', roleCheck([...MANAGE]), createDepartment);
router.patch('/departments/:id', roleCheck([...MANAGE]), updateDepartment);
router.delete('/departments/:id', roleCheck([...ADMIN]), deleteDepartment);

// Designations
router.get('/designations', listDesignations);
router.post('/designations', roleCheck([...MANAGE]), createDesignation);
router.patch('/designations/:id', roleCheck([...MANAGE]), updateDesignation);
router.delete('/designations/:id', roleCheck([...ADMIN]), deleteDesignation);

// Shifts
router.get('/shifts', listShifts);
router.post('/shifts', roleCheck([...MANAGE]), createShift);
router.patch('/shifts/:id', roleCheck([...MANAGE]), updateShift);
router.delete('/shifts/:id', roleCheck([...ADMIN]), deleteShift);

// Duty rosters
router.get('/duty-rosters', listRosters);
router.post('/duty-rosters', roleCheck([...MANAGE]), createRoster);
router.post('/duty-rosters/bulk', roleCheck([...MANAGE]), createRosterBulk);
router.delete('/duty-rosters/:id', roleCheck([...MANAGE]), deleteRoster);

// Attendance
router.get('/attendance', listAttendance);
router.get('/attendance/today', todayAttendance);
router.post('/attendance/check-in', checkIn);
router.post('/attendance/check-out', checkOut);
router.post('/attendance/mark', roleCheck([...MANAGE]), markAttendance);
router.post('/attendance/bulk', roleCheck([...MANAGE]), bulkAttendance);

// Leaves
router.get('/leaves', listLeaves);
router.post('/leaves', applyLeave);
router.post('/leaves/:id/approve', roleCheck([...MANAGE]), approveLeave);
router.post('/leaves/:id/reject', roleCheck([...MANAGE]), rejectLeave);
router.get('/leaves/balance/:staffId', leaveBalance);

// Dashboard
router.get('/dashboard/summary', roleCheck([...MANAGE]), hrSummary);

// Staff profiles (last — generic /:id routes)
router.get('/', listStaff);
router.get('/:id', getStaff);
router.post('/', roleCheck([...MANAGE]), createStaff);
router.patch('/:id', roleCheck([...MANAGE]), updateStaff);
router.delete('/:id', roleCheck([...ADMIN]), deleteStaff);

export default router;
