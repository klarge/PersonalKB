import { Capacitor } from "@capacitor/core";

export class ServerConfig {
  private static readonly STORAGE_KEY = "serverUrl";
  private static readonly DEFAULT_URL = "";

  static getServerUrl(): string {
    if (!Capacitor.isNativePlatform()) {
      // In web mode, use current origin
      return window.location.origin;
    }

    // In native mode, get from storage
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || this.DEFAULT_URL;
  }

  static setServerUrl(url: string): void {
    localStorage.setItem(this.STORAGE_KEY, url);
  }

  static isConfigured(): boolean {
    if (!Capacitor.isNativePlatform()) {
      return true; // Web mode is always "configured"
    }
    
    const url = this.getServerUrl();
    return url !== this.DEFAULT_URL && url.length > 0;
  }

  static clearConfiguration(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static buildApiUrl(path: string): string {
    const baseUrl = this.getServerUrl();
    return `${baseUrl}${path}`;
  }
}