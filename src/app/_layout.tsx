import { Bungee_400Regular } from '@expo-google-fonts/bungee';
import { Manrope_400Regular, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { palette } from '@/constants/theme';
import { AppProvider } from '@/providers/app-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Bungee: Bungee_400Regular,
    Manrope: Manrope_400Regular,
    ManropeBold: Manrope_700Bold,
  });

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, title: 'My Little League', contentStyle: { backgroundColor: palette.ink } }} />
    </AppProvider>
  );
}
