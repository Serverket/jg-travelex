/**
 * Authentication service for handling user login/logout
 */
import { supabaseService } from './supabaseService';

// Session token key constants
const TOKEN_KEY = 'jgex_token';
const USER_KEY = 'jgex_user';

export const authService = {
  /**
   * Login user with username and password
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<object>} - Login response with user data
   */
  async login(username, password) {
    try {
      const response = await supabaseService.login(username, password);
      
      // Store user data in localStorage
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error
    }
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Get current user
   * @returns {object|null} - User data or null if not logged in
   */
  getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is logged in
   * @returns {boolean} - True if user is logged in
   */
  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },
  
  /**
   * Get auth token
   * @returns {string|null} - Auth token or null if not logged in
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
};
