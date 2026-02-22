import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Colors, Spacing, FontSize, BorderRadius, getAvatarColor, getInitials, timeAgo } from '../../lib/theme';

interface Message { id: string; content: string; senderName: string; senderId: string; createdAt: string; }

export default function ChatMessagesScreen() {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const loadMessages = useCallback(async () => {
        const res = await api<Message[]>(`/api/messages?teamId=${teamId}`);
        if (res.success && res.data) {
            setMessages(res.data);
        }
    }, [teamId]);

    useFocusEffect(useCallback(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [loadMessages]));

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    const sendMessage = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        const res = await api('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ teamId, content: text.trim() }),
        });
        if (res.success) {
            setText('');
            await loadMessages();
        }
        setSending(false);
    };

    const renderMessage = ({ item: msg }: { item: Message }) => {
        const isOwn = msg.senderId === user?.id;
        return (
            <View style={[styles.messageBubbleWrap, isOwn && styles.messageBubbleWrapOwn]}>
                {!isOwn && (
                    <View style={[styles.msgAvatar, { backgroundColor: getAvatarColor(msg.senderName) }]}>
                        <Text style={styles.msgAvatarText}>{getInitials(msg.senderName)}</Text>
                    </View>
                )}
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                    {!isOwn && <Text style={styles.senderName}>{msg.senderName}</Text>}
                    <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{msg.content}</Text>
                    <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>{timeAgo(msg.createdAt)}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
                    </View>
                }
            />
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={Colors.textTertiary}
                    value={text}
                    onChangeText={setText}
                    multiline
                />
                <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!text.trim() || sending}>
                    <Text style={styles.sendButtonText}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    list: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    messageBubbleWrap: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end' },
    messageBubbleWrapOwn: { flexDirection: 'row-reverse' },
    msgAvatar: { width: 28, height: 28, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
    msgAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    bubble: { maxWidth: '75%', padding: Spacing.md, borderRadius: BorderRadius.lg },
    bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
    bubbleOwn: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    senderName: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryLight, marginBottom: 2 },
    messageText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 20 },
    messageTextOwn: { color: '#fff' },
    messageTime: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
    messageTimeOwn: { color: 'rgba(255,255,255,0.6)' },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.md, paddingBottom: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
    input: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.text, maxHeight: 100 },
    sendButton: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm },
    sendButtonDisabled: { backgroundColor: Colors.surfaceLighter },
    sendButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
    empty: { alignItems: 'center', paddingTop: 100 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
});
