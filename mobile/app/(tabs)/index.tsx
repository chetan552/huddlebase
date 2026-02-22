import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, formatDate, formatTime } from '../../lib/theme';

interface Stats { teams: number; players: number; events: number; pendingPayments: number; }
interface Event { id: string; title: string; type: string; startTime: string; location: string | null; teamName: string; teamColor: string; }

const typeColors: Record<string, string> = { PRACTICE: Colors.practice, GAME: Colors.game, MEETING: Colors.meeting, OTHER: Colors.other };

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ teams: 0, players: 0, events: 0, pendingPayments: 0 });
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [teamsRes, eventsRes, invoicesRes, rosterRes] = await Promise.all([
      api('/api/teams'),
      api('/api/events'),
      api('/api/invoices'),
      api('/api/roster'),
    ]);
    if (teamsRes.success) setStats(s => ({ ...s, teams: teamsRes.data.length }));
    if (rosterRes.success) setStats(s => ({ ...s, players: rosterRes.data.length }));
    if (eventsRes.success) {
      const upcoming = eventsRes.data
        .filter((e: Event) => new Date(e.startTime) > new Date())
        .slice(0, 5);
      setEvents(upcoming);
      setStats(s => ({ ...s, events: upcoming.length }));
    }
    if (invoicesRes.success) {
      const pending = invoicesRes.data.filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE').length;
      setStats(s => ({ ...s, pendingPayments: pending }));
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const statCards = [
    { label: 'Teams', value: stats.teams, icon: '👥', color: Colors.primary },
    { label: 'Players', value: stats.players, icon: '🏃', color: Colors.success },
    { label: 'Events', value: stats.events, icon: '📅', color: Colors.warning },
    { label: 'Pending', value: stats.pendingPayments, icon: '💰', color: Colors.danger },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name} 👋</Text>
      </View>

      <View style={styles.statsRow}>
        {statCards.map((s) => (
          <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Upcoming Events</Text>
      {events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming events</Text>
        </View>
      ) : (
        events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => router.push(`/event/${event.id}`)}
          >
            <View style={[styles.eventStripe, { backgroundColor: typeColors[event.type] || Colors.other }]} />
            <View style={styles.eventContent}>
              <View style={styles.eventTop}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={[styles.typeBadge, { backgroundColor: (typeColors[event.type] || Colors.other) + '20' }]}>
                  <Text style={[styles.typeText, { color: typeColors[event.type] || Colors.other }]}>
                    {event.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.eventMeta}>
                {formatDate(event.startTime)} at {formatTime(event.startTime)}
              </Text>
              {event.location && <Text style={styles.eventLocation}>📍 {event.location}</Text>}
              <Text style={styles.eventTeam}>{event.teamName}</Text>
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
  header: { padding: Spacing.xxl, paddingTop: Spacing.lg },
  greeting: { fontSize: FontSize.md, color: Colors.textSecondary },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.xxl },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderLeftWidth: 3, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: Spacing.xs },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, paddingHorizontal: Spacing.xxl, marginBottom: Spacing.md },
  emptyCard: { marginHorizontal: Spacing.xxl, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.xxl, alignItems: 'center' },
  emptyText: { color: Colors.textTertiary, fontSize: FontSize.md },
  eventCard: { flexDirection: 'row', marginHorizontal: Spacing.xxl, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden' },
  eventStripe: { width: 4 },
  eventContent: { flex: 1, padding: Spacing.lg },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  eventTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  typeText: { fontSize: FontSize.xs, fontWeight: '600' },
  eventMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 2 },
  eventLocation: { fontSize: FontSize.sm, color: Colors.textTertiary },
  eventTeam: { fontSize: FontSize.xs, color: Colors.primary, marginTop: Spacing.xs, fontWeight: '600' },
});
