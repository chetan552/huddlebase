import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/theme';

interface Team { id: string; name: string; color: string; memberCount: number; }

export default function ChatScreen() {
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadTeams = useCallback(async () => {
        const res = await api<Team[]>('/api/teams');
        if (res.success && res.data) setTeams(res.data);
    }, []);

    useFocusEffect(useCallback(() => { loadTeams(); }, [loadTeams]));

    const onRefresh = async () => { setRefreshing(true); await loadTeams(); setRefreshing(false); };

    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                keyExtractor={(t) => t.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                renderItem={({ item: team }) => (
                    <TouchableOpacity style={styles.channel} onPress={() => router.push(`/chat/${team.id}`)}>
                        <View style={[styles.avatar, { backgroundColor: team.color }]}>
                            <Text style={styles.avatarText}>{team.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.channelName}>{team.name}</Text>
                            <Text style={styles.channelMeta}>{team.memberCount} members · Team channel</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyTitle}>No Channels</Text>
                        <Text style={styles.emptyDesc}>Join a team to start chatting</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    list: { padding: Spacing.lg },
    channel: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
    avatar: { width: 44, height: 44, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
    info: { flex: 1, marginLeft: Spacing.md },
    channelName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    channelMeta: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
    arrow: { fontSize: FontSize.xxl, color: Colors.textTertiary },
    empty: { alignItems: 'center', padding: Spacing.xxxl * 2 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
    emptyDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
