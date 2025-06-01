import { Capacitor } from '@capacitor/core';

// Mobile authentication utilities
export const isMobile = () => Capacitor.isNativePlatform();

// Storage keys for mobile app
const STORAGE_KEYS = {
  SERVER_URL: 'server_url',
  API_TOKEN: 'api_token',
  USER_DATA: 'user_data',
};

// Mobile storage interface
interface MobileStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

// Use Capacitor Preferences for mobile storage
const getMobileStorage = async (): Promise<MobileStorage> => {
  if (isMobile()) {
    const { Preferences } = await import('@capacitor/preferences');
    return {
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      getItem: async (key: string) => {
        const result = await Preferences.get({ key });
        return result.value;
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      },
    };
  } else {
    // Fallback to localStorage for web
    return {
      setItem: async (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      getItem: async (key: string) => {
        return localStorage.getItem(key);
      },
      removeItem: async (key: string) => {
        localStorage.removeItem(key);
      },
    };
  }
};

export const mobileAuth = {
  // Check if mobile app is configured
  async isConfigured(): Promise<boolean> {
    const storage = await getMobileStorage();
    const serverUrl = await storage.getItem(STORAGE_KEYS.SERVER_URL);
    const apiToken = await storage.getItem(STORAGE_KEYS.API_TOKEN);
    return !!(serverUrl && apiToken);
  },

  // Save server configuration
  async setServerUrl(url: string): Promise<void> {
    const storage = await getMobileStorage();
    // Ensure URL has protocol and remove trailing slash
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const cleanUrl = normalizedUrl.replace(/\/$/, '');
    await storage.setItem(STORAGE_KEYS.SERVER_URL, cleanUrl);
  },

  // Get server URL
  async getServerUrl(): Promise<string | null> {
    const storage = await getMobileStorage();
    return await storage.getItem(STORAGE_KEYS.SERVER_URL);
  },

  // Save API token and user data
  async saveAuth(apiToken: string, user: any): Promise<void> {
    const storage = await getMobileStorage();
    await storage.setItem(STORAGE_KEYS.API_TOKEN, apiToken);
    await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  // Get API token
  async getApiToken(): Promise<string | null> {
    const storage = await getMobileStorage();
    return await storage.getItem(STORAGE_KEYS.API_TOKEN);
  },

  // Get user data
  async getUserData(): Promise<any | null> {
    const storage = await getMobileStorage();
    const userData = await storage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  // Clear all auth data
  async clearAuth(): Promise<void> {
    const storage = await getMobileStorage();
    await storage.removeItem(STORAGE_KEYS.API_TOKEN);
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  },

  // Login with credentials (mobile)
  async login(serverUrl: string, email: string, password: string): Promise<{ user: any; apiToken: string }> {
    const response = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        deviceType: 'mobile',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    if (!data.apiToken) {
      throw new Error('Server did not return API token');
    }

    return data;
  },

  // Make authenticated API request
  async apiRequest(method: string, endpoint: string, data?: any): Promise<Response> {
    const serverUrl = await this.getServerUrl();
    const apiToken = await this.getApiToken();

    if (!serverUrl || !apiToken) {
      throw new Error('Not authenticated');
    }

    const url = `${serverUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Token expired, clear auth
      await this.clearAuth();
      throw new Error('Authentication expired');
    }

    return response;
  },
};