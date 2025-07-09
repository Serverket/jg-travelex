import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser
} from '../controllers/userController';

const router = express.Router();

// GET all users
router.get('/', getAllUsers);

// GET single user
router.get('/:id', getUserById);

// POST create user
router.post('/', createUser);

// POST login
router.post('/login', loginUser);

// PUT update user
router.put('/:id', updateUser);

// DELETE user
router.delete('/:id', deleteUser);

export default router;
