import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/theme';

interface SeasonRecord {
    wins: number;
    losses: number;
    draws: number;
    played: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifferential: number;
    form: ('WIN' | 'LOSS' | 'DRAW')[];
}

interface Game {
    id: string;
    startTime: string;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: 'WIN' | 'LOSS' | 'DRAW' | null;
    scored: boolean;
    title: string;
}

interface TeamStanding {
    id: string;
    name: string;
    color: string;
    season: string | null;
    record: SeasonRecord;
    recordLabel: string;
    streakLabel: string;
    recentGames: Game[];
}

const RESULT_COLOR: Record<string, string> = {
    WIN: Colors.success,
    LOSS: Colors.danger,
    DRAW: Colors.warning,
};

export default function StandingsScreen() {
    const [teams, setTeams] = useState<TeamStanding[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const res = await api<{ teams: TeamStanding[] }>('/api/standings');
        if (res.success && res.data) setTeams(res.data.teams);
        setLoading(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    const anyGames = teams.some((t) => t.record.played > 0);

    if (!anyGames) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>No results yet</Text>
                <Text style={styles.emptyText}>
                    Records appear here once games have final scores recorded.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
            }
        >
            {teams.map((team) => (
                <View key={team.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.teamDot, { backgroundColor: team.color }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.teamName}>{team.name}</Text>
                            {team.season ? <Text style={styles.teamSeason}>{team.season}</Text> : null}
                        </View>
                        <Text style={styles.recordLabel}>{team.recordLabel}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <Stat label="Played" value={String(team.record.played)} />
                        <Stat label="Win %" value={`${Math.round(team.record.winPct * 100)}%`} />
                        <Stat label="For" value={String(team.record.pointsFor)} />
                        <Stat label="Against" value={String(team.record.pointsAgainst)} />
                        <Stat label="Streak" value={team.streakLabel} />
                    </View>

                    {team.record.form.length > 0 && (
                        <View style={styles.formRow}>
                            <Text style={styles.formLabel}>Form</Text>
                            {team.record.form.map((r, i) => (
                                <View key={i} style={[styles.pip, { backgroundColor: RESULT_COLOR[r] + '33' }]}>
                                    <Text style={[styles.pipText, { color: RESULT_COLOR[r] }]}>
                                        {r === 'WIN' ? 'W' : r === 'LOSS' ? 'L' : 'D'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {team.recentGames.length > 0 && (
                        <View style={styles.gamesSection}>
                            <Text style={styles.sectionTitle}>Recent results</Text>
                            {team.recentGames.slice(0, 5).map((g) => (
                                <View key={g.id} style={styles.gameRow}>
                                    {g.result ? (
                                        <View style={[styles.pip, { backgroundColor: RESULT_COLOR[g.result] + '33' }]}>
                                            <Text style={[styles.pipText, { color: RESULT_COLOR[g.result] }]}>
                                                {g.result === 'WIN' ? 'W' : g.result === 'LOSS' ? 'L' : 'D'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.pip, { backgroundColor: Colors.border }]} />
                                    )}
                                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                                        <Text style={styles.gameTitle}>
                                            {g.opponentName ? `vs ${g.opponentName}` : g.title}
                                        </Text>
                                        <Text style={styles.gameDate}>
                                            {new Date(g.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <Text style={styles.gameScore}>
                                        {g.scored ? `${g.homeScore}–${g.awayScore}` : '—'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ))}
            <View style={{ height: Spacing.xxl }} />
        </ScrollView>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
    emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },
    card: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        margin: Spacing.lg, marginBottom: 0, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    teamDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
    teamName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    teamSeason: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
    recordLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
    stat: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
    formRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    formLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginRight: Spacing.sm },
    pip: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    pipText: { fontSize: 11, fontWeight: '700' },
    gamesSection: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
    sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase' },
    gameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
    gameTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    gameDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
    gameScore: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
});
