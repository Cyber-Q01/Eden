import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Platform,
  RefreshControl,
  ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import MembershipPaymentModal from '../../components/MembershipPaymentModal';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useAIAssistant } from '../../hooks/useAI';
import { useMyApplications } from '../../hooks/useApplications';

const ApplicationScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { showError } = useToast();
  const { id: propertyId, title, price, location } = useLocalSearchParams<{
    id: string; title: string; price: string; location: string;
  }>();

  const { submitApplication, refetch } = useMyApplications();
  const { sendMessage } = useAIAssistant();

  const [moveInDate, setMoveInDate] = useState('');
  const [message, setMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // AI letter generation fields
  const [occupation, setOccupation] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [familySize, setFamilySize] = useState('');
  const [showLetterHelper, setShowLetterHelper] = useState(false);

  // ✅ Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setMoveInDate(selectedDate.toISOString().split('T')[0]);
  };

  const generateLetter = async () => {
    if (!occupation) {
      showError({ type: 'unknown', title: 'Required', message: 'Please enter your occupation first.' });
      return;
    }
    setGeneratingLetter(true);
    try {
      const { callEdgeFunction } = await import('../../lib/api');
      const data = await callEdgeFunction<{ letter: string }>('ai-assistant', 'POST', {
        type: 'application_letter',
        occupation,
        move_reason: moveReason || 'looking for a new home',
        family_size: familySize || '1 person',
        property_title: title,
        property_location: location,
      });
      if (data?.letter) setMessage(data.letter);
    } catch {
      showError({ type: 'unknown', title: 'Error', message: 'Could not generate letter. Please write manually.' });
    } finally {
      setGeneratingLetter(false);
      setShowLetterHelper(false);
    }
  };

  const handleSubmit = async () => {
    if (!moveInDate) {
      showError({ type: 'unknown', title: 'Required', message: 'Please select a move-in date.' });
      return;
    }
    if (!message.trim() || message.trim().length < 20) {
      showError({ type: 'unknown', title: 'Required', message: 'Please write a message of at least 20 characters.' });
      return;
    }

    setSubmitting(true);
    const result = await submitApplication(propertyId, moveInDate, message);
    setSubmitting(false);

    // ✅ Remove membership check - just check for generic errors
    if (!result.error) {
      router.replace('/shared-screens/ApplicationsScreen');
    }
  };

  return (
    <ScreenWrapper withScrollView={false} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apply for Property</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        // ✅ Add pull-to-refresh
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        // ✅ Ensure proper scrolling behavior
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Property summary card */}
        <View style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.propertyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
              ₦{Number(price).toLocaleString()}/yr
            </Text>
          </View>
        </View>

        {/* Move-in date */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Preferred Move-in Date</Text>
          <TouchableOpacity
            style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.dropdownText, { color: moveInDate ? colors.text : colors.textSecondary }]}>
                {moveInDate || 'Select move-in date'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Message */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Message to Owner</Text>
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => setShowLetterHelper(!showLetterHelper)}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={[styles.aiBtnText, { color: colors.primary }]}>AI Help</Text>
            </TouchableOpacity>
          </View>

          {/* AI letter helper */}
          {showLetterHelper && (
            <View style={[styles.aiHelper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.aiHelperTitle, { color: colors.text }]}>
                ✨ Generate a professional message
              </Text>
              <ThemedTextInput
                placeholder="Your occupation (e.g. Civil servant)"
                value={occupation}
                onChangeText={setOccupation}
                containerStyle={styles.aiInput}
              />
              <ThemedTextInput
                placeholder="Reason for moving (optional)"
                value={moveReason}
                onChangeText={setMoveReason}
                containerStyle={styles.aiInput}
              />
              <ThemedTextInput
                placeholder="Household size (e.g. Family of 3)"
                value={familySize}
                onChangeText={setFamilySize}
                containerStyle={styles.aiInput}
              />
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: colors.primary }]}
                onPress={generateLetter}
                disabled={generatingLetter}
              >
                {generatingLetter ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.generateBtnText}>Generate Message</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <ThemedTextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Introduce yourself and explain why you'd be a great tenant..."
            multiline
            numberOfLines={5}
            containerStyle={styles.textAreaContainer}
            style={styles.textArea}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {message.length} characters
          </Text>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            The landlord will review your application and respond within 48 hours. You will be notified when they accept or decline.
          </Text>
        </View>

        <CustomButton
          title="Submit Application"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
        />

        {/* ✅ Add extra spacing at the bottom for better scroll experience */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={moveInDate ? new Date(moveInDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      <MembershipPaymentModal
        visible={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
        onVerified={() => {
          setShowMembershipModal(false);
          handleSubmit();
        }}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  // ✅ Updated scroll content styles for better scrolling
  scrollContent: {
    padding: 20,
    paddingBottom: 60, // Increased bottom padding
    flexGrow: 1, // Ensures content can be scrolled even if shorter than screen
  },
  propertyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  propertyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  propertyTitle: { fontSize: 15, fontWeight: '700' },
  propertyLocation: { fontSize: 13, marginTop: 2 },
  propertyPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500' },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52,
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownText: { fontSize: 15 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  aiBtnText: { fontSize: 12, fontWeight: '600' },
  aiHelper: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12, gap: 8 },
  aiHelperTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  aiInput: { marginBottom: 0 },
  generateBtn: { height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  textAreaContainer: { height: 130, paddingTop: 14, alignItems: 'flex-start' },
  textArea: { textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 24,
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  submitBtn: { marginTop: 4 },
});

export default ApplicationScreen;