import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Settings {
  id?: number;
  distance_rate: number;
  duration_rate: number;
  created_at?: Date;
  updated_at?: Date;
}

class SettingsModel {
  async getSettings(): Promise<Settings | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM settings ORDER BY id DESC LIMIT 1'
      );
      return rows.length ? (rows[0] as Settings) : null;
    } catch (error) {
      throw error;
    }
  }

  async createSettings(settings: Settings): Promise<number> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO settings (distance_rate, duration_rate) VALUES (?, ?)',
        [settings.distance_rate, settings.duration_rate]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  async updateSettings(settings: Settings): Promise<boolean> {
    try {
      // Check if settings exist
      const existingSettings = await this.getSettings();
      if (!existingSettings) {
        // Create new settings if they don't exist
        await this.createSettings(settings);
        return true;
      }

      // Update existing settings
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE settings SET distance_rate = ?, duration_rate = ? WHERE id = ?',
        [settings.distance_rate, settings.duration_rate, existingSettings.id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default new SettingsModel();
