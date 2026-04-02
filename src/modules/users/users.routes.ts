import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema, listUsersQuerySchema, userIdParamSchema } from './users.validator';

const router = Router();

router.use(authenticate);

router.get( '/roles', authorize('admin'), usersController.listRoles);
router.get( '/',      authorize('admin'), validate(listUsersQuerySchema), usersController.list);
router.post('/',      authorize('admin'), validate(createUserSchema),     usersController.create);
router.get( '/:id',  authorize('admin'), validate(userIdParamSchema),    usersController.getById);
router.patch('/:id', authorize('admin'), validate(updateUserSchema),     usersController.update);
router.delete('/:id',authorize('admin'), validate(userIdParamSchema),    usersController.remove);

export default router;
