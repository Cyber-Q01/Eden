// screens/ManualAgreementScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAgreement } from '../../hooks/useAgreement';

const { height: screenHeight } = Dimensions.get('window');

const ManualAgreementScreen = () => {
    const { application_id } = useLocalSearchParams<{ application_id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { createManualAgreement, generating } = useAgreement(application_id!);

    const [agreementText, setAgreementText] = useState(`TENANCY AGREEMENT

This Tenancy Agreement is made this _____ day of _______, 2024, between:

LANDLORD: _________________________
Address: _________________________

TENANT: _________________________  
Address: _________________________

PROPERTY DESCRIPTION:
The property to be rented is located at:
_________________________

TERMS:
1. RENT: The monthly rent is ₦_______ payable in advance
2. DURATION: This agreement is for a period of _____ months/years
3. SECURITY DEPOSIT: The tenant shall pay a security deposit of ₦_______

TENANT OBLIGATIONS:
- Pay rent on time
- Maintain the property in good condition  
- No subletting without written consent
- Comply with all local laws and regulations

LANDLORD OBLIGATIONS:
- Ensure the property is in habitable condition
- Provide necessary repairs and maintenance
- Give proper notice before entry

TERMINATION:
Either party may terminate this agreement with _____ days written notice.

GOVERNING LAW:
This agreement shall be governed by the laws of Nigeria.

SIGNATURES:
Landlord: ___________________ Date: _______
Tenant: _____________________ Date: _______

WITNESSES:
1. _______________________ Signature: ___________
2. _______________________ Signature: ___________`);

    const [wordCount, setWordCount] = useState(0);
    const [showTips, setShowTips] = useState(false);

    const handleTextChange = (text: string) => {
        setAgreementText(text);
        const words = text.trim().split(/\s+/).length;
        setWordCount(text.trim() === '' ? 0 : words);
    };

    const handleSave = async () => {
        if (agreementText.trim().length < 100) {
            Alert.alert(
                'Agreement Too Short',
                'Please write a more comprehensive agreement (at least 100 characters).'
            );
            return;
        }

        Alert.alert(
            'Create Agreement',
            'Are you sure you want to create this tenancy agreement? Once created, it can be signed by both parties.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Create',
                    style: 'default',
                    onPress: async () => {
                        const success = await createManualAgreement(agreementText);
                        if (success) {
                            router.back();
                        }
                    }
                }
            ]
        );
    };

    const insertTemplate = (template: string) => {
        const newText = agreementText + '\n\n' + template;
        setAgreementText(newText);
    };

    const templates = [
        {
            title: 'Pet Clause',
            text: 'PETS: No pets are allowed on the premises without prior written consent from the landlord. If pets are permitted, an additional pet deposit of ₦______ shall be required.'
        },
        {
            title: 'Utilities Clause',
            text: 'UTILITIES: The tenant shall be responsible for all utility bills including electricity, water, gas, internet, and waste management services.'
        },
        {
            title: 'Maintenance Clause',
            text: 'MAINTENANCE: The tenant agrees to report any maintenance issues promptly. The landlord will address structural repairs while the tenant handles minor repairs and upkeep.'
        },
        {
            title: 'Guest Policy',
            text: 'GUESTS: Guests may stay for a maximum of 7 consecutive days. Extended stays require written approval from the landlord.'
        }
    ];

    return (
        <ScreenWrapper withScrollView={false} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Write Agreement</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    disabled={generating}
                >
                    {generating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Create</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Compact Info bar */}
            <View style={[styles.compactInfoBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.infoLeft}>
                    <View style={styles.infoItem}>
                        <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                        <Text style={[styles.compactInfoText, { color: colors.textSecondary }]}>
                            {wordCount} words
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                        <Text style={[styles.compactInfoText, { color: colors.textSecondary }]}>
                            Legal template
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setShowTips(!showTips)}
                    style={[styles.tipsToggle, { backgroundColor: colors.primary + '15' }]}
                >
                    <Ionicons name="help-circle-outline" size={14} color={colors.primary} />
                    <Text style={[styles.tipsToggleText, { color: colors.primary }]}>Tips</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Templates - Compact horizontal scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.compactTemplatesContainer}
                    contentContainerStyle={styles.templatesContent}
                >
                    {templates.map((template, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.compactTemplateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => insertTemplate(template.text)}
                        >
                            <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                            <Text style={[styles.compactTemplateText, { color: colors.text }]}>{template.title}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Large Text Editor - Takes most of the space */}
                <View style={[styles.largeEditorContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <ScrollView
                        style={styles.editorScrollView}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        <TextInput
                            style={[styles.largeTextEditor, { color: colors.text }]}
                            value={agreementText}
                            onChangeText={handleTextChange}
                            multiline
                            placeholder="Write your tenancy agreement here..."
                            placeholderTextColor={colors.textSecondary}
                            textAlignVertical="top"
                            autoFocus
                            scrollEnabled={false}
                        />
                    </ScrollView>
                </View>

                {/* Collapsible Tips */}
                {showTips && (
                    <View style={[styles.collapsibleTips, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="lightbulb-outline" size={16} color={colors.primary} />
                            <Text style={[styles.tipsTitle, { color: colors.primary }]}>Writing Tips</Text>
                            <TouchableOpacity onPress={() => setShowTips(false)}>
                                <Ionicons name="close" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.compactTipsText, { color: colors.primary }]}>
                            • Include parties' names & addresses • Specify rent & payment schedule{'\n'}
                            • Define responsibilities • Add termination clauses
                        </Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // ✅ More compact info bar
    compactInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    compactInfoText: {
        fontSize: 11,
        fontWeight: '500',
    },
    tipsToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tipsToggleText: {
        fontSize: 11,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 12, // Reduced padding
    },
    // ✅ More compact templates
    compactTemplatesContainer: {
        marginBottom: 12,
        maxHeight: 36,
    },
    templatesContent: {
        paddingHorizontal: 4,
        gap: 6,
    },
    compactTemplateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    compactTemplateText: {
        fontSize: 11,
        fontWeight: '500',
    },
    // ✅ Much larger text editor
    largeEditorContainer: {
        flex: 1, // Takes most available space
        minHeight: screenHeight * 0.6, // At least 60% of screen height
        maxHeight: screenHeight * 0.8, // Max 80% to leave space for keyboard
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    editorScrollView: {
        flex: 1,
        padding: 16,
    },
    largeTextEditor: {
        minHeight: screenHeight * 0.55, // Minimum height for comfortable editing
        fontSize: 14,
        lineHeight: 22, // Better line spacing
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    // ✅ Compact collapsible tips
    collapsibleTips: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    tipsTitle: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    compactTipsText: {
        fontSize: 10,
        lineHeight: 14,
    },
});

export default ManualAgreementScreen;