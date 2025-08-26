import supabase from '../config/db';

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
      const { data, error } = await supabase
        .from('surcharge_factors')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<SurchargeFactor | null> {
    try {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .select('*')
        .eq('id', id)
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

  async create(surchargeFactor: SurchargeFactor): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .insert({
          name: surchargeFactor.name,
          rate: surchargeFactor.rate,
          type: surchargeFactor.type
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, surchargeFactor: Partial<SurchargeFactor>): Promise<boolean> {
    try {
      // Filter out fields that shouldn't be updated
      const fieldsToUpdate = Object.keys(surchargeFactor).filter(
        key => key !== 'id' && key !== 'created_at' && key !== 'updated_at'
      );
      
      if (fieldsToUpdate.length === 0) return false;

      const updateData: any = {};
      fieldsToUpdate.forEach(field => {
        updateData[field] = (surchargeFactor as any)[field];
      });
      
      const { error } = await supabase
        .from('surcharge_factors')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('surcharge_factors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new SurchargeFactorModel();
