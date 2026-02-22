import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, setToken, removeToken, getToken } from './api';

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = useCallback(async () => {
        const token = await getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await api<User>('/api/auth/me');
            if (res.success && res.data) {
                setUser(res.data);
            } else {
                await removeToken();
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (email: string, password: string) => {
        try {
            const res = await api<User>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            if (res.success && res.data && res.token) {
                await setToken(res.token);
                setUser(res.data);
                return { success: true };
            }
            return { success: false, error: res.error || 'Login failed' };
        } catch {
            return { success: false, error: 'Network error' };
        }
    };

    const register = async (name: string, email: string, password: string, role: string) => {
        try {
            const res = await api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role }),
            });
            if (res.success) {
                return await login(email, password);
            }
            return { success: false, error: res.error || 'Registration failed' };
        } catch {
            return { success: false, error: 'Network error' };
        }
    };

    const logout = async () => {
        await removeToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
