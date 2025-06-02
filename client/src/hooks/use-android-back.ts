import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocation } from 'wouter';

export function useAndroidBack() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleBackButton = () => {
      // Define navigation hierarchy
      const navigationMap: Record<string, string> = {
        '/search': '/',
        '/mindmap': '/',
        '/stats': '/',
        '/api-tokens': '/',
        '/admin': '/',
        '/auth': '/',
      };

      // Handle entry pages - go back to home
      if (location.startsWith('/entry/')) {
        setLocation('/');
        return;
      }

      // Handle mapped routes
      if (navigationMap[location]) {
        setLocation(navigationMap[location]);
        return;
      }

      // Default case - if we're at home, allow app to close
      if (location === '/') {
        App.exitApp();
        return;
      }

      // For any other route, go to home
      setLocation('/');
    };

    // Listen for the hardware back button
    let cleanup: (() => void) | undefined;
    
    const setupListener = async () => {
      const handle = await App.addListener('backButton', handleBackButton);
      cleanup = () => handle.remove();
    };

    setupListener();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [location, setLocation]);
}