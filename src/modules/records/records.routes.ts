import { Router } from 'express';
import { recordsController } from './records.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema, recordIdParamSchema } from './records.validator';

const router = Router();
router.use(authenticate);

router.get( '/',     authorize('viewer', 'analyst', 'admin'), validate(listRecordsQuerySchema), recordsController.list);
router.get( '/:id',  authorize('viewer', 'analyst', 'admin'), validate(recordIdParamSchema),    recordsController.getById);
router.post('/',     authorize('analyst', 'admin'),            validate(createRecordSchema),     recordsController.create);
router.patch('/:id', authorize('analyst', 'admin'),            validate(updateRecordSchema),     recordsController.update);
router.delete('/:id',authorize('analyst', 'admin'),            validate(recordIdParamSchema),    recordsController.remove);

export default router;
