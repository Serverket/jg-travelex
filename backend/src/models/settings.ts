import supabase from '../config/db';

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
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async createSettings(settings: Settings): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .insert({
          distance_rate: settings.distance_rate,
          duration_rate: settings.duration_rate
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
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
      const { error } = await supabase
        .from('settings')
        .update({
          distance_rate: settings.distance_rate,
          duration_rate: settings.duration_rate
        })
        .eq('id', existingSettings.id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new SettingsModel();
