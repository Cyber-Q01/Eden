import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, StyleSheet, Text,
  TouchableOpacity, TouchableWithoutFeedback, View, ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PERKS = [
  { icon: 'chatbubble-outline', text: 'Contact property owners directly' },
  { icon: 'calendar-outline', text: 'Book property viewings' },
  { icon: 'document-text-outline', text: 'Submit rental applications' },
  { icon: 'shield-checkmark-outline', text: 'Verified Renter badge on your profile' },
  { icon: 'notifications-outline', text: 'Early access to new listings' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
};

const MembershipPaymentModal = ({ visible, onClose, onVerified }: Props) => {
  const { colors } = useTheme();
  const { refreshBiodataStatus } = useAuth();
  const { initializeMembership, verifyMembership, loading } = usePayment();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [currentReference, setCurrentReference] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setPaystackUrl(null);
      setCurrentReference(null);
      onClose();
    });
  };

  const handlePay = async () => {
    const data = await initializeMembership();
    if (data) {
      setCurrentReference(data.reference);
      setPaystackUrl(data.authorization_url);
    }
  };

  const handleWebViewNav = async (navState: any) => {
    const url: string = navState.url ?? '';

    // Detect success callback
    if (url.includes('edenhome://membership/verify') && currentReference) {
      setPaystackUrl(null);
      setVerifying(true);
      const success = await verifyMembership(currentReference);
      setVerifying(false);
      if (success) {
        await refreshBiodataStatus();
        onVerified();
        closeSheet();
      }
    }

    // Detect cancellation
    if (url.includes('edenhome://membership/cancelled')) {
      setPaystackUrl(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={closeSheet}>
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { backgroundColor: colors.background, transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.dragArea}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {paystackUrl ? (
          // ── Paystack WebView ──────────────────────────────────────────────
          <View style={styles.webviewContainer}>
            <View style={[styles.webviewHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setPaystackUrl(null)}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.webviewTitle, { color: colors.text }]}>Secure Payment</Text>
              <View style={{ width: 22 }} />
            </View>
            <WebView
              source={{ uri: paystackUrl }}
              onNavigationStateChange={handleWebViewNav}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              )}
            />
          </View>
        ) : verifying ? (
          // ── Verifying state ───────────────────────────────────────────────
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.verifyingText, { color: colors.text }]}>
              Confirming your payment...
            </Text>
          </View>
        ) : (
          // ── Membership info ───────────────────────────────────────────────
          <View style={styles.content}>
            {/* Badge */}
            <View style={[styles.badgeContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Become a Verified Renter
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              One-time ₦2,000 membership — access EdenHome's full platform and never pay an agent again.
            </Text>

            {/* Perks */}
            <View style={styles.perksContainer}>
              {PERKS.map((perk, i) => (
                <View key={i} style={styles.perkRow}>
                  <View style={[styles.perkIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={perk.icon as any} size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.perkText, { color: colors.text }]}>{perk.text}</Text>
                </View>
              ))}
            </View>

            {/* Value prop */}
            <View style={[styles.valueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                💡 Agents charge ₦50,000–₦200,000 in fees. Pay ₦2,000 once and save thousands.
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              onPress={handlePay}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.ctaBtnText}>Pay ₦2,000 — One Time</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.secureNote, { color: colors.textSecondary }]}>
              🔒 Secured by Paystack
            </Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  dragArea: { paddingVertical: 12, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  badgeContainer: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  perksContainer: { width: '100%', gap: 12, marginBottom: 20 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  perkText: { fontSize: 14, fontWeight: '500', flex: 1 },
  valueCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 24, width: '100%' },
  valueText: { fontSize: 13, lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 54, borderRadius: 14, width: '100%', marginBottom: 12,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secureNote: { fontSize: 12 },
  webviewContainer: { flex: 1 },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webviewTitle: { fontSize: 16, fontWeight: '600' },
  webviewLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  verifyingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 60 },
  verifyingText: { fontSize: 16, fontWeight: '500' },
});

export default MembershipPaymentModal;
