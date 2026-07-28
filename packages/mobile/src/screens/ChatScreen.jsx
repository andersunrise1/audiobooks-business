import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';

let nextId = 0;
function createMessage(role, content, fallback = null) {
  nextId += 1;
  return { id: String(nextId), role, content, fallback };
}

// MVP mobile port of packages/web's ChatWidget.jsx - keeps the core
// send/receive/fallback-FAQ behavior, drops copy-to-clipboard and 👍/👎
// feedback (a reasonable scope cut for the mobile port, not a backend gap -
// the PATCH /api/ai/chat/:messageId/feedback endpoint isn't called from
// here).
export default function ChatScreen({ route }) {
  const { chapterId } = route.params;
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = createMessage('user', text);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const data = await apiRequest('/api/ai/chat', {
        method: 'POST',
        token: accessToken,
        body: {
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          chapterId,
        },
      });
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', data.reply, data.fallback ? data : null),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.muted}>
            Pergunte algo sobre este capítulo, uma palavra ou gramática.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}>
            <View
              style={[
                styles.bubble,
                item.role === 'user'
                  ? styles.bubbleUser
                  : item.fallback
                    ? styles.bubbleFallback
                    : styles.bubbleAssistant,
              ]}
            >
              <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleText}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
      />

      {sending && <Text style={styles.typing}>Tutor está digitando...</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte algo sobre este capítulo..."
          accessibilityLabel="Pergunte algo sobre este capítulo"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, gap: 8 },
  muted: { color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626', fontSize: 13, paddingHorizontal: 16 },
  typing: { color: '#64748b', fontSize: 13, paddingHorizontal: 16, paddingBottom: 4 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleUser: { backgroundColor: '#2563eb' },
  bubbleAssistant: { backgroundColor: '#f1f5f9' },
  bubbleFallback: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  bubbleText: { color: '#0f172a' },
  bubbleTextUser: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
