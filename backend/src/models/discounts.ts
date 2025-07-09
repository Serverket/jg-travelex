import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Discount {
  id?: number;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  created_at?: Date;
  updated_at?: Date;
}

class DiscountModel {
  async findAll(): Promise<Discount[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM discounts ORDER BY name ASC'
      );
      return rows as Discount[];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Discount | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM discounts WHERE id = ?',
        [id]
      );
      return rows.length ? (rows[0] as Discount) : null;
    } catch (error) {
      throw error;
    }
  }

  async create(discount: Discount): Promise<number> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO discounts (name, rate, type) VALUES (?, ?, ?)',
        [discount.name, discount.rate, discount.type]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, discount: Partial<Discount>): Promise<boolean> {
    try {
      // Build SET clause dynamically based on provided fields
      const fields = Object.keys(discount).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
      if (fields.length === 0) return false;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (discount as any)[field]);
      
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE discounts SET ${setClause} WHERE id = ?`,
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
        'DELETE FROM discounts WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default new DiscountModel();
