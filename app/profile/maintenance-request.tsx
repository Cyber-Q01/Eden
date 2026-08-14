import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    FlatList,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useRequests } from '../../hooks/useRequests';
import { useLeases } from '../../hooks/useLeases';
import { validateDescription, validateRequired, validateAll } from '../../lib/validation';

type Priority = 'low' | 'medium' | 'high';

const MaintenanceRequestScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { submitMaintenanceRequest, loading } = useRequests();
    const { leases, fetchLeases, loading: leasesLoading } = useLeases();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [priority, setPriority] = useState<Priority>('medium');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [isSheetVisible, setIsSheetVisible] = useState(false);

    useEffect(() => {
        fetchLeases().then(data => {
            if (data && data.length > 0) {
                setSelectedProperty(data[0]);
            }
        });
    }, []);

    const categories = [
        { id: 'plumbing', name: 'Plumbing', icon: 'water-outline' },
        { id: 'electrical', name: 'Electrical', icon: 'flash-outline' },
        { id: 'carpentry', name: 'Carpentry', icon: 'hammer-outline' },
        { id: 'painting', name: 'Painting', icon: 'color-palette-outline' },
        { id: 'roofing', name: 'Roofing', icon: 'home-outline' },
        { id: 'pest_control', name: 'Pest Control', icon: 'bug-outline' },
        { id: 'security', name: 'Security', icon: 'shield-outline' },
        { id: 'general', name: 'General', icon: 'build-outline' },
    ];

    const pickImage = async (index: number) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const newPhotos = [...photos];
            newPhotos[index] = result.assets[0].uri;
            setPhotos(newPhotos);
        }
    };

    const handleSubmit = async () => {
        const validationError = validateAll([
            { check: () => validateRequired(selectedProperty?.id ?? '', 'Property') },
            { check: () => validateRequired(selectedCategory ?? '', 'Category') },
            { check: () => validateRequired(title, 'Issue Title') },
            { check: () => validateDescription(description, 10) },
        ]);

        if (validationError) {
            showError({ type: 'unknown', title: 'Validation Error', message: validationError });
            return;
        }

        const { error } = await submitMaintenanceRequest(
            selectedCategory!,
            `[${priority.toUpperCase()}] ${title}: ${description} (${selectedProperty?.property?.title})`,
            photos.filter(Boolean) as string[]
        );

        if (!error) {
            router.replace('/shared-screens/MaintenanceScreen');
        }
    };

    const renderPropertyItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity 
                style={[
                    styles.sheetItem,
                    { borderBottomColor: colors.border },
                    selectedProperty?.id === item.id && { backgroundColor: colors.background }
                ]}
                onPress={() => {
                    setSelectedProperty(item);
                    setIsSheetVisible(false);
                }}
            >
                <View style={styles.sheetItemContent}>
                    <Ionicons 
                        name="home-outline" 
                        size={20} 
                        color={selectedProperty?.id === item.id ? colors.primary : colors.textSecondary} 
                    />
                    <View style={styles.sheetTextContainer}>
                        <Text 
                            style={[
                                styles.sheetItemTitle, 
                                { color: colors.text }, 
                                selectedProperty?.id === item.id && { color: colors.primary }
                            ]}
                        >
                            {item.property?.title}
                        </Text>
                        <Text style={[styles.sheetItemSubtitle, { color: colors.textSecondary }]}>
                            {item.property?.location}
                        </Text>
                    </View>
                </View>
                {selectedProperty?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
    <ScreenWrapper withScrollView={false} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Request</Text>
            <View style={{ width: 24 }} />
        </View>

        <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Property Selector */}
            <Text style={[styles.label, { color: colors.text }]}>Property</Text>
            <TouchableOpacity
                style={[styles.propertySelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsSheetVisible(true)}
            >
                <View style={styles.propertyRow}>
                    <Ionicons name="home-outline" size={18} color={colors.text} />
                    <Text style={[styles.propertyText, { color: colors.text }]}>
                        {selectedProperty ? selectedProperty.property?.title : 'Select a property'}
                    </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Category Grid */}
            <Text style={[styles.label, { color: colors.text }]}>Issue Category</Text>
            <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryItem,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 2 }
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <View style={styles.categoryIconWrap}>
                                <Ionicons
                                    name={cat.icon as any}
                                    size={24}
                                    color={isSelected ? colors.primary : colors.primary}
                                />
                            </View>
                            <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Artisan Banner */}
            <TouchableOpacity 
                style={[styles.artisanBanner, { backgroundColor: colors.primary + '10', borderColor: colors.border }]}
                onPress={() => router.push('/shared-screens/FindArtisanScreen')}
            >
                <View style={styles.artisanRow}>
                    <Ionicons name="people-outline" size={18} color={colors.primary} />
                    <Text style={[styles.artisanText, { color: colors.text }]}>Find a Verified Artisan</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* Priority Level */}
            <Text style={[styles.label, { color: colors.text }]}>Priority Level</Text>
            <View style={styles.priorityGrid}>
                <TouchableOpacity
                    style={[styles.priorityTab, { backgroundColor: colors.card, borderColor: colors.border }, priority === 'low' && styles.priorityLowActive]}
                    onPress={() => setPriority('low')}
                >
                    <Ionicons name="arrow-down-outline" size={16} color={priority === 'low' ? '#059669' : colors.textSecondary} />
                    <Text style={[styles.priorityText, { color: colors.textSecondary }, priority === 'low' && { color: '#059669' }]}>Low</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.priorityTab, { backgroundColor: colors.card, borderColor: colors.border }, priority === 'medium' && styles.priorityMediumActive]}
                    onPress={() => setPriority('medium')}
                >
                    <MaterialCommunityIcons name="minus" size={16} color={priority === 'medium' ? '#D97706' : colors.textSecondary} />
                    <Text style={[styles.priorityText, { color: colors.textSecondary }, priority === 'medium' && { color: '#D97706' }]}>Medium</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.priorityTab, { backgroundColor: colors.card, borderColor: colors.border }, priority === 'high' && styles.priorityHighActive]}
                    onPress={() => setPriority('high')}
                >
                    <Ionicons name="arrow-up-outline" size={16} color={priority === 'high' ? '#DC2626' : colors.textSecondary} />
                    <Text style={[styles.priorityText, { color: colors.textSecondary }, priority === 'high' && { color: '#DC2626' }]}>High</Text>
                </TouchableOpacity>
            </View>

            {/* Inputs */}
            <Text style={[styles.label, { color: colors.text }]}>Issue Title</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Water leakage in bathroom ceiling"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <View style={[styles.textAreaContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                    style={[styles.textArea, { color: colors.text }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe the issue in detail, when it started, how severe it is, and any relevant information"
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={(txt) => txt.length <= 300 && setDescription(txt)}
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>{description.length}/300</Text>
            </View>

            {/* Photos */}
            <Text style={[styles.label, { color: colors.text }]}>Add Photos</Text>
            <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.photoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                        onPress={() => pickImage(index)}
                    >
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.photo} />
                        ) : (
                            <Ionicons name="camera" size={28} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
            </TouchableOpacity>
        </View>

        {/* Property Bottom Sheet */}
        <Modal visible={isSheetVisible} transparent animationType="slide">
            <View style={styles.sheetOverlay}>
                <TouchableOpacity style={styles.sheetDismiss} onPress={() => setIsSheetVisible(false)} />
                <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
                    <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Property</Text>
                    </View>

                    <FlatList
                        data={leases}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPropertyItem}
                        contentContainerStyle={styles.sheetList}
                        ListEmptyComponent={() => (
                            <View style={styles.emptySheet}>
                                <Text style={[styles.emptySheetText, { color: colors.textSecondary }]}>No active properties found</Text>
                            </View>
                        )}
                    />
                </View>
            </View>
        </Modal>
    </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#F8FAFC',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#1E293B',
        marginTop: 20,
        marginBottom: 8,
    },
    propertySelector: {
        height: 52,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    propertyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    propertyText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryItem: {
        width: '23%',
        aspectRatio: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    categoryItemActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#1D4ED8',
        borderWidth: 2,
    },
    categoryIconWrap: {
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 10,
        fontWeight: '500',
        color: '#0F172A',
        textAlign: 'center',
    },
    artisanBanner: {
        height: 48,
        backgroundColor: '#EEF2FF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 16,
    },
    artisanRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    artisanText: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
    priorityGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    priorityTab: {
        flex: 1,
        height: 48,
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    priorityLowActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#059669',
    },
    priorityMediumActive: {
        backgroundColor: '#FFFBEB',
        borderColor: '#D97706',
        borderWidth: 2,
    },
    priorityHighActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#DC2626',
    },
    priorityText: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
    input: {
        height: 52,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        fontSize: 14,
        color: '#0F172A',
    },
    textAreaContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        height: 120,
    },
    textArea: {
        fontSize: 14,
        color: '#0F172A',
        textAlignVertical: 'top',
        flex: 1,
    },
    charCount: {
        alignSelf: 'flex-end',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },
    photoGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    photoBox: {
        width: '30%',
        aspectRatio: 1,
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1D4ED8',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        padding: 20,
        paddingBottom: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    submitBtn: {
        backgroundColor: '#1D4ED8',
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetDismiss: {
        flex: 1,
    },
    sheetContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 300,
        maxHeight: '80%',
        paddingBottom: 40,
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    sheetList: {
        padding: 20,
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetItemActive: {
        backgroundColor: '#F8FAFC',
    },
    sheetItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    sheetTextContainer: {
        flex: 1,
    },
    sheetItemTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    sheetItemSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    sheetTextActive: {
        color: '#1D4ED8',
    },
    emptySheet: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptySheetText: {
        color: '#94A3B8',
        fontSize: 14,
    },
});

export default MaintenanceRequestScreen;
