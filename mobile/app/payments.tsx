import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, formatCurrency, formatDate } from '../lib/theme';

interface Invoice {
    id: string; title: string; amount: number; status: string;
    dueDate: string; playerName: string; teamName: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    PAID: { bg: Colors.successBg, text: Colors.success },
    PENDING: { bg: Colors.warningBg, text: Colors.warning },
    OVERDUE: { bg: Colors.dangerBg, text: Colors.danger },
};

export default function PaymentsScreen() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [filter, setFilter] = useState('ALL');
    const [refreshing, setRefreshing] = useState(false);

    const loadInvoices = useCallback(async () => {
        const res = await api<Invoice[]>('/api/invoices');
        if (res.success && res.data) setInvoices(res.data);
    }, []);

    useFocusEffect(useCallback(() => { loadInvoices(); }, [loadInvoices]));

    const onRefresh = async () => { setRefreshing(true); await loadInvoices(); setRefreshing(false); };

    const markPaid = async (id: string) => {
        await api(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PAID' }) });
        await loadInvoices();
    };

    const filtered = filter === 'ALL' ? invoices : invoices.filter((i) => i.status === filter);
    const collected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0);

    const filters = ['ALL', 'PENDING', 'PAID', 'OVERDUE'];

    return (
        <View style={styles.container}>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderBottomColor: Colors.success }]}>
                    <Text style={styles.summaryLabel}>Collected</Text>
                    <Text style={[styles.summaryValue, { color: Colors.success }]}>{formatCurrency(collected)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderBottomColor: Colors.warning }]}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={[styles.summaryValue, { color: Colors.warning }]}>{formatCurrency(pending)}</Text>
                </View>
                <View style={[styles.summaryCard, { borderBottomColor: Colors.danger }]}>
                    <Text style={styles.summaryLabel}>Overdue</Text>
                    <Text style={[styles.summaryValue, { color: Colors.danger }]}>{formatCurrency(overdue)}</Text>
                </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {filters.map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Invoice list */}
            <FlatList
                data={filtered}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                renderItem={({ item: inv }) => {
                    const sc = statusColors[inv.status] || statusColors.PENDING;
                    return (
                        <View style={styles.invoiceCard}>
                            <View style={styles.invoiceTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.invoiceTitle}>{inv.title}</Text>
                                    <Text style={styles.invoiceMeta}>{inv.playerName} · {inv.teamName}</Text>
                                </View>
                                <Text style={styles.invoiceAmount}>{formatCurrency(inv.amount)}</Text>
                            </View>
                            <View style={styles.invoiceBottom}>
                                <Text style={styles.invoiceDue}>Due: {formatDate(inv.dueDate)}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                    <Text style={[styles.statusText, { color: sc.text }]}>{inv.status}</Text>
                                </View>
                                {inv.status === 'PENDING' && (
                                    <TouchableOpacity style={styles.markPaidBtn} onPress={() => markPaid(inv.id)}>
                                        <Text style={styles.markPaidText}>Mark Paid</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No invoices found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg },
    summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderBottomWidth: 3, alignItems: 'center' },
    summaryLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },
    summaryValue: { fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },
    filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
    filterTab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface },
    filterTabActive: { backgroundColor: Colors.primaryBg },
    filterText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
    filterTextActive: { color: Colors.primary },
    list: { paddingHorizontal: Spacing.lg },
    invoiceCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
    invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    invoiceTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    invoiceMeta: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
    invoiceAmount: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    invoiceBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    invoiceDue: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
    statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
    markPaidBtn: { backgroundColor: Colors.successBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
    markPaidText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
    empty: { alignItems: 'center', padding: Spacing.xxxl },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
