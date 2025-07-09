import { apiService } from './apiService';

// Session token key constants
const TOKEN_KEY = 'jgex_token';
const USER_KEY = 'jgex_user';

/**
 * Authentication service
 */
export const authService = {
  /**
   * Login user
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<object>} - User data and token
   */
  async login(username, password) {
    try {
      const response = await apiService.post('/users/login', { username, password });
      
      // Even if the API doesn't return a token, we'll create a session
      // by storing user data and a timestamp as our session identifier
      const sessionData = {
        user: response.user || response,
        token: response.token || `session_${Date.now()}`,
        timestamp: Date.now()
      };
      
      // Store session data in localStorage
      localStorage.setItem(TOKEN_KEY, sessionData.token);
      localStorage.setItem(USER_KEY, JSON.stringify(sessionData.user));
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
