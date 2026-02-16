/**
 * API configuration
 * Provides the base URL for backend API calls
 */

/**
 * Get the API base URL from environment variables
 * Falls back to localhost if not configured
 */
export function getApiBaseUrl(): string {
  // In browser with Vite, environment variables are available via import.meta.env
  // In test environment, we'll use the default or mock it
  if (typeof window !== 'undefined') {
    try {
      // Access Vite environment variables
      const viteEnv = (import.meta as any).env;
      if (viteEnv && viteEnv.VITE_API_BASE_URL) {
        return viteEnv.VITE_API_BASE_URL;
      }
    } catch (e) {
      // Fallback if import.meta is not available
    }
  }
  
  return 'http://localhost:3000';
}

/**
 * API base URL constant
 */
export const API_BASE_URL = getApiBaseUrl();
