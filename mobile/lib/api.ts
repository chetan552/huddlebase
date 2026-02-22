import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use your machine's IP for physical device, or localhost for simulator
const DEV_URL = Platform.select({
    android: 'http://10.0.2.2:3000',   // Android emulator -> host machine
    default: 'http://localhost:3000',    // iOS simulator / web
});

export const API_BASE = __DEV__ ? DEV_URL : 'https://your-production-url.com';

const TOKEN_KEY = 'huddlebase_token';

export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

interface FetchOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
}

export async function api<T = any>(
    path: string,
    options: FetchOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; token?: string }> {
    const token = await getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        const json = await res.json();
        return json;
    } catch (error) {
        console.error(`API error [${path}]:`, error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}
