'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function NativeAppBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initNativePlugins() {
      // 1. Status Bar Setup - ensure NO overlay so it never overlaps time, wifi, battery
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlays({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch (e) {
        // Not on native device
      }

      // 2. Hide Splash Screen after React hydrates
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch (e) {
        // Not on native device
      }

      // 3. Android Hardware Back Button Handler
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
          if (pathname !== '/') {
            router.push('/');
          } else {
            App.exitApp();
          }
        });
      } catch (e) {
        // Not on native device
      }
    }

    initNativePlugins();
  }, [pathname, router]);

  return null;
}
