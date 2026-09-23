import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ErrorScreen } from '@/components/ErrorScreen';
import { ToastProvider } from '@/components/Toast';
import { listCategories } from '@/db/categories';
import { initDb } from '@/db/init';
import { listSettings } from '@/db/settings';
import { DbVersionProvider } from '@/hooks/DbVersionContext';
import { CATEGORIES_KEY } from '@/hooks/useCategories';
import { primeQuery } from '@/hooks/useDbQuery';
import { SETTINGS_KEY } from '@/hooks/useSettings';
import { colors } from '@/lib/colors';
import { addReminderTapListener } from '@/lib/notifications';
import { registerServiceWorker } from '@/lib/serviceWorker';

/**
 * Settings and categories are tiny and every screen reads them, so they load
 * before the first render — no flash of the default currency or a missing chip.
 */
async function startDb(): Promise<void> {
  await initDb();
  primeQuery(SETTINGS_KEY, await listSettings());
  primeQuery(CATEGORIES_KEY, await listCategories());
}

SplashScreen.preventAutoHideAsync();
registerServiceWorker();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const router = useRouter();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);
  const [dbAttempt, setDbAttempt] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  useEffect(() => {
    startDb().then(
      () => setDbReady(true),
      (e: Error) => setDbError(e)
    );
  }, [dbAttempt]);

  // A font that fails to load (offline cold start, blocked CDN) must not hold the
  // app on a blank screen forever — the system font is an acceptable fallback.
  useEffect(() => {
    if (fontError) console.error('font load failed', fontError);
  }, [fontError]);
  const ready = (fontsLoaded || fontError !== null) && dbReady;

  useEffect(() => {
    if (ready || dbError) SplashScreen.hideAsync();
  }, [ready, dbError]);

  // Tapping the nightly reminder lands straight on Log.
  useEffect(() => addReminderTapListener(() => router.push('/log')), [router]);

  return (
    // Head sits outside the readiness gate so the exported HTML carries a title —
    // static rendering never gets as far as opening the database.
    <>
      <Head>
        <title>Betterment</title>
      </Head>
      {dbError ? (
        <ErrorScreen
          error={dbError}
          retry={() => {
            setDbError(null);
            setDbAttempt((n) => n + 1);
          }}
        />
      ) : ready ? (
        <DbVersionProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ToastProvider>
        </DbVersionProvider>
      ) : null}
    </>
  );
}
