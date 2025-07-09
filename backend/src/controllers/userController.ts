import { Request, Response } from 'express';
import UserModel, { User } from '../models/user';
import crypto from 'crypto';

// Helper function to hash password
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserModel.findAll();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = await UserModel.findById(id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, name, email, role } = req.body;
    
    // Basic validation
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }
    
    // Check if user already exists
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      res.status(409).json({ message: 'Username already exists' });
      return;
    }
    
    // Hash password before storing
    const hashedPassword = hashPassword(password);
    
    const userId = await UserModel.create({
      username,
      password: hashedPassword,
      name,
      email,
      role
    });
    
    res.status(201).json({ 
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { username, password, name, email, role } = req.body;
    
    // Check if user exists
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Build update object
    const updateData: Partial<User> = {};
    if (username) updateData.username = username;
    if (password) updateData.password = hashPassword(password);
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    
    // Update user
    const success = await UserModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update user' });
      return;
    }
    
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user exists
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Delete user
    const success = await UserModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete user' });
      return;
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }
    
    // Find user
    const user = await UserModel.findByUsername(username);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    // Check password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    // Authentication successful
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
