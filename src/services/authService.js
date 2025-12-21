/**
 * Authentication service for handling user login/logout
 */
import { supabaseService } from './supabase';

// Session storage key constants
const USER_KEY = 'jgex_user';
const SESSION_KEY = 'jgex_session';

export const authService = {
  /**
   * Login user with username and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<object>} - Login response with user data
   */
  async login(email, password) {
    const response = await supabaseService.signIn(email, password);
    
    const profileData = response.profile || {};
    const combinedUser = {
      id: response.user?.id,
      email: response.user?.email,
      ...profileData
    };

    if (response.session && combinedUser.id) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(response.session));
      localStorage.setItem(USER_KEY, JSON.stringify(combinedUser));
    }
    
    return {
      message: 'Login successful',
      user: combinedUser,
      profile: profileData,
      session: response.session
    };
  },

  async register(email, password, fullName, username) {
    const response = await supabaseService.signUp(email, password, {
      full_name: fullName,
      username: username
    });
    
    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: response.user
    };
  },

  /**
   * Logout user
   */
  async logout() {
    let signOutError;
    try {
      await supabaseService.signOut();
    } catch (error) {
      signOutError = error;
    } finally {
      // Always clear local storage even if signOut fails
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
    if (signOutError) throw signOutError;
  },

  /**
   * Get current user
   * @returns {object|null} - User data or null if not logged in
   */
  async getCurrentUser() {
    try {
      // First check if we have a session
      const session = await supabaseService.getSession();
      if (!session) {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Get the current user from Supabase Auth
      const user = await supabaseService.getUser();
      if (!user) {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Get the user profile
      const profile = await supabaseService.getProfile(user.id);
      
      const userData = {
        id: user.id,
        email: user.email,
        ...profile
      };

      // Update localStorage with fresh data
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  getCachedUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is logged in
   * @returns {boolean} - True if user is logged in
   */
  isAuthenticated() {
    return this.getCachedUser() !== null;
  },

  async refreshSession() {
    try {
      const session = await supabaseService.getSession();
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  },

  async updateProfile(updates) {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updatedProfile = await supabaseService.updateProfile(user.id, updates);
    
    // Update cached user data
    const userData = {
      ...user,
      ...updatedProfile
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    return updatedProfile;
  },

  async getAllProfiles() {
    return await supabaseService.getAllProfiles();
  },

  async getProfile(userId) {
    return await supabaseService.getProfile(userId);
  }
};

