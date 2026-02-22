import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, getAvatarColor, getInitials, formatDate } from '../../lib/theme';

interface TeamDetail { id: string; name: string; sport: string; season: string | null; color: string; memberCount: number; }
interface Member { id: string; userName: string; userEmail: string; role: string; position: string | null; jerseyNumber: number | null; }
interface Event { id: string; title: string; type: string; startTime: string; location: string | null; }

const roleColors: Record<string, string> = { COACH: Colors.coach, PLAYER: Colors.player, PARENT: Colors.parent, MANAGER: Colors.manager };

export default function TeamDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        const [teamsRes, rosterRes, eventsRes] = await Promise.all([
            api('/api/teams'),
            api('/api/roster'),
            api('/api/events'),
        ]);
        if (teamsRes.success) {
            const found = teamsRes.data.find((t: TeamDetail) => t.id === id);
            if (found) setTeam(found);
        }
        if (rosterRes.success) {
            setMembers(rosterRes.data.filter((m: Member & { teamId: string }) => m.teamId === id));
        }
        if (eventsRes.success) {
            setEvents(eventsRes.data.filter((e: Event & { teamId: string }) =>
                e.teamId === id && new Date(e.startTime) > new Date()
            ).slice(0, 5));
        }
    }, [id]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

    if (!team) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
            {/* Team Header */}
            <View style={[styles.headerBg, { backgroundColor: team.color + '30' }]}>
                <View style={[styles.teamIcon, { backgroundColor: team.color }]}>
                    <Text style={styles.teamIconText}>{team.name.charAt(0)}</Text>
                </View>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.teamMeta}>{team.sport}{team.season ? ` · ${team.season}` : ''}</Text>
            </View>

            {/* Roster */}
            <Text style={styles.sectionTitle}>Roster ({members.length})</Text>
            {members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(m.userName) }]}>
                        <Text style={styles.memberAvatarText}>{getInitials(m.userName)}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.userName}</Text>
                        <Text style={styles.memberEmail}>{m.userEmail}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: (roleColors[m.role] || Colors.other) + '20' }]}>
                        <Text style={[styles.roleText, { color: roleColors[m.role] || Colors.other }]}>{m.role}</Text>
                    </View>
                    {m.jerseyNumber !== null && (
                        <Text style={styles.jersey}>#{m.jerseyNumber}</Text>
                    )}
                </View>
            ))}

            {/* Upcoming events */}
            <Text style={styles.sectionTitle}>Upcoming Events ({events.length})</Text>
            {events.length === 0 ? (
                <Text style={styles.noData}>No upcoming events</Text>
            ) : (
                events.map((e) => (
                    <TouchableOpacity
                        key={e.id}
                        style={styles.eventRow}
                        onPress={() => router.push(`/event/${e.id}`)}
                    >
                        <View style={styles.eventDate}>
                            <Text style={styles.eventDateText}>{formatDate(e.startTime)}</Text>
                        </View>
                        <View style={styles.eventInfo}>
                            <Text style={styles.eventTitle}>{e.title}</Text>
                            {e.location && <Text style={styles.eventLocation}>📍 {e.location}</Text>}
                        </View>
                    </TouchableOpacity>
                ))
            )}
            <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loading: { color: Colors.textSecondary, textAlign: 'center', marginTop: 100 },
    headerBg: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingTop: Spacing.xl },
    teamIcon: { width: 72, height: 72, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    teamIconText: { color: '#fff', fontSize: FontSize.hero, fontWeight: '800' },
    teamName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
    teamMeta: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, padding: Spacing.lg, paddingBottom: Spacing.sm },
    memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: 1, padding: Spacing.md, borderRadius: BorderRadius.sm },
    memberAvatar: { width: 36, height: 36, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
    memberAvatarText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
    memberInfo: { flex: 1, marginLeft: Spacing.md },
    memberName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    memberEmail: { fontSize: FontSize.xs, color: Colors.textTertiary },
    roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginRight: Spacing.sm },
    roleText: { fontSize: FontSize.xs, fontWeight: '600' },
    jersey: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary },
    eventRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.sm },
    eventDate: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
    eventDateText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
    eventInfo: { flex: 1, marginLeft: Spacing.md },
    eventTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    eventLocation: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
    noData: { color: Colors.textTertiary, fontSize: FontSize.md, paddingHorizontal: Spacing.lg },
});
