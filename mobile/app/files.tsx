import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/theme';

interface TeamFile {
    id: string;
    name: string;
    description: string | null;
    url: string;
    mimeType: string | null;
    sizeBytes: number | null;
    staffOnly: boolean;
    folderName: string | null;
    uploaderName: string;
    createdAt: string;
}

interface Team { id: string; name: string }

function formatSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string | null): string {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    return '📄';
}

export default function FilesScreen() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [files, setFiles] = useState<TeamFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await api<Team[]>('/api/teams');
            if (res.success && res.data && res.data.length > 0) {
                setTeams(res.data);
                setTeamId(res.data[0].id);
            } else {
                setLoading(false);
            }
        })();
    }, []);

    const load = useCallback(async () => {
        if (!teamId) return;
        const res = await api<{ files: TeamFile[] }>(`/api/files?teamId=${teamId}`);
        if (res.success && res.data) setFiles(res.data.files);
        setLoading(false);
        setRefreshing(false);
    }, [teamId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const open = async (file: TeamFile) => {
        // Route through the API so the download is counted, then hand off to the OS.
        const res = await api<{ url: string }>(`/api/files/${file.id}`, { method: 'POST' });
        const url = res.success && res.data ? res.data.url : file.url;
        Linking.openURL(url).catch(() => { /* no handler for this file type */ });
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            {teams.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamBar} contentContainerStyle={{ padding: Spacing.md }}>
                    {teams.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => { setTeamId(t.id); setLoading(true); }}
                            style={[styles.teamChip, teamId === t.id && styles.teamChipActive]}
                        >
                            <Text style={[styles.teamChipText, teamId === t.id && styles.teamChipTextActive]}>{t.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
                }
            >
                {files.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📁</Text>
                        <Text style={styles.emptyTitle}>No files yet</Text>
                        <Text style={styles.emptyText}>
                            Waivers, playbooks and league rules your coach shares will appear here.
                        </Text>
                    </View>
                ) : (
                    files.map((f) => (
                        <TouchableOpacity key={f.id} style={styles.row} onPress={() => open(f)}>
                            <Text style={styles.fileIcon}>{fileIcon(f.mimeType)}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fileName} numberOfLines={1}>
                                    {f.name}{f.staffOnly ? ' 🔒' : ''}
                                </Text>
                                <Text style={styles.fileMeta}>
                                    {f.uploaderName}
                                    {f.sizeBytes ? ` · ${formatSize(f.sizeBytes)}` : ''}
                                    {f.folderName ? ` · ${f.folderName}` : ''}
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: Spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
    teamBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
    teamChip: {
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    teamChipActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
    teamChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
    teamChipTextActive: { color: Colors.primary },
    empty: { alignItems: 'center', padding: Spacing.xxl },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
    emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },
    row: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg, marginTop: Spacing.sm, padding: Spacing.lg,
        borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    },
    fileIcon: { fontSize: 22, width: 34 },
    fileName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    fileMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
    chevron: { fontSize: FontSize.xxl, color: Colors.textTertiary },
});
