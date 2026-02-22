import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/theme';

interface Team { id: string; name: string; sport: string; season: string | null; color: string; memberCount: number; upcomingEvents: number; }

export default function TeamsScreen() {
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadTeams = useCallback(async () => {
        const res = await api<Team[]>('/api/teams');
        if (res.success && res.data) setTeams(res.data);
    }, []);

    useFocusEffect(useCallback(() => { loadTeams(); }, [loadTeams]));

    const onRefresh = async () => { setRefreshing(true); await loadTeams(); setRefreshing(false); };

    const renderTeam = ({ item: team }: { item: Team }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/team/${team.id}`)}>
            <View style={[styles.avatar, { backgroundColor: team.color }]}>
                <Text style={styles.avatarText}>{team.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.teamMeta}>{team.sport}{team.season ? ` · ${team.season}` : ''}</Text>
            </View>
            <View style={styles.statsCol}>
                <View style={styles.miniStat}>
                    <Text style={styles.miniValue}>{team.memberCount}</Text>
                    <Text style={styles.miniLabel}>Members</Text>
                </View>
                <View style={styles.miniStat}>
                    <Text style={styles.miniValue}>{team.upcomingEvents}</Text>
                    <Text style={styles.miniLabel}>Events</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={teams}
                keyExtractor={(t) => t.id}
                renderItem={renderTeam}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>👥</Text>
                        <Text style={styles.emptyTitle}>No Teams Yet</Text>
                        <Text style={styles.emptyDesc}>Create a team from the web app to get started.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    list: { padding: Spacing.lg },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
    avatar: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    info: { flex: 1, marginLeft: Spacing.md },
    teamName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    teamMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
    statsCol: { flexDirection: 'row', gap: Spacing.lg },
    miniStat: { alignItems: 'center' },
    miniValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    miniLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },
    empty: { alignItems: 'center', padding: Spacing.xxxl * 2 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
    emptyDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
