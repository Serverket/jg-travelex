import supabase from '../config/db';

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
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Discount | null> {
    try {
      const { data, error } = await supabase
        .from('discounts')
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

  async create(discount: Discount): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .insert({
          name: discount.name,
          rate: discount.rate,
          type: discount.type
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, discount: Partial<Discount>): Promise<boolean> {
    try {
      // Filter out fields that shouldn't be updated
      const fieldsToUpdate = Object.keys(discount).filter(
        key => key !== 'id' && key !== 'created_at' && key !== 'updated_at'
      );
      
      if (fieldsToUpdate.length === 0) return false;

      const updateData: any = {};
      fieldsToUpdate.forEach(field => {
        updateData[field] = (discount as any)[field];
      });
      
      const { error } = await supabase
        .from('discounts')
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
        .from('discounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new DiscountModel();
