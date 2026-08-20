import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const { session, loading, role, completedBiodata } = useAuth();
  const progress = useRef(new Animated.Value(0)).current;
  const animationStarted = useRef(false);
  const [showProgressBar, setShowProgressBar] = useState(false);

  useEffect(() => {
    // Wait for auth to be ready, or if session is already present, let the early Redirect handle it
    if (loading || session) return;

    // Only start the onboarding check/progress animation once
    if (animationStarted.current) return;
    animationStarted.current = true;

    // We don't have an active session, so show the progress bar and start animation
    setShowProgressBar(true);

    Animated.timing(progress, {
      toValue: 1,
      duration: 1500, // 1.5 seconds for a faster, premium feel
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (finished) {
        try {
          const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
          if (hasSeenOnboarding === 'true') {
            router.replace('/welcome');
          } else {
            router.replace('/onboarding');
          }
        } catch (error) {
          console.error("Error reading onboarding status:", error);
          router.replace('/onboarding');
        }
      }
    });
  }, [loading, session, role, completedBiodata]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // If there is an active session, redirect immediately using the declarative Redirect component.
  if (!loading && session) {
    if (!completedBiodata) {
      return <Redirect href="/profilesetup/biodata" />;
    }
    if (role === 'LANDLORD' || role === 'AGENT') {
      return <Redirect href="/landlord" />;
    } else {
      return <Redirect href="/(tabs)" />;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" hidden={false} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/EdenIcon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Eden</Text>
        <Text style={styles.subtitle}>Adding ease to housing</Text>

        {showProgressBar && (
          <View style={styles.progressWrapper}>
            <View style={styles.progressBarBackground}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Shalom DataTech</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F46BD', // Deep blue consistent with screenshot
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 60,
  },
  progressWrapper: {
    width: '50%',
    height: 4,
    marginTop: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F7A731', // Golden yellow from screenshot
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    letterSpacing: 1,
  },
});
