import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController';

const router = Router();

router.get('/', listAuditLogs);

export default router;
