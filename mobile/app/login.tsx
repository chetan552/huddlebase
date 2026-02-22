import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/theme';

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        setError('');
        const result = await login(email, password);
        if (!result.success) {
            setError(result.error || 'Login failed');
        }
        setLoading(false);
    };

    const handleDemo = async () => {
        setLoading(true);
        setError('');
        const result = await login('coach@huddlebase.com', 'password123');
        if (!result.success) setError(result.error || 'Demo login failed');
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.logo}>⚡ HuddleBase</Text>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to manage your teams</Text>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={Colors.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.demoButton} onPress={handleDemo} disabled={loading}>
                        <Text style={styles.demoButtonText}>🎯 Try Demo Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/register')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1, justifyContent: 'center', padding: Spacing.xxl },
    header: { alignItems: 'center', marginBottom: Spacing.xxxl },
    logo: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.md },
    title: { fontSize: FontSize.hero, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
    subtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
    errorBox: { backgroundColor: Colors.dangerBg, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.danger + '40' },
    errorText: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'center' },
    form: { gap: Spacing.sm },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
    input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.md },
    button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
    buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
    demoButton: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
    demoButtonText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl },
    footerText: { color: Colors.textTertiary, fontSize: FontSize.md },
    footerLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
});
