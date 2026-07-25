import { Router } from 'express';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  listMovements,
  createAdjustment,
  createIssue,
  getLowStock,
  createPurchase,
  listSuppliers,
  createSupplier,
  updateSupplier,
  getRecipe,
  setRecipe,
} from '../controllers/inventoryController';
import { roleCheck } from '../middleware/roleCheck';

const MANAGE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;
const ADMIN_MANAGE = ['SUPER_ADMIN', 'MANAGER'] as const;
const ISSUE_ROLES = ['SUPER_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RESTAURANT_STAFF'] as const;

const router = Router();

// Items
router.get('/items', listItems);
router.get('/items/:id', getItem);
router.post('/items', roleCheck([...MANAGE]), createItem);
router.patch('/items/:id', roleCheck([...MANAGE]), updateItem);
router.delete('/items/:id', roleCheck(['SUPER_ADMIN']), deleteItem);

// Movements
router.get('/movements', listMovements);
router.post('/adjustments', roleCheck([...ADMIN_MANAGE]), createAdjustment);
router.post('/issues', roleCheck([...ISSUE_ROLES]), createIssue);
router.get('/low-stock', getLowStock);

// Purchases
router.post('/purchases', roleCheck([...MANAGE]), createPurchase);

// Suppliers
router.get('/suppliers', listSuppliers);
router.post('/suppliers', roleCheck([...ADMIN_MANAGE]), createSupplier);
router.patch('/suppliers/:id', roleCheck([...ADMIN_MANAGE]), updateSupplier);

// Recipes
router.get('/recipes/:menuItemId', getRecipe);
router.put('/recipes/:menuItemId', roleCheck([...ADMIN_MANAGE]), setRecipe);

export default router;
