import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/theme';

interface AvailabilityBlock {
    id: string;
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    startDate: string;
    endDate: string;
    status: 'UNAVAILABLE' | 'LIMITED' | 'AVAILABLE';
    reason: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; hint: string }> = {
    UNAVAILABLE: { label: 'Away', color: Colors.danger, hint: 'RSVPs set to Not going' },
    LIMITED: { label: 'Maybe', color: Colors.warning, hint: 'RSVPs set to Maybe' },
    AVAILABLE: { label: 'Available', color: Colors.success, hint: 'RSVPs set to Going' },
};

/** ISO date (YYYY-MM-DD) validation, since mobile has no native date input here. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatRange(startIso: string, endIso: string): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const start = new Date(startIso).toLocaleDateString(undefined, opts);
    const end = new Date(endIso).toLocaleDateString(undefined, opts);
    return start === end ? start : `${start} – ${end}`;
}

export default function AvailabilityScreen() {
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const today = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [status, setStatus] = useState<'UNAVAILABLE' | 'LIMITED' | 'AVAILABLE'>('UNAVAILABLE');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const res = await api<AvailabilityBlock[]>('/api/availability');
        if (res.success && res.data) setBlocks(res.data);
        setLoading(false);
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const save = async () => {
        if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
            Alert.alert('Check the dates', 'Use the format YYYY-MM-DD.');
            return;
        }
        if (endDate < startDate) {
            Alert.alert('Check the dates', 'The end date must be on or after the start date.');
            return;
        }

        setSaving(true);
        const res = await api<{ id: string }>('/api/availability', {
            method: 'POST',
            body: JSON.stringify({ startDate, endDate, status, reason }),
        });
        setSaving(false);

        if (res.success) {
            const updated = (res as { meta?: { rsvpsUpdated?: number } }).meta?.rsvpsUpdated ?? 0;
            setShowForm(false);
            setReason('');
            load();
            if (updated > 0) {
                Alert.alert('Saved', `${updated} RSVP${updated === 1 ? ' was' : 's were'} updated automatically.`);
            }
        } else {
            Alert.alert('Could not save', res.error || 'Please try again.');
        }
    };

    const remove = (block: AvailabilityBlock) => {
        Alert.alert('Remove these dates?', 'Auto-filled RSVPs will be reset to no answer.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
                    await api(`/api/availability/${block.id}`, { method: 'DELETE' });
                    load();
                },
            },
        ]);
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                <Text style={styles.intro}>
                    Mark the dates you&apos;re away once and every event in that range is answered for you.
                    Answers you&apos;ve given by hand are left alone.
                </Text>

                {blocks.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🗓️</Text>
                        <Text style={styles.emptyTitle}>No dates blocked</Text>
                        <Text style={styles.emptyText}>
                            Going on holiday? Add the dates and your coach will see it on every affected event.
                        </Text>
                    </View>
                ) : (
                    blocks.map((b) => {
                        const meta = STATUS_META[b.status] ?? STATUS_META.UNAVAILABLE;
                        return (
                            <View key={b.id} style={styles.row}>
                                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowTitle}>{formatRange(b.startDate, b.endDate)}</Text>
                                    <Text style={styles.rowSub}>
                                        {meta.label} · {b.teamName ?? 'All teams'}
                                        {b.reason ? ` · ${b.reason}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => remove(b)} style={styles.removeBtn}>
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
                <Text style={styles.fabText}>+ Add dates</Text>
            </TouchableOpacity>

            <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Block out dates</Text>

                        <Text style={styles.label}>From</Text>
                        <TextInput
                            style={styles.input}
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.textTertiary}
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>To</Text>
                        <TextInput
                            style={styles.input}
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.textTertiary}
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Status</Text>
                        <View style={styles.statusRow}>
                            {(['UNAVAILABLE', 'LIMITED', 'AVAILABLE'] as const).map((s) => {
                                const meta = STATUS_META[s];
                                const selected = status === s;
                                return (
                                    <TouchableOpacity
                                        key={s}
                                        onPress={() => setStatus(s)}
                                        style={[
                                            styles.statusChip,
                                            selected && { backgroundColor: meta.color + '22', borderColor: meta.color },
                                        ]}
                                    >
                                        <Text style={[styles.statusChipText, selected && { color: meta.color }]}>
                                            {meta.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={styles.hint}>{STATUS_META[status].hint}</Text>

                        <Text style={styles.label}>Reason (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="e.g. Family holiday"
                            placeholderTextColor={Colors.textTertiary}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
    intro: { fontSize: FontSize.sm, color: Colors.textTertiary, padding: Spacing.lg, lineHeight: 20 },
    empty: { alignItems: 'center', padding: Spacing.xxl },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
    emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },
    row: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: Spacing.lg,
        borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md },
    rowTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    rowSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
    removeBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
    removeText: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
    fab: {
        position: 'absolute', bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg,
        backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
        padding: Spacing.lg, alignItems: 'center',
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modal: {
        backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? Spacing.xxl : Spacing.xl,
    },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: Spacing.sm },
    input: {
        backgroundColor: Colors.background, borderRadius: BorderRadius.sm,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
        color: Colors.text, fontSize: FontSize.md,
    },
    statusRow: { flexDirection: 'row', gap: Spacing.sm },
    statusChip: {
        flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
        backgroundColor: Colors.background,
    },
    statusChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    hint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
    modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
    cancelBtn: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', backgroundColor: Colors.background },
    cancelText: { color: Colors.textSecondary, fontWeight: '600' },
    saveBtn: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', backgroundColor: Colors.primary },
    saveText: { color: '#fff', fontWeight: '700' },
});
