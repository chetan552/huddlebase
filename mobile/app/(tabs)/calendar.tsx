import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, formatDate, formatTime } from '../../lib/theme';

interface Event { id: string; title: string; type: string; startTime: string; endTime: string | null; location: string | null; teamName: string; teamColor: string; }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const typeColors: Record<string, string> = { PRACTICE: Colors.practice, GAME: Colors.game, MEETING: Colors.meeting, OTHER: Colors.other };

export default function CalendarScreen() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadEvents = useCallback(async () => {
        const res = await api<Event[]>('/api/events');
        if (res.success && res.data) setEvents(res.data);
    }, []);

    useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

    const onRefresh = async () => { setRefreshing(true); await loadEvents(); setRefreshing(false); };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const getEventsForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter((e) => e.startTime.startsWith(dateStr));
    };

    const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))}>
                    <Text style={styles.navArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
                <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))}>
                    <Text style={styles.navArrow}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
                {DAYS.map((d, i) => (
                    <Text key={i} style={styles.dayHeader}>{d}</Text>
                ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
                {calendarDays.map((day, i) => {
                    if (day === null) return <View key={`e-${i}`} style={styles.dayCell} />;
                    const dayEvents = getEventsForDay(day);
                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                    const isSelected = selectedDay === day;

                    return (
                        <TouchableOpacity
                            key={day}
                            style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                            onPress={() => setSelectedDay(day)}
                        >
                            <Text style={[styles.dayText, isToday && styles.dayTextToday, isSelected && styles.dayTextSelected]}>
                                {day}
                            </Text>
                            {dayEvents.length > 0 && (
                                <View style={styles.dotRow}>
                                    {dayEvents.slice(0, 3).map((e, j) => (
                                        <View key={j} style={[styles.dot, { backgroundColor: typeColors[e.type] || Colors.other }]} />
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Selected day events */}
            {selectedDay && (
                <View style={styles.eventSection}>
                    <Text style={styles.eventSectionTitle}>
                        {MONTHS[month]} {selectedDay}
                    </Text>
                    {selectedEvents.length === 0 ? (
                        <Text style={styles.noEvents}>No events on this day</Text>
                    ) : (
                        selectedEvents.map((event) => (
                            <TouchableOpacity
                                key={event.id}
                                style={styles.eventCard}
                                onPress={() => router.push(`/event/${event.id}`)}
                            >
                                <View style={[styles.eventStripe, { backgroundColor: typeColors[event.type] || Colors.other }]} />
                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle}>{event.title}</Text>
                                    <Text style={styles.eventTime}>{formatTime(event.startTime)}</Text>
                                    {event.location && <Text style={styles.eventLocation}>📍 {event.location}</Text>}
                                    <Text style={styles.eventTeam}>{event.teamName}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
                {Object.entries(typeColors).map(([type, color]) => (
                    <View key={type} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <Text style={styles.legendText}>{type.charAt(0) + type.slice(1).toLowerCase()}</Text>
                    </View>
                ))}
            </View>

            <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xxl },
    navArrow: { fontSize: FontSize.xxl, color: Colors.primary, fontWeight: '600', padding: Spacing.sm },
    monthTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
    dayHeaders: { flexDirection: 'row', paddingHorizontal: Spacing.md },
    dayHeader: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '600', color: Colors.textTertiary, paddingBottom: Spacing.sm },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
    dayCellSelected: { backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.sm },
    dayText: { fontSize: FontSize.md, color: Colors.text },
    dayTextToday: { color: Colors.primary, fontWeight: '800' },
    dayTextSelected: { color: Colors.primaryLight, fontWeight: '700' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    eventSection: { padding: Spacing.xxl, paddingTop: Spacing.lg },
    eventSectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    noEvents: { color: Colors.textTertiary, fontSize: FontSize.md },
    eventCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
    eventStripe: { width: 4 },
    eventContent: { flex: 1, padding: Spacing.lg },
    eventTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 2 },
    eventTime: { fontSize: FontSize.sm, color: Colors.textSecondary },
    eventLocation: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
    eventTeam: { fontSize: FontSize.xs, color: Colors.primary, marginTop: Spacing.xs, fontWeight: '600' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, paddingTop: Spacing.lg },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
