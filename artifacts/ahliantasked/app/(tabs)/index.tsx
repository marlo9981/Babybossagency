import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    title: 'Review campaign brief',
    description: 'Go through the new baby product campaign requirements',
    completed: false,
    priority: 'high',
    dueDate: 'Today',
  },
  {
    id: '2',
    title: 'Schedule photoshoot',
    description: 'Book studio and models for product photos',
    completed: false,
    priority: 'high',
    dueDate: 'Tomorrow',
  },
  {
    id: '3',
    title: 'Draft social media copy',
    description: 'Write captions for Instagram and TikTok posts',
    completed: true,
    priority: 'medium',
    dueDate: 'Apr 3',
  },
  {
    id: '4',
    title: 'Client feedback review',
    description: 'Incorporate client notes into the design mockups',
    completed: false,
    priority: 'medium',
    dueDate: 'Apr 7',
  },
  {
    id: '5',
    title: 'Update brand guidelines',
    description: 'Revise color palette and typography rules',
    completed: false,
    priority: 'low',
    dueDate: 'Apr 10',
  },
];

const PRIORITY_COLORS = {
  high: '#FF4757',
  medium: '#FFA502',
  low: '#2ED573',
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const filtered = tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const activeCnt = tasks.filter(t => !t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, Boss 👋</Text>
        <Text style={styles.subtitle}>{activeCnt} tasks remaining</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'done'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskCard} onPress={() => toggleTask(item.id)}>
            <View style={styles.taskLeft}>
              <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </View>
            <View style={styles.taskBody}>
              <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>
                {item.title}
              </Text>
              <Text style={styles.taskDesc} numberOfLines={1}>
                {item.description}
              </Text>
              <Text style={styles.taskDue}>{item.dueDate}</Text>
            </View>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8EA0',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EFEFEF',
  },
  filterBtnActive: {
    backgroundColor: '#6C5CE7',
  },
  filterText: {
    fontSize: 13,
    color: '#8E8EA0',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  taskLeft: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#A0A0B0',
  },
  taskDesc: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 2,
  },
  taskDue: {
    fontSize: 11,
    color: '#6C5CE7',
    marginTop: 4,
    fontWeight: '500',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
});
