import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { Colors } from '../lib/theme';
import { addNotificationResponseListener, clearBadge } from '../lib/push';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Tapping a notification deep-links to the relevant screen. The payload carries the
  // web app's path, which is mapped here onto the mobile route tree.
  useEffect(() => {
    if (!user) return;

    const subscription = addNotificationResponseListener(({ link, type }) => {
      clearBadge();
      if (type === 'NEW_MESSAGE') {
        router.push('/(tabs)/chat');
      } else if (type === 'NEW_EVENT' || type === 'CANCELLED_EVENT') {
        router.push('/(tabs)/calendar');
      } else if (link?.startsWith('/media')) {
        router.push('/(tabs)');
      } else {
        router.push('/(tabs)');
      }
    });

    return () => subscription.remove();
  }, [user, router]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="team/[id]" options={{ title: 'Team Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="chat/[teamId]" options={{ title: 'Chat', headerBackTitle: 'Back' }} />
        <Stack.Screen name="payments" options={{ title: 'Payments', headerBackTitle: 'Back' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="standings" options={{ title: 'Standings', headerBackTitle: 'Back' }} />
        <Stack.Screen name="availability" options={{ title: 'Availability', headerBackTitle: 'Back' }} />
        <Stack.Screen name="files" options={{ title: 'Team Files', headerBackTitle: 'Back' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
