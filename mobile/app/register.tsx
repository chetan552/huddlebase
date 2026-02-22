import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
    KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/theme';

const ROLES = [
    { value: 'COACH', label: 'Coach', icon: '🏅', desc: 'Manage your team' },
    { value: 'PLAYER', label: 'Player', icon: '⚽', desc: 'Track your stats' },
    { value: 'PARENT', label: 'Parent', icon: '👨‍👩‍👧', desc: 'Stay connected' },
];

export default function RegisterScreen() {
    const { register } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('PLAYER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');
        const result = await register(name, email, password, role);
        if (!result.success) {
            setError(result.error || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>⚡ HuddleBase</Text>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join thousands of teams</Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <Text style={styles.sectionTitle}>I am a...</Text>
                    <View style={styles.roleRow}>
                        {ROLES.map((r) => (
                            <TouchableOpacity
                                key={r.value}
                                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                                onPress={() => setRole(r.value)}
                            >
                                <Text style={styles.roleIcon}>{r.icon}</Text>
                                <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} placeholder="John Smith" placeholderTextColor={Colors.textTertiary}
                            value={name} onChangeText={setName} />

                        <Text style={styles.label}>Email</Text>
                        <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.textTertiary}
                            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

                        <Text style={styles.label}>Password</Text>
                        <TextInput style={styles.input} placeholder="6+ characters" placeholderTextColor={Colors.textTertiary}
                            value={password} onChangeText={setPassword} secureTextEntry />

                        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.xxl, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: Spacing.xxl },
    logo: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
    subtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
    errorBox: { backgroundColor: Colors.dangerBg, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.danger + '40' },
    errorText: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'center' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md },
    roleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
    roleCard: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
    roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
    roleIcon: { fontSize: 28 },
    roleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    roleLabelActive: { color: Colors.primary },
    form: { gap: Spacing.sm },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
    input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.lg, fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.md },
    button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
    buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl, paddingBottom: Spacing.xxxl },
    footerText: { color: Colors.textTertiary, fontSize: FontSize.md },
    footerLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
});
