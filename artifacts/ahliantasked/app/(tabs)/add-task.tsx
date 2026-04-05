import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Priority = 'high' | 'medium' | 'low';

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }
    Alert.alert('Task saved!', `"${title}" has been added.`);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New Task</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor="#B0B0C0"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Add details..."
          placeholderTextColor="#B0B0C0"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {(['high', 'medium', 'low'] as Priority[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && styles[`priority_${p}`]]}
              onPress={() => setPriority(p)}>
              <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Apr 10"
          placeholderTextColor="#B0B0C0"
          value={dueDate}
          onChangeText={setDueDate}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Task</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
  },
  priority_high: {
    backgroundColor: '#FF4757',
  },
  priority_medium: {
    backgroundColor: '#FFA502',
  },
  priority_low: {
    backgroundColor: '#2ED573',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  priorityTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
