import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATS = [
  { label: 'Tasks Done', value: '24' },
  { label: 'In Progress', value: '3' },
  { label: 'This Week', value: '11' },
];

const MENU_ITEMS = [
  { icon: '🔔', label: 'Notifications' },
  { icon: '🎨', label: 'Appearance' },
  { icon: '🔒', label: 'Privacy & Security' },
  { icon: '📊', label: 'Analytics' },
  { icon: '❓', label: 'Help & Support' },
  { icon: '🚪', label: 'Sign Out' },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>BB</Text>
          </View>
          <Text style={styles.name}>Baby Boss</Text>
          <Text style={styles.email}>boss@babybossagency.com</Text>
        </View>

        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menuSection}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.label} style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  email: {
    fontSize: 14,
    color: '#8E8EA0',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8EA0',
    marginTop: 4,
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  menuIcon: {
    fontSize: 18,
    width: 30,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 20,
    color: '#B0B0C0',
  },
});
