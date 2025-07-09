import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
  id?: number;
  username: string;
  password: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  created_at?: Date;
  updated_at?: Date;
}

class UserModel {
  async findAll(): Promise<User[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, username, name, email, role, created_at, updated_at FROM users'
      );
      return rows as User[];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, username, name, email, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );
      return rows.length ? (rows[0] as User) : null;
    } catch (error) {
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return rows.length ? (rows[0] as User) : null;
    } catch (error) {
      throw error;
    }
  }

  async create(user: User): Promise<number> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
        [user.username, user.password, user.name, user.email, user.role || 'user']
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, user: Partial<User>): Promise<boolean> {
    try {
      // Build SET clause dynamically based on provided fields
      const fields = Object.keys(user).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
      if (fields.length === 0) return false;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (user as any)[field]);
      
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        [...values, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default new UserModel();
