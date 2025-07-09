import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface SurchargeFactor {
  id?: number;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  created_at?: Date;
  updated_at?: Date;
}

class SurchargeFactorModel {
  async findAll(): Promise<SurchargeFactor[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM surcharge_factors ORDER BY name ASC'
      );
      return rows as SurchargeFactor[];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<SurchargeFactor | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM surcharge_factors WHERE id = ?',
        [id]
      );
      return rows.length ? (rows[0] as SurchargeFactor) : null;
    } catch (error) {
      throw error;
    }
  }

  async create(surchargeFactor: SurchargeFactor): Promise<number> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO surcharge_factors (name, rate, type) VALUES (?, ?, ?)',
        [surchargeFactor.name, surchargeFactor.rate, surchargeFactor.type]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, surchargeFactor: Partial<SurchargeFactor>): Promise<boolean> {
    try {
      // Build SET clause dynamically based on provided fields
      const fields = Object.keys(surchargeFactor).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
      if (fields.length === 0) return false;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (surchargeFactor as any)[field]);
      
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE surcharge_factors SET ${setClause} WHERE id = ?`,
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
        'DELETE FROM surcharge_factors WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default new SurchargeFactorModel();
