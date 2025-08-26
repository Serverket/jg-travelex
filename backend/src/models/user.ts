import supabase from '../config/db';

export interface User {
  id?: number;
  username: string;
  password?: string; // Optional for public queries
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  created_at?: Date;
  updated_at?: Date;
}

export interface UserWithPassword extends User {
  password: string; // Required for authentication
}

class UserModel {
  async findAll(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, role, created_at, updated_at');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, role, created_at, updated_at')
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

  async findByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
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

  async create(user: User): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: user.username,
          password: user.password,
          name: user.name,
          email: user.email,
          role: user.role || 'user'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, user: Partial<User>): Promise<boolean> {
    try {
      // Filter out fields that shouldn't be updated
      const fieldsToUpdate = Object.keys(user).filter(
        key => key !== 'id' && key !== 'created_at' && key !== 'updated_at'
      );
      
      if (fieldsToUpdate.length === 0) return false;

      const updateData: any = {};
      fieldsToUpdate.forEach(field => {
        updateData[field] = (user as any)[field];
      });
      
      const { error } = await supabase
        .from('users')
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
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new UserModel();
