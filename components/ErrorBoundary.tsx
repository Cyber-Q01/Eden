import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();

  let colors = Colors.light;
  try {
    const theme = useTheme();
    colors = theme.colors;
  } catch (e) {
    // Graceful fallback to default light theme colors if rendered outside ThemeProvider
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.error || '#ef4444'}15` }]}>
          <Ionicons name="warning-outline" size={48} color={colors.error || '#ef4444'} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Oops! Something went wrong</Text>

        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {'An unexpected error occurred while loading this screen. We apologize for the inconvenience.'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={retry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={20} color={colors.text} style={styles.icon} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Return Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
});
