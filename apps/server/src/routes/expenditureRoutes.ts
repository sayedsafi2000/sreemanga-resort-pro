import { Router } from 'express';
import {
  getExpenditureCategories,
  createExpenditureCategory,
  updateExpenditureCategory,
  deleteExpenditureCategory,
  getExpenditures,
  getExpenditureById,
  createExpenditure,
  updateExpenditure,
  deleteExpenditure,
  getExpenditureStats,
} from '../controllers/expenditureController';

const router = Router();

router.get('/categories', getExpenditureCategories);
router.post('/categories', createExpenditureCategory);
router.patch('/categories/:id', updateExpenditureCategory);
router.delete('/categories/:id', deleteExpenditureCategory);

router.get('/stats', getExpenditureStats);
router.get('/', getExpenditures);
router.get('/:id', getExpenditureById);
router.post('/', createExpenditure);
router.patch('/:id', updateExpenditure);
router.delete('/:id', deleteExpenditure);

export default router;
