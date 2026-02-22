import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api, API_BASE, getToken } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, getAvatarColor, getInitials } from '../../lib/theme';
import * as ImagePicker from 'expo-image-picker';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string | null;
    read: boolean;
    createdAt: string;
}

export default function MoreScreen() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [uploading, setUploading] = useState(false);

    const loadNotifications = useCallback(async () => {
        const res = await api<Notification[]>('/api/notifications');
        if (res.success && res.data) {
            setNotifications(res.data as any);
            setUnreadCount((res as any).unreadCount || 0);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

    const markAllRead = async () => {
        await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) });
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleAvatarUpload = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission required', 'Camera roll access is needed to set your avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled) return;
        setUploading(true);

        try {
            const asset = result.assets[0];
            const token = await getToken();
            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: 'avatar.jpg',
                type: 'image/jpeg',
            } as any);

            const uploadRes = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });
            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error(uploadData.error);

            await api('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({ avatar: uploadData.data.url }),
            });

            if (refreshUser) await refreshUser();
            Alert.alert('Success', 'Avatar updated!');
        } catch (err: any) {
            Alert.alert('Upload failed', err?.message || 'Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const notifIcon = (type: string) => {
        switch (type) {
            case 'NEW_EVENT': return '📅';
            case 'NEW_MESSAGE': return '💬';
            case 'INVOICE_DUE': return '💳';
            default: return '🔔';
        }
    };

    const menuItems = [
        { icon: '💵', label: 'Payments', desc: 'Invoices & finances', onPress: () => router.push('/payments') },
        {
            icon: '🎨',
            label: 'Appearance',
            desc: 'Dark mode (always on)',
            onPress: () => Alert.alert('Appearance', 'HuddleBase is currently optimized exclusively for dark mode to provide a premium glassmorphic experience.')
        },
        { icon: '❓', label: 'Help & Support', desc: 'Get help with HuddleBase', onPress: () => { } },
    ];

    return (
        <ScrollView style={styles.container}>
            {/* Profile card */}
            <TouchableOpacity style={styles.profileCard} onPress={handleAvatarUpload} activeOpacity={0.7}>
                {user?.avatar ? (
                    <Image source={{ uri: `${API_BASE}${user.avatar}` }} style={styles.avatarImg} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: getAvatarColor(user?.name || '') }]}>
                        <Text style={styles.avatarText}>{getInitials(user?.name || '')}</Text>
                    </View>
                )}
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{user?.name}</Text>
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role}</Text>
                    </View>
                </View>
                <View style={styles.cameraIcon}>
                    <Text style={{ fontSize: 12 }}>{uploading ? '⏳' : '📷'}</Text>
                </View>
            </TouchableOpacity>

            {/* Notifications section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markRead}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                    <Text style={styles.emptyNotifText}>No notifications yet</Text>
                </View>
            ) : (
                notifications.slice(0, 15).map((n) => (
                    <View key={n.id} style={[styles.notifItem, !n.read && styles.notifUnread]}>
                        <Text style={styles.notifIcon}>{notifIcon(n.type)}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                            <Text style={styles.notifBody} numberOfLines={1}>{n.body}</Text>
                            <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
                        </View>
                        {!n.read && <View style={styles.notifDot} />}
                    </View>
                ))
            )}

            {/* Menu items */}
            <View style={{ marginTop: Spacing.lg }}>
                {menuItems.map((item, i) => (
                    <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <View style={styles.menuInfo}>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Text style={styles.menuDesc}>{item.desc}</Text>
                        </View>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>HuddleBase v1.0.0</Text>
            <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.xl },
    avatar: { width: 56, height: 56, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 56, height: 56, borderRadius: BorderRadius.full },
    avatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    profileInfo: { flex: 1, marginLeft: Spacing.lg },
    profileName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    profileEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
    roleBadge: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginTop: Spacing.xs },
    roleText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary },
    cameraIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: Spacing.lg, left: Spacing.xl + 40 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    markRead: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
    emptyNotif: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center' },
    emptyNotifText: { fontSize: FontSize.sm, color: Colors.textTertiary },
    notifItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    notifUnread: { backgroundColor: Colors.primaryBg },
    notifIcon: { fontSize: 18, marginRight: Spacing.sm, marginTop: 2 },
    notifTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    notifBody: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
    notifTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
    notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: 1, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    menuIcon: { fontSize: 20, width: 32 },
    menuInfo: { flex: 1 },
    menuLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    menuDesc: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 1 },
    menuArrow: { fontSize: FontSize.xxl, color: Colors.textTertiary },
    logoutButton: { marginHorizontal: Spacing.lg, marginTop: Spacing.xxl, backgroundColor: Colors.dangerBg, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.danger + '30' },
    logoutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.danger },
    version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xxl },
});
