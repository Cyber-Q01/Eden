import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BackButton from '../../components/BackButton';
import React, { useEffect, useRef, useState } from 'react';
import { generateAgreementPDF } from '../../utils/pdfGenerator';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAgreement } from '../../hooks/useAgreement';
import { useAI } from '../../hooks/useAI';

const AgreementScreen = () => {
    const { application_id } = useLocalSearchParams<{ application_id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user, role } = useAuth();
    const { agreement, loading, refetch, signAgreement, signing, generating, generateAgreement } = useAgreement(application_id!);
    const { explainClause, loading: aiLoading } = useAI();

    const [selectedText, setSelectedText] = useState('');
    const [explanation, setExplanation] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const slideAnim = useRef(new Animated.Value(300)).current;

    // ✅ New states for custom clauses modal
    const [showClausesModal, setShowClausesModal] = useState(false);
    const [customClauses, setCustomClauses] = useState(['']);
    const [depositAmount, setDepositAmount] = useState('');
    const [petPolicy, setPetPolicy] = useState('');
    const [maintenanceTerms, setMaintenanceTerms] = useState('');
    const [additionalRules, setAdditionalRules] = useState('');

    useEffect(() => {
        if (application_id) refetch();
    }, [application_id]);

    const showExplanationPanel = (text: string) => {
        setSelectedText(text);
        setExplanation('');
        setShowExplanation(true);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
        explainClause(text).then((result: string | null) => {
            if (result) setExplanation(result);
        });
    };

    const hideExplanation = () => {
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => {
            setShowExplanation(false);
        });
    };

    // ✅ Handle manual agreement creation
    const handleManualAgreement = () => {
        Alert.alert(
            'Manual Agreement',
            'This will open a text editor where you can write your own tenancy agreement.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    onPress: () => {
                        router.push({
                            pathname: '/shared-screens/ManualAgreementScreen',
                            params: { application_id }
                        });
                    }
                }
            ]
        );
    };

    // ✅ Handle AI generation with custom clauses
    const handleAIGeneration = () => {
        setShowClausesModal(true);
    };

    // ✅ Add custom clause input
    const addCustomClause = () => {
        setCustomClauses([...customClauses, '']);
    };

    // ✅ Remove custom clause
    const removeCustomClause = (index: number) => {
        const newClauses = customClauses.filter((_, i) => i !== index);
        setCustomClauses(newClauses.length === 0 ? [''] : newClauses);
    };

    // ✅ Update custom clause
    const updateCustomClause = (index: number, value: string) => {
        const newClauses = [...customClauses];
        newClauses[index] = value;
        setCustomClauses(newClauses);
    };

    // ✅ Generate agreement with custom clauses
    const generateWithCustomClauses = async () => {
        const filledClauses = customClauses.filter(clause => clause.trim());

        const customizations = {
            deposit_amount: depositAmount,
            pet_policy: petPolicy,
            maintenance_terms: maintenanceTerms,
            additional_rules: additionalRules,
            custom_clauses: filledClauses
        };

        setShowClausesModal(false);

        try {
            await generateAgreement(customizations);
        } catch (error) {
            Alert.alert('Error', 'Failed to generate agreement. Please try again.');
        }
    };

    const handleSign = () => {
        const isOwner = agreement?.owner_id === user?.id;
        const alreadySigned = isOwner ? !!agreement?.owner_signed_at : !!agreement?.renter_signed_at;

        if (alreadySigned) {
            Alert.alert('Already Signed', 'You have already signed this agreement.');
            return;
        }

        Alert.alert(
            'Sign Agreement',
            'By signing, you confirm you have read and agree to all terms in this tenancy agreement.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Now',
                    onPress: async () => {
                        const success = await signAgreement(agreement!.id);
                        if (success && agreement?.status === 'owner_signed' && !isOwner) {
                            Alert.alert('🎉 Agreement Complete', 'Both parties have signed. Funds will be released to the owner.', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        }
                    },
                },
            ]
        );
    };

    const [downloading, setDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        if (!agreement) return;
        setDownloading(true);
        try {
            await generateAgreementPDF(agreement);
        } catch (e) {
            Alert.alert('Download Failed', 'Could not generate PDF agreement.');
        } finally {
            setDownloading(false);
        }
    };

    const isOwner = agreement?.owner_id === user?.id;
    const userSigned = isOwner ? !!agreement?.owner_signed_at : !!agreement?.renter_signed_at;
    const otherSigned = isOwner ? !!agreement?.renter_signed_at : !!agreement?.owner_signed_at;

    // Split agreement into paragraphs for tap-to-explain
    const paragraphs = agreement?.agreement_text?.split('\n').filter(p => p.trim()) ?? [];

    if (loading || generating) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        {generating ? 'Generating agreement with AI...' : 'Loading agreement...'}
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    if (!agreement) {
        const isLandlord = role === 'LANDLORD';

        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Ionicons name="document-text-outline" size={64} color={colors.primary + '40'} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Agreement Yet</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {isLandlord
                            ? "A tenancy agreement needs to be created for this rental. Choose how you'd like to create it:"
                            : "The landlord hasn't generated the tenancy agreement yet. Please check back later."
                        }
                    </Text>

                    {isLandlord && (
                        <>
                            {/* ✅ Two options for landlords */}
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    onPress={handleAIGeneration}
                                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                                >
                                    <Ionicons name="sparkles" size={20} color="#fff" />
                                    <Text style={styles.primaryBtnText}>Generate with AI</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleManualAgreement}
                                    style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                                >
                                    <Ionicons name="create-outline" size={20} color={colors.text} />
                                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Write Manually</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
                                <Text style={[styles.retryText, { color: colors.textSecondary }]}>Refresh Status</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* ✅ Custom Clauses Modal */}
                <Modal
                    visible={showClausesModal}
                    animationType="slide"
                    presentationStyle="pageSheet"
                >
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => setShowClausesModal(false)}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Customize Agreement</Text>
                            <TouchableOpacity onPress={generateWithCustomClauses}>
                                <Text style={[styles.generateText, { color: colors.primary }]}>Generate</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                Add custom clauses and terms to personalize your agreement
                            </Text>

                            {/* Deposit Amount */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Security Deposit Amount</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                                    placeholder="e.g., 50% of annual rent"
                                    placeholderTextColor={colors.textSecondary}
                                    value={depositAmount}
                                    onChangeText={setDepositAmount}
                                />
                            </View>

                            {/* Pet Policy */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Pet Policy</Text>
                                <TextInput
                                    style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                                    placeholder="e.g., No pets allowed / Small pets allowed with deposit"
                                    placeholderTextColor={colors.textSecondary}
                                    value={petPolicy}
                                    onChangeText={setPetPolicy}
                                />
                            </View>

                            {/* Maintenance Terms */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Maintenance Responsibilities</Text>
                                <TextInput
                                    style={[styles.textAreaInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                                    placeholder="Specify who handles repairs, maintenance requests, etc."
                                    placeholderTextColor={colors.textSecondary}
                                    value={maintenanceTerms}
                                    onChangeText={setMaintenanceTerms}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Additional Rules */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Additional Rules</Text>
                                <TextInput
                                    style={[styles.textAreaInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                                    placeholder="Any other specific rules or requirements"
                                    placeholderTextColor={colors.textSecondary}
                                    value={additionalRules}
                                    onChangeText={setAdditionalRules}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Custom Clauses */}
                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Custom Clauses</Text>
                                    <TouchableOpacity onPress={addCustomClause} style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="add" size={16} color={colors.primary} />
                                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Clause</Text>
                                    </TouchableOpacity>
                                </View>

                                {customClauses.map((clause, index) => (
                                    <View key={index} style={styles.clauseRow}>
                                        <TextInput
                                            style={[styles.clauseInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                                            placeholder={`Custom clause ${index + 1}`}
                                            placeholderTextColor={colors.textSecondary}
                                            value={clause}
                                            onChangeText={(text) => updateCustomClause(index, text)}
                                            multiline
                                        />
                                        {customClauses.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() => removeCustomClause(index)}
                                                style={[styles.removeBtn, { backgroundColor: '#ef444415' }]}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </Modal>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper withScrollView={false} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Tenancy Agreement</Text>
                {userSigned ? (
                    <TouchableOpacity
                        onPress={handleDownloadPDF}
                        style={styles.downloadBtn}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="download-outline" size={22} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* Status bar */}
            <View style={[styles.statusBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.statusItem}>
                    <Ionicons
                        name={agreement.owner_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={agreement.owner_signed_at ? '#22c55e' : colors.textSecondary}
                    />
                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>Owner signed</Text>
                </View>
                <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statusItem}>
                    <Ionicons
                        name={agreement.renter_signed_at ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={agreement.renter_signed_at ? '#22c55e' : colors.textSecondary}
                    />
                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>Renter signed</Text>
                </View>
            </View>

            {/* AI hint */}
            <View style={[styles.aiHint, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={[styles.aiHintText, { color: colors.primary }]}>
                    Tap any paragraph to get a plain English explanation
                </Text>
            </View>

            {/* Agreement text */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {paragraphs.map((para, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => showExplanationPanel(para)}
                        activeOpacity={0.7}
                        style={[styles.paragraph, { borderBottomColor: colors.border }]}
                    >
                        <View style={{ flex: 1 }}>
                            <Markdown style={{
                                body: { color: colors.text, fontSize: 13, lineHeight: 22 },
                                paragraph: { marginVertical: 0 },
                                strong: { fontWeight: 'bold' },
                                em: { fontStyle: 'italic' },
                            }}>
                                {para}
                            </Markdown>
                        </View>
                        <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} style={styles.paraIcon} />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Sign button */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                {userSigned ? (
                    <View style={styles.footerActionContainer}>
                        <View style={[styles.signedBadge, { backgroundColor: '#22c55e15' }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                            <Text style={[styles.signedText, { color: '#22c55e' }]}>
                                You have signed — {otherSigned ? 'Agreement complete!' : 'Waiting for other party'}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.signBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSign}
                        disabled={signing}
                    >
                        {signing
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Ionicons name="pencil-outline" size={18} color="#fff" />
                                <Text style={styles.signBtnText}>Sign Agreement</Text>
                            </>
                        }
                    </TouchableOpacity>
                )}
            </View>

            {/* AI Explanation panel */}
            {showExplanation && (
                <Animated.View
                    style={[
                        styles.explanationPanel,
                        { backgroundColor: colors.background, borderTopColor: colors.border, transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <View style={styles.panelHeader}>
                        <Text style={[styles.panelTitle, { color: colors.text }]}>Plain English</Text>
                        <TouchableOpacity onPress={hideExplanation}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.clauseBox, { backgroundColor: colors.card }]}>
                        <Text style={[styles.clauseText, { color: colors.textSecondary }]} numberOfLines={3}>
                            "{selectedText}"
                        </Text>
                    </View>
                    {aiLoading ? (
                        <View style={styles.aiLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.aiLoadingText, { color: colors.textSecondary }]}>Explaining...</Text>
                        </View>
                    ) : (
                        <Markdown style={{
                            body: { color: colors.text, fontSize: 14, lineHeight: 22 },
                            paragraph: { marginVertical: 0 },
                        }}>
                            {explanation}
                        </Markdown>
                    )}
                </Animated.View>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
    loadingText: { fontSize: 14, fontWeight: '500', marginTop: 8 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
    emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 20 },

    // ✅ New styles for options
    optionsContainer: { width: '100%', gap: 12, marginTop: 24 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 16, borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 16, borderRadius: 16, borderWidth: 1.5,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '700' },

    retryBtn: { marginTop: 16, padding: 12 },
    retryText: { fontSize: 14, fontWeight: '600' },

    // ✅ Modal styles
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    cancelText: { fontSize: 16, fontWeight: '600' },
    generateText: { fontSize: 16, fontWeight: '700' },
    modalContent: { flex: 1, padding: 20 },
    modalSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },

    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    textInput: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, minHeight: 48,
    },
    textAreaInput: {
        borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, minHeight: 80, textAlignVertical: 'top',
    },

    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    addBtnText: { fontSize: 12, fontWeight: '600' },

    clauseRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
    clauseInput: {
        flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 15, minHeight: 48, textAlignVertical: 'top',
    },
    removeBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    downloadBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    statusBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, fontWeight: '500' },
    statusDivider: { width: 1, height: 16 },
    aiHint: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 8,
    },
    aiHintText: { fontSize: 12, fontWeight: '500' },
    scrollContent: { padding: 20, paddingBottom: 20 },
    paragraph: {
        paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    },
    paragraphText: { fontSize: 13, lineHeight: 22, flex: 1 },
    paraIcon: { marginTop: 4 },
    footer: {
        padding: 20, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth,
    },
    signedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 16, borderRadius: 14,
    },
    signedText: { fontSize: 14, fontWeight: '600', flex: 1 },
    signBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 14, gap: 8,
    },
    signBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footerActionContainer: { gap: 12 },
    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 14, gap: 8, marginTop: 4,
    },
    payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    explanationPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 36, maxHeight: '60%',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
    },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    panelTitle: { fontSize: 16, fontWeight: '700' },
    clauseBox: { padding: 12, borderRadius: 10, marginBottom: 14 },
    clauseText: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
    aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    aiLoadingText: { fontSize: 13 },
    explanationText: { fontSize: 14, lineHeight: 22 },
});

export default AgreementScreen;