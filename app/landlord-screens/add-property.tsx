import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const AddPropertyScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const [title, setTitle] = useState('2 Bedroom Mini Flat');
    const [description, setDescription] = useState('It is a Bedroom Mini Flat with a high maintenance and a better pay and adequare water supply');

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Custom Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add Property</Text>
                <View style={{ width: 40 }} /> {/* Spacer for balance */}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Property Photos Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Property photos</Text>
                    <View style={[styles.photoContainer, { backgroundColor: colors.card }]}>
                        {[1, 2, 3].map((item) => (
                            <TouchableOpacity key={item} style={[styles.photoBox, { backgroundColor: colors.background }]}>
                                <Ionicons name="camera-outline" size={32} color={colors.text} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Basic Information Section */}
                <View style={styles.section}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Property Title</Text>
                        <ThemedTextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Enter property title"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                        <ThemedTextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Enter description"
                            multiline
                            numberOfLines={4}
                            containerStyle={styles.textAreaContainer}
                            style={styles.textArea}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
                        <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={styles.dropdownText}>Location</Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Property Type</Text>
                        <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={styles.dropdownText}>Property Type</Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Property Size</Text>
                        <ThemedTextInput
                            placeholder="Enter property size"
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.submitButton}>
                    <Text style={styles.submitButtonText}>List Property</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8FAF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAF9',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginTop: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    photoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
    },
    photoBox: {
        width: 100,
        height: 100,
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 16,
        color: '#333',
    },
    textAreaContainer: {
        height: 120,
        paddingTop: 16,
        alignItems: 'flex-start',
    },
    textArea: {
        textAlignVertical: 'top',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    dropdownText: {
        fontSize: 16,
        color: '#999',
    },
    submitButton: {
        backgroundColor: '#0047AB',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default AddPropertyScreen;
