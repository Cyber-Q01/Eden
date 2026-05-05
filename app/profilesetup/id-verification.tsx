import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const IDVerificationScreen = () => {
    const router = useRouter();
    const { userType } = useUser();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [showNINModal, setShowNINModal] = useState(false);
    const [showWebView, setShowWebView] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'none' | 'nin' | 'selfie'>('none');
    const [verificationStatus, setVerificationStatus] = useState({
        nin: 'pending', // 'pending', 'verified', 'failed'
        selfie: 'pending'
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // Replace with actual Smile ID URL generated from your backend
    const SMILE_ID_URL = 'https://hosted.smileidentity.com/v1/auth';

    const handleVerify = async () => {
        if (!userType) {
            router.replace('/(tabs)');
            return;
        }

        // Landlords skip subscription — go straight to their dashboard
        if (userType === 'landlord') {
            router.replace('/landlord');
        } else {
            // Tenants must subscribe before accessing the app
            router.replace('/subscription/activate');
        }
    };

    const handleStartVerification = (step: 'nin' | 'selfie') => {
        // Mocking the Verification process directly instead of opening Smile ID Webview
        setVerificationStep(step);
        setShowNINModal(false);
        setIsProcessing(true);

        // Simulate network call
        setTimeout(() => {
            if (step === 'nin') {
                setVerificationStatus(prev => ({ ...prev, nin: 'verified' }));
            } else if (step === 'selfie') {
                setVerificationStatus(prev => ({ ...prev, selfie: 'verified' }));
            }
            setIsProcessing(false);
        }, 1500);
    };

    return (
        <ScreenWrapper>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={{ opacity: showNINModal ? 0.3 : 1 }}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.primary }]}>ID Verification</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please provide valid identification details to{'\n'}continue</Text>
                </View>

                <View style={styles.verificationSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload Government ID (NIN)</Text>
                    <TouchableOpacity
                        style={[
                            styles.uploadCard,
                            { backgroundColor: colors.card, borderColor: verificationStatus.nin === 'verified' ? '#4CAF50' : colors.border }
                        ]}
                        onPress={() => setShowNINModal(true)}
                    >
                        {verificationStatus.nin === 'verified' ? (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        ) : (
                            <>
                                <Image
                                    source={require('../../assets/images/idVerification/upload.png')}
                                    style={styles.uploadIcon}
                                    resizeMode="contain"
                                />
                                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Tap to verify your NIN</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.verificationSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Take a Selfie</Text>
                    <TouchableOpacity
                        style={[
                            styles.uploadCard,
                            { backgroundColor: colors.card, borderColor: verificationStatus.selfie === 'verified' ? '#4CAF50' : colors.border }
                        ]}
                        onPress={() => handleStartVerification('selfie')}
                    >
                        {verificationStatus.selfie === 'verified' ? (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        ) : (
                            <>
                                <Image
                                    source={require('../../assets/images/idVerification/camera.png')}
                                    style={styles.uploadIcon}
                                    resizeMode="contain"
                                />
                                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Ensure your face is clear and visible</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <CustomButton
                    title={verificationStatus.nin === 'verified' && verificationStatus.selfie === 'verified' ? "Continue" : "Verify & Continue"}
                    onPress={handleVerify}
                    style={styles.verifyButton}
                // disabled={verificationStatus.nin !== 'verified' || verificationStatus.selfie !== 'verified'}
                />
            </ScrollView>

    // WebView Modal Removed as it is mocked

            <Modal
                visible={showNINModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNINModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowNINModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.primary }]}>Verify NIN</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Choose your preferred method to{'\n'}verify your NIN</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' }]}
                                onPress={() => handleStartVerification('nin')}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.secondary }]}>Scan NIN Card / ID</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' }]}
                                onPress={() => handleStartVerification('nin')}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.secondary }]}>Enter NIN Number</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary, borderWidth: 0 }]}
                                onPress={() => setShowNINModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        gap: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    verificationSection: {
        marginBottom: 24,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    uploadCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    uploadIcon: {
        width: 60,
        height: 60,
    },
    uploadText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    verifyButton: {
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
        marginBottom: 12,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    modalButtons: {
        width: '100%',
        gap: 12,
    },
    modalButton: {
        height: 56,
        borderWidth: 1,
        borderColor: '#407BFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#407BFF10',
    },
    modalButtonText: {
        fontSize: 16,
        color: '#407BFF',
        fontWeight: '600',
    },
    verifiedBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderColor: '#4CAF50',
        borderWidth: 1,
    },
    verifiedText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 16,
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        height: 44,
        justifyContent: 'center',
        paddingRight: 16,
    },
    webViewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default IDVerificationScreen;
