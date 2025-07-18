/**
 * Base API service for handling HTTP requests
 */
import { authService } from './authService';

// Use environment variable with fallback to local development URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiService = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} - Response data
   */
  async get(endpoint) {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<any>} - Response data
   */
  async post(endpoint, data) {
    try {
      const token = authService.getToken();
      console.log(`Making POST request to ${API_BASE_URL}${endpoint} with data:`, JSON.stringify(data, null, 2));
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      });

      // Parse response even if it's an error
      const responseText = await response.text();
      let parsedResponse;
      try {
        parsedResponse = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        parsedResponse = { raw: responseText };
      }

      if (!response.ok) {
        console.error(`API POST Error ${response.status}:`, parsedResponse);
        const error = new Error(`Error ${response.status}: ${response.statusText}`);
        error.response = { status: response.status, data: parsedResponse };
        throw error;
      }

      return parsedResponse;
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<any>} - Response data
   */
  async put(endpoint, data) {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} - Response data
   */
  async delete(endpoint) {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  },
};
