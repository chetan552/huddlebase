import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, formatDate, formatTime } from '../../lib/theme';

interface Event { id: string; title: string; type: string; startTime: string; endTime: string | null; location: string | null; teamName: string; teamColor: string; description: string | null; uniform: string | null; }

interface RSVP { id: string; userId: string; userName: string; status: string; note: string | null; }

const typeColors: Record<string, string> = { PRACTICE: Colors.practice, GAME: Colors.game, MEETING: Colors.meeting, OTHER: Colors.other };
const statusColors: Record<string, string> = { GOING: Colors.success, PENDING: Colors.warning, NOT_GOING: Colors.danger };

export default function EventDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [rsvps, setRsvps] = useState<RSVP[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventRes, rsvpsRes] = await Promise.all([
                api<any>('/api/events'), // MVP shortcut: fetch all events and filter since we don't have a GET /api/events/:id yet
                api<RSVP[]>(`/api/events/${id}/rsvps`)
            ]);

            if (eventRes.success) {
                const ev = eventRes.data.find((e: Event) => e.id === id);
                if (ev) setEvent(ev);
            }
            if (rsvpsRes.success && rsvpsRes.data) {
                setRsvps(rsvpsRes.data);
            }
        } catch (error) {
            console.error('Failed to load event details:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const handleRsvp = async (status: string) => {
        const res = await api(`/api/events/${id}/rsvps`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        });
        if (res.success) {
            loadData();
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!event) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: Colors.textSecondary }}>Event not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
                    <Text style={{ color: Colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const myRsvp = rsvps.find(r => r.userId === user?.id)?.status || 'PENDING';

    return (
        <ScrollView style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + Spacing.md, Spacing.xxxl) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Event Details</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={styles.title}>{event.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: (typeColors[event.type] || Colors.other) + '20' }]}>
                        <Text style={[styles.typeText, { color: typeColors[event.type] || Colors.other }]}>
                            {event.type}
                        </Text>
                    </View>
                </View>

                <Text style={styles.teamName}>{event.teamName}</Text>

                <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailIcon}>📅</Text>
                        <Text style={styles.detailText}>{formatDate(event.startTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailIcon}>⏰</Text>
                        <Text style={styles.detailText}>
                            {formatTime(event.startTime)} {event.endTime ? `- ${formatTime(event.endTime)}` : ''}
                        </Text>
                    </View>
                    {event.location && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailIcon}>📍</Text>
                            <Text style={styles.detailText}>{event.location}</Text>
                        </View>
                    )}
                    {event.uniform && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailIcon}>👕</Text>
                            <Text style={styles.detailText}>{event.uniform}</Text>
                        </View>
                    )}
                </View>
                {event.description && (
                    <Text style={styles.description}>{event.description}</Text>
                )}
            </View>

            {/* RSVP Controls */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your RSVP</Text>
                <View style={styles.rsvpRow}>
                    {['GOING', 'PENDING', 'NOT_GOING'].map((status) => {
                        const isSelected = myRsvp === status;
                        const label = status === 'NOT_GOING' ? 'Not Going' : status === 'PENDING' ? 'Maybe' : 'Going';
                        return (
                            <TouchableOpacity
                                key={status}
                                onPress={() => handleRsvp(status)}
                                style={[
                                    styles.rsvpBtn,
                                    {
                                        backgroundColor: isSelected ? (statusColors[status] + '20') : Colors.surface,
                                        borderColor: isSelected ? statusColors[status] : Colors.border
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.rsvpText,
                                    { color: isSelected ? statusColors[status] : Colors.textSecondary }
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Team RSVPs */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team RSVPs ({rsvps.length})</Text>
                {rsvps.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No RSVPs yet</Text>
                    </View>
                ) : (
                    <View style={styles.rsvpList}>
                        {rsvps.map((rsvp) => (
                            <View key={rsvp.id} style={styles.rsvpItem}>
                                <Text style={styles.rsvpName} numberOfLines={1}>{rsvp.userName}</Text>
                                <View style={[styles.rsvpStatusBadge, { backgroundColor: (statusColors[rsvp.status] || Colors.surface) + '20' }]}>
                                    <Text style={[styles.rsvpStatusText, { color: statusColors[rsvp.status] || Colors.textSecondary }]}>
                                        {rsvp.status.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl },
    backBtn: { padding: Spacing.sm },
    backText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    card: { backgroundColor: Colors.surface, margin: Spacing.xl, marginTop: 0, padding: Spacing.xl, borderRadius: BorderRadius.md },
    title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, flex: 1, marginRight: Spacing.sm },
    teamName: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600', marginTop: Spacing.xs, marginBottom: Spacing.lg },
    typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    typeText: { fontSize: FontSize.xs, fontWeight: '700' },
    detailsList: { gap: Spacing.sm, marginBottom: Spacing.md },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    detailIcon: { fontSize: 16 },
    detailText: { fontSize: FontSize.md, color: Colors.textSecondary, flex: 1 },
    description: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
    section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    rsvpRow: { flexDirection: 'row', gap: Spacing.sm },
    rsvpBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    rsvpText: { fontSize: FontSize.sm, fontWeight: '700' },
    emptyCard: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: BorderRadius.md, alignItems: 'center' },
    emptyText: { color: Colors.textTertiary, fontSize: FontSize.md },
    rsvpList: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden' },
    rsvpItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    rsvpName: { fontSize: FontSize.md, color: Colors.text, flex: 1, marginRight: Spacing.md, fontWeight: '500' },
    rsvpStatusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    rsvpStatusText: { fontSize: FontSize.xs, fontWeight: '700' },
});
