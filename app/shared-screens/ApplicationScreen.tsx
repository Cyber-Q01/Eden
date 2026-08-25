import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import CustomDatePickerModal from '@/components/CustomDatePickerModal';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useMyApplications } from '../../hooks/useApplications';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

// ─── Upload a local file URI to Supabase Storage ────────────────────────────
const uploadToStorage = async (localUri: string, userId: string, folder: string): Promise<string> => {
  let uriToUpload = localUri;
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const isImage = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext);

  if (isImage) {
    try {
      // Compress and resize image to speed up upload significantly
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      uriToUpload = manipulated.uri;
    } catch (e) {
      console.warn('Error compressing image, using original file:', e);
    }
  }

  const base64 = await FileSystem.readAsStringAsync(uriToUpload, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const uploadExt = isImage ? 'jpg' : ext;
  const mimeType = uploadExt === 'pdf' ? 'application/pdf' : `image/${uploadExt}`;
  const fileName = `${folder}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${uploadExt}`;
  const arrayBuffer = decode(base64);

  const { data, error } = await supabase.storage
    .from('request-images')
    .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data: pub } = supabase.storage.from('request-images').getPublicUrl(data.path);
  return pub.publicUrl;
};

// ─── Photo state type ────────────────────────────────────────────────────────
interface PhotoState {
  localUri: string;
  uploadedUrl: string | null;
  uploading: boolean;
}

const ApplicationScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useToast();

  const { id: propertyId, title, price, location, landlordName, image } = useLocalSearchParams<{
    id: string; title: string; price: string; location: string; landlordName?: string; image?: string;
  }>();

  const { submitApplication, refetch } = useMyApplications();
  const { profile } = useProfile();

  // ── Basic Details States ──────────────────────────────────────────────────
  const [moveInDate, setMoveInDate] = useState('');
  const [leaseDuration, setLeaseDuration] = useState('1 Year');
  const [message, setMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── AI Letter & Occupation Details ────────────────────────────────────────
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [familySize, setFamilySize] = useState('');
  const [showLetterHelper, setShowLetterHelper] = useState(false);

  // ── Photo Verification States ──────────────────────────────────────────────
  const [selfie, setSelfie] = useState<PhotoState | null>(null);
  const [fullPhoto, setFullPhoto] = useState<PhotoState | null>(null);

  // ── Supporting Documents States ───────────────────────────────────────────
  const [incomeDoc, setIncomeDoc] = useState<PhotoState | null>(null);
  const [referenceDoc, setReferenceDoc] = useState<PhotoState | null>(null);

  // ── Terms agreement state ─────────────────────────────────────────────────
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Prefilled values ──────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ── User ID for uploads ───────────────────────────────────────────────────
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // ── Prefill bio-data fields ───────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      setFullName(name || '');
      setEmailAddress(profile.email || '');
      let phone = profile.phone || '';
      if (phone.startsWith('+234')) phone = phone.replace('+234', '');
      setPhoneNumber(phone || '');
    }
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } catch (e) { console.error('Refresh error:', e); } finally { setRefreshing(false); }
  }, [refetch]);

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setMoveInDate(selectedDate.toISOString().split('T')[0]);
  };

  // ── Upload helper: pick → upload → set state ──────────────────────────────
  const pickAndUpload = async (
    setter: React.Dispatch<React.SetStateAction<PhotoState | null>>,
    folder: string,
    options?: ImagePicker.ImagePickerOptions
  ) => {
    if (!userId) {
      showError({ type: 'unknown', title: 'Not Ready', message: 'Please wait for profile to load.' });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError({ type: 'unknown', title: 'Permission Denied', message: 'Camera roll access is required to upload files.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: options?.allowsEditing ?? false,
      aspect: options?.aspect,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setter({ localUri, uploadedUrl: null, uploading: true });

    try {
      const url = await uploadToStorage(localUri, userId, folder);
      setter({ localUri, uploadedUrl: url, uploading: false });
      showSuccess('Uploaded successfully!');
    } catch (err: any) {
      setter(null);
      showError({ type: 'unknown', title: 'Upload Failed', message: err?.message ?? 'Could not upload file.' });
    }
  };

  const pickWithCamera = async (
    setter: React.Dispatch<React.SetStateAction<PhotoState | null>>,
    folder: string
  ) => {
    if (!userId) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError({ type: 'unknown', title: 'Permission Denied', message: 'Camera access is required.' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setter({ localUri, uploadedUrl: null, uploading: true });

    try {
      const url = await uploadToStorage(localUri, userId, folder);
      setter({ localUri, uploadedUrl: url, uploading: false });
      showSuccess('Uploaded successfully!');
    } catch (err: any) {
      setter(null);
      showError({ type: 'unknown', title: 'Upload Failed', message: err?.message ?? 'Could not upload file.' });
    }
  };

  // ── Photo selection dialog ─────────────────────────────────────────────────
  const handlePhotoSelect = (type: 'selfie' | 'full') => {
    const setter = type === 'selfie' ? setSelfie : setFullPhoto;
    const folder = type === 'selfie' ? 'app-selfies' : 'app-fullphotos';
    Alert.alert(
      type === 'selfie' ? 'Upload Selfie' : 'Upload Full Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => pickWithCamera(setter, folder) },
        { text: 'Choose from Gallery', onPress: () => pickAndUpload(setter, folder, { allowsEditing: true, aspect: [1, 1] }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Document upload dialog ────────────────────────────────────────────────
  const handleDocUpload = (docType: 'income' | 'reference') => {
    const setterMap = { income: setIncomeDoc, reference: setReferenceDoc };
    const folderMap = { income: 'app-income', reference: 'app-reference' };
    const setter = setterMap[docType];
    const folder = folderMap[docType];

    Alert.alert(
      'Upload Document',
      'Select how to upload your document',
      [
        { text: 'Take Photo of Document', onPress: () => pickWithCamera(setter, folder) },
        { text: 'Choose from Gallery', onPress: () => pickAndUpload(setter, folder) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── AI Letter generation ──────────────────────────────────────────────────
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
        name: fullName,
        occupation,
        move_reason: moveReason || 'looking for a new home',
        family_size: familySize || '1 person',
        property_title: title,
        property_location: location,
      });
      if (data?.letter) setMessage(data.letter);
    } catch {
      const nameVal = fullName || 'the Applicant';
      const genericLetter = `Hello,\n\nMy name is ${nameVal}, and I am writing to express my strong interest in leasing your property: ${title} located at ${location}. As a ${occupation || 'professional'} with a stable income, I take great pride in maintaining a clean and orderly living space. I am committed to being a responsible, long-term tenant.\n\nBest regards,\n${nameVal}`;
      setMessage(genericLetter);
      showSuccess('Generated a professional letter for you!');
    } finally {
      setGeneratingLetter(false);
      setShowLetterHelper(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!occupation.trim()) {
      showError({ type: 'unknown', title: 'Required', message: 'Please enter your occupation.' }); return;
    }
    if (!monthlyIncome.trim()) {
      showError({ type: 'unknown', title: 'Required', message: 'Please enter your monthly income.' }); return;
    }
    if (!selfie?.uploadedUrl || !fullPhoto?.uploadedUrl) {
      showError({ type: 'unknown', title: 'Required', message: 'Please upload both Selfie and Full Photo verifications. Wait for uploads to complete.' }); return;
    }
    if (!moveInDate) {
      showError({ type: 'unknown', title: 'Required', message: 'Please select a preferred move-in date.' }); return;
    }
    if (!message.trim() || message.trim().length < 20) {
      showError({ type: 'unknown', title: 'Required', message: 'Please write an introduction message of at least 20 characters.' }); return;
    }
    if (!termsAccepted) {
      showError({ type: 'unknown', title: 'Required', message: 'You must accept the terms and conditions to proceed.' }); return;
    }

    // Check any pending uploads
    const stillUploading = [selfie, fullPhoto, incomeDoc, referenceDoc].some(d => d?.uploading);
    if (stillUploading) {
      showError({ type: 'unknown', title: 'Please Wait', message: 'Some files are still uploading. Please wait.' }); return;
    }

    setSubmitting(true);

    // Serialize full application payload as JSON inside message field for backward compat
    const payload = JSON.stringify({
      __eden_v: 1,
      applicant: {
        name: fullName,
        email: emailAddress,
        phone: phoneNumber,
        occupation,
        monthly_income: monthlyIncome,
        lease_duration: leaseDuration,
      },
      verification: {
        selfie_url: selfie.uploadedUrl,
        full_photo_url: fullPhoto.uploadedUrl,
      },
      documents: {
        valid_id_url: null,
        income_url: incomeDoc?.uploadedUrl ?? null,
        reference_url: referenceDoc?.uploadedUrl ?? null,
      },
      cover_letter: message.trim(),
    });

    const result = await submitApplication(propertyId, moveInDate, payload);
    setSubmitting(false);

    if (!result.error) {
      showSuccess('Application submitted successfully!');
      router.replace({
        pathname: '/shared-screens/ApplicationSentScreen',
        params: {
          property: title || 'Property Listing',
          landlord: landlordName || 'Landlord',
          move_in_date: moveInDate ? new Date(moveInDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'As soon as possible',
          lease_duration: leaseDuration,
        }
      });
    }
  };

  // ── Photo card helper ─────────────────────────────────────────────────────
  const renderPhotoCard = (
    type: 'selfie' | 'full',
    state: PhotoState | null,
    label: string,
    subLabel: string
  ) => {
    const isDone = !!state?.uploadedUrl;
    const isUploading = !!state?.uploading;
    return (
      <TouchableOpacity
        style={[
          styles.photoCard,
          {
            borderColor: isDone ? '#10B981' : isUploading ? colors.primary : (isDark ? '#334155' : '#CBD5E1'),
            backgroundColor: colors.card,
          }
        ]}
        onPress={() => !isUploading && handlePhotoSelect(type)}
        disabled={isUploading}
      >
        {state?.localUri && !isUploading ? (
          <Image
            source={{ uri: state.localUri }}
            style={styles.photoPreview}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.photoIconContainer, {
            backgroundColor: isDone ? '#10B98120' : isUploading ? colors.primary + '15' : (isDark ? '#1E293B' : '#F8FAFC')
          }]}>
            {isUploading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons
                name={isDone ? 'checkmark-circle' : type === 'selfie' ? 'camera' : 'person'}
                size={26}
                color={isDone ? '#10B981' : colors.primary}
              />
            }
          </View>
        )}
        <Text style={[styles.photoCardTitle, { color: colors.text, marginTop: state?.localUri ? 8 : 0 }]}>{label}</Text>
        <Text style={[styles.photoCardSub, { color: isDone ? '#10B981' : colors.textSecondary }]} numberOfLines={1}>
          {isUploading ? 'Uploading…' : isDone ? '✓ Uploaded' : subLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Doc card helper ────────────────────────────────────────────────────────
  const renderDocCard = (
    docType: 'income' | 'reference',
    state: PhotoState | null,
    label: string,
    subLabel: string,
    iconName: string,
    iconColor: string,
    iconBg: string,
    optional = false
  ) => {
    const isDone = !!state?.uploadedUrl;
    const isUploading = !!state?.uploading;
    return (
      <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: isDone ? '#10B98150' : colors.border }]}>
        <View style={[styles.docIconCircle, { backgroundColor: iconBg }]}>
          {isUploading
            ? <ActivityIndicator size="small" color={iconColor} />
            : <Ionicons name={iconName as any} size={20} color={isDone ? '#10B981' : iconColor} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.docTitle, { color: colors.text }]}>
            {label}{optional ? <Text style={{ color: colors.textSecondary, fontWeight: '400', fontSize: 11 }}> (optional)</Text> : null}
          </Text>
          <Text style={[styles.docStatusText, { color: isDone ? '#059669' : isUploading ? colors.primary : colors.textSecondary }]}>
            {isUploading ? 'Uploading…' : isDone ? '✓ Document uploaded' : subLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.docUploadBtn, { backgroundColor: isDone ? '#10B98115' : (isDark ? '#1E293B' : '#F1F5F9') }]}
          onPress={() => !isUploading && handleDocUpload(docType)}
          disabled={isUploading}
        >
          <Text style={[styles.docUploadBtnText, { color: isDone ? '#059669' : colors.primary }]}>
            {isDone ? 'Change' : 'Upload'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rental Application</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          bounces={true}
          alwaysBounceVertical={true}
        >
        {/* ── Property Summary Card ── */}
        <View style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={image ? { uri: image } : require('../../assets/images/eicon.png')}
            style={styles.propertyThumb}
            placeholder={require('../../assets/images/eicon.png')}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>{title || 'Property Listing'}</Text>
            <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>{location || 'Lagos, Nigeria'}</Text>
            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
              ₦{Number(price || 0).toLocaleString()}/year
            </Text>
            {landlordName && (
              <Text style={[styles.landlordLabel, { color: colors.textSecondary }]} numberOfLines={1}>Owner: {landlordName}</Text>
            )}
          </View>
        </View>

        {/* ── SECTION 1: Personal Details ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Personal Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <ThemedTextInput
              value={fullName}
              editable={false}
              placeholder="Tenant Name"
              containerStyle={[styles.disabledInput, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              leftIcon={<Ionicons name="person-outline" size={18} color={isDark ? '#475569' : '#94A3B8'} style={{ marginRight: 8 }} />}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <View style={[styles.countryCodeBox, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Text style={[styles.countryCodeText, { color: isDark ? '#94A3B8' : '#64748B' }]}>+234</Text>
              </View>
              <ThemedTextInput
                value={phoneNumber}
                editable={false}
                placeholder="Phone Number"
                containerStyle={[styles.disabledPhoneInput, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <ThemedTextInput
              value={emailAddress}
              editable={false}
              placeholder="Email Address"
              containerStyle={[styles.disabledInput, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              leftIcon={<Ionicons name="mail-outline" size={18} color={isDark ? '#475569' : '#94A3B8'} style={{ marginRight: 8 }} />}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Occupation</Text>
            <ThemedTextInput
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Software Engineer, Teacher, Doctor..."
              containerStyle={{ borderColor: colors.border }}
              style={{ color: colors.text }}
              leftIcon={<Ionicons name="briefcase-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Income (₦)</Text>
            <ThemedTextInput
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              placeholder="0.00"
              keyboardType="numeric"
              containerStyle={{ borderColor: colors.border }}
              style={{ color: colors.text }}
              leftIcon={<Text style={[styles.currencyPrefix, { color: colors.primary }]}>₦</Text>}
            />
          </View>

          {/* Lease Duration Pills */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Preferred Lease Duration</Text>
            <View style={styles.durationPillsContainer}>
              {['6 Months', '1 Year', '2 Years'].map((duration) => {
                const isActive = leaseDuration === duration;
                return (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationPill,
                      isActive
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: 'transparent', borderColor: colors.border }
                    ]}
                    onPress={() => setLeaseDuration(duration)}
                  >
                    <Text style={[styles.durationPillText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                      {duration}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── SECTION 2: Photo Verification ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Photo Verification</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Clear, well-lit photos help landlords verify your identity
          </Text>
          <View style={styles.photoVerificationRow}>
            {renderPhotoCard('selfie', selfie, 'Selfie', 'Clear face photo')}
            {renderPhotoCard('full', fullPhoto, 'Full Photo', 'Full body image')}
          </View>
        </View>

        {/* ── SECTION 3: Move-in Details ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Move-in Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Desired Move-in Date</Text>
            <TouchableOpacity
              style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dropdownLeft}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.dropdownText, { color: moveInDate ? colors.text : colors.textSecondary }]}>
                  {moveInDate
                    ? new Date(moveInDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Select move-in date'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 4: Application Message ── */}
        <View style={styles.sectionContainer}>
          <View style={[styles.labelRow, { marginBottom: 14 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>Application Message</Text>
            </View>
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => setShowLetterHelper(!showLetterHelper)}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={[styles.aiBtnText, { color: colors.primary }]}>AI Help</Text>
            </TouchableOpacity>
          </View>

          {showLetterHelper && (
            <View style={[styles.aiHelper, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
              <View style={styles.aiHelperTitleRow}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Generate a professional cover letter</Text>
              </View>
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
                {generatingLetter
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.generateBtnText}>✨ Generate Cover Letter</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <ThemedTextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell the Landlord about yourself, your family size and why you'd be a great tenant..."
            multiline
            numberOfLines={5}
            containerStyle={styles.textAreaContainer}
            style={styles.textArea}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {message.length} / 500 characters
          </Text>
        </View>

        {/* ── SECTION 5: Supporting Documents ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: '#0D9488' }]} />
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Supporting Documents</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Upload photos of your documents for verification
          </Text>

          {renderDocCard('income', incomeDoc, 'Proof of Income / Pay Slip', 'Upload a recent pay slip or bank statement', 'receipt-outline', '#2563EB', isDark ? '#2563EB20' : '#EFF6FF', true)}
          {renderDocCard('reference', referenceDoc, 'Reference Letter', 'From a previous landlord or employer', 'mail-unread-outline', isDark ? '#94A3B8' : '#64748B', isDark ? '#64748B20' : '#F8FAFC', true)}
        </View>

        {/* ── Terms ── */}
        <TouchableOpacity
          style={[styles.termsRow, { backgroundColor: termsAccepted ? colors.primary + '08' : 'transparent', borderColor: termsAccepted ? colors.primary + '30' : colors.border }]}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, { borderColor: termsAccepted ? colors.primary : colors.border, backgroundColor: termsAccepted ? colors.primary : 'transparent' }]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            I confirm all information provided is accurate and I agree to Eden's standard background check procedures.
          </Text>
        </TouchableOpacity>

        {/* ── Info Banner ── */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            The landlord will review your application and respond within 48 hours. You will be notified when they accept or decline.
          </Text>
        </View>

        <CustomButton
          title={submitting ? 'Submitting…' : 'Submit Application'}
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
        />

        <View style={{ height: 60 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <CustomDatePickerModal
        visible={showDatePicker}
        value={moveInDate}
        minimumDate={new Date()}
        title="Select Desired Move-in Date"
        onConfirm={(dateStr) => setMoveInDate(dateStr)}
        onClose={() => setShowDatePicker(false)}
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
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

  propertyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: 16, borderWidth: 1, marginBottom: 28,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  propertyThumb: { width: 72, height: 72, borderRadius: 12 },
  propertyTitle: { fontSize: 16, fontWeight: '700' },
  propertyLocation: { fontSize: 13, marginTop: 2 },
  propertyPrice: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  landlordLabel: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  sectionContainer: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionHeading: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  sectionSubtitle: { fontSize: 13, marginBottom: 14, marginTop: -10, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },

  disabledInput: { height: 54, borderWidth: 1, borderRadius: 12 },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countryCodeBox: {
    width: 65, height: 54, borderWidth: 1, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  countryCodeText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  disabledPhoneInput: { flex: 1, height: 54, borderWidth: 1, borderRadius: 12 },
  currencyPrefix: { fontSize: 16, fontWeight: '700', marginRight: 6 },

  durationPillsContainer: { flexDirection: 'row', gap: 8 },
  durationPill: {
    flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  durationPillText: { fontSize: 13, fontWeight: '700' },

  photoVerificationRow: { flexDirection: 'row', gap: 12 },
  photoCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 16, borderWidth: 2, borderStyle: 'dashed',
    borderRadius: 16, minHeight: 140, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: 90, borderRadius: 10, marginBottom: 8 },
  photoIconContainer: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  photoCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  photoCardSub: { fontSize: 11 },

  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52,
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownText: { fontSize: 15 },

  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  aiBtnText: { fontSize: 12, fontWeight: '600' },
  aiHelper: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  aiHelperTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  aiHelperTitle: { fontSize: 14, fontWeight: '700' },
  aiInput: { marginBottom: 0 },
  generateBtn: { height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  textAreaContainer: { height: 130, paddingTop: 14, alignItems: 'flex-start', borderRadius: 14 },
  textArea: { textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  docCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 12,
  },
  docIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 13, fontWeight: '700' },
  docStatusText: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  docUploadBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  docUploadBtnText: { fontSize: 12, fontWeight: '700' },

  termsRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginBottom: 20, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  termsText: { fontSize: 12, lineHeight: 18, flex: 1 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 24,
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  submitBtn: { marginTop: 4 },
});

export default ApplicationScreen;