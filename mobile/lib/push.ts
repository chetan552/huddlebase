import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * Push notification registration.
 *
 * Requires an EAS project id — Expo needs it to mint a push token. It is read from
 * app.json (`extra.eas.projectId`), which `eas init` fills in. Without it,
 * registration is skipped rather than throwing, so the app still runs.
 */

const STORED_TOKEN_KEY = 'huddlebase_push_token';

// Show an alert even when the app is in the foreground: a cancelled game an hour
// before kickoff should interrupt, not sit silently in the tray.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Read whether permission was granted.
 *
 * expo-notifications types `NotificationPermissionsStatus` as extending
 * `PermissionResponse` imported from `expo`, but the installed `expo` build doesn't
 * re-export that type — so the interface resolves with no members and both `granted`
 * and `status` appear missing to TypeScript. The values are present at runtime, so
 * this reads them through a narrow local shape.
 */
async function readPermission(
    request: Promise<unknown>,
): Promise<boolean> {
    const result = (await request) as { granted?: boolean; status?: string };
    return result.granted ?? result.status === 'granted';
}

function getProjectId(): string | undefined {
    return (
        Constants.expoConfig?.extra?.eas?.projectId ??
        // Bare/older manifests expose it here instead.
        (Constants as any)?.easConfig?.projectId
    );
}

/**
 * Ask for permission, obtain an Expo push token, and register it with the API.
 * Safe to call on every launch — the server upserts by token.
 *
 * Returns the token, or null when push isn't available (simulator, denied
 * permission, or no EAS project configured).
 */
export async function registerForPushNotifications(): Promise<string | null> {
    // Simulators and emulators can't receive push.
    if (!Device.isDevice) {
        console.info('[Push] Skipped: push notifications need a physical device');
        return null;
    }

    try {
        // Android needs a channel before any notification will display.
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Team updates',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#3b82f6',
            });
        }

        const existing = await readPermission(Notifications.getPermissionsAsync());
        const granted = existing || (await readPermission(Notifications.requestPermissionsAsync()));
        if (!granted) {
            console.info('[Push] Permission not granted');
            return null;
        }

        const projectId = getProjectId();
        if (!projectId) {
            console.warn('[Push] No EAS projectId found; run `eas init` to enable push');
            return null;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!token) return null;

        await api('/api/push/register', {
            method: 'POST',
            body: JSON.stringify({
                token,
                platform: Platform.OS === 'android' ? 'android' : 'ios',
                deviceName: Device.deviceName ?? undefined,
            }),
        });

        await AsyncStorage.setItem(STORED_TOKEN_KEY, token);
        return token;
    } catch (error) {
        // Never let a push failure block sign-in.
        console.error('[Push] Registration failed:', error);
        return null;
    }
}

/**
 * Deregister this device. Called on sign-out so a shared phone stops receiving the
 * previous account's alerts.
 */
export async function unregisterPushNotifications(): Promise<void> {
    try {
        const token = await AsyncStorage.getItem(STORED_TOKEN_KEY);
        if (!token) return;
        await api(`/api/push/register?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
        await AsyncStorage.removeItem(STORED_TOKEN_KEY);
    } catch (error) {
        console.error('[Push] Deregistration failed:', error);
    }
}

/**
 * Subscribe to taps on a notification. The payload carries `link`, the in-app path
 * the web build uses, which the caller maps onto a mobile route.
 */
export function addNotificationResponseListener(
    onTap: (data: { link?: string | null; type?: string; conversationId?: string }) => void,
) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        onTap({
            link: (data.link as string) ?? null,
            type: data.type as string | undefined,
            conversationId: data.conversationId as string | undefined,
        });
    });
}

/** Clear the app-icon badge, e.g. once the user opens their notifications. */
export async function clearBadge(): Promise<void> {
    try {
        await Notifications.setBadgeCountAsync(0);
    } catch { /* badge support is platform-dependent */ }
}
