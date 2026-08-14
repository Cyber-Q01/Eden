import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useRequests } from '../../hooks/useRequests';
import { sanitizeText, validateAll, validateDescription, validateRequired } from '../../lib/validation';

const ComplaintRequestScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { submitComplaintRequest, loading } = useRequests();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);

    const categories = [
        { id: 'landlord', name: 'Landlord Behavior', icon: 'person-remove', library: Ionicons },
        { id: 'fraud', name: 'Fraud / Scam Attempt', icon: 'warning', library: Ionicons },
        { id: 'property', name: 'Incorrect Property Info', icon: 'home', library: Ionicons },
        { id: 'payment', name: 'Payment Issue', icon: 'card', library: Ionicons },
        { id: 'app', name: 'App Technical problem', icon: 'phone-portrait', library: Ionicons },
        { id: 'escrow', name: 'Escrow Dispute', icon: 'shield-checkmark', library: Ionicons },
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
            { check: () => validateRequired(selectedCategory ?? '', 'Category') },
            { check: () => validateDescription(description, 10) },
        ]);
        if (validationError) {
            showError({ type: 'unknown', title: 'Validation Error', message: validationError });
            return;
        }
        const { error } = await submitComplaintRequest(
            selectedCategory!,
            sanitizeText(description),
            photos as string[]
        );
        if (!error) {
            router.back();
        }
    };

    const renderIcon = (lib: any, name: string, color: string) => {
        const IconComponent = lib;
        return <IconComponent name={name} size={28} color={color} />;
    };

    return (
        <ScreenWrapper>
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Complaint Request</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Category Grid */}
                <View style={styles.gridContainer}>
                    {categories.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.gridItem, { backgroundColor: colors.card }, isSelected && styles.gridItemSelected]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <View style={[styles.iconContainer, isSelected ? styles.iconContainerSelected : [styles.iconContainerUnselected, { backgroundColor: colors.primary + '1A' }]]}>
                                    {renderIcon(cat.library, cat.icon, isSelected ? '#FFFFFF' : colors.primary)}
                                </View>
                                <Text style={[styles.gridItemText, { color: colors.primary }, isSelected && styles.gridItemTextSelected]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Description */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Describe Issue</Text>
                <ThemedTextInput
                    multiline
                    numberOfLines={6}
                    placeholder="Describe the complaint..."
                    value={description}
                    onChangeText={setDescription}
                    containerStyle={styles.textAreaContainer}
                    style={styles.textArea}
                />

                {/* Photos */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Photos</Text>
                <View style={styles.photoContainer}>
                    {photos.map((photo, index) => (
                        <TouchableOpacity key={index} style={[styles.photoBox, { backgroundColor: colors.card }]} onPress={() => pickImage(index)}>
                            {photo ? (
                                <Image source={{ uri: photo }} style={styles.photo} />
                            ) : (
                                <Ionicons name="camera-outline" size={30} color={colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Submit Request</Text>}
                </TouchableOpacity>

            </ScrollView>
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
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 30,
        gap: 12, // Gap usually works on newer RN, if not margin will serve.
    },
    gridItem: {
        width: '30%',
        aspectRatio: 1, // Keep it square
        backgroundColor: '#F7F9FC', // Light background
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    gridItemSelected: {
        // No background change for the whole item in design, just icon? 
        // Actually design shows icon container is blue.
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconContainerUnselected: {
        backgroundColor: '#E6F0FF', // Very light blue
    },
    iconContainerSelected: {
        backgroundColor: '#0047FF', // Blue
    },
    gridItemText: {
        fontSize: 12,
        color: '#407BFF',
        textAlign: 'center',
        fontWeight: '500',
    },
    gridItemTextSelected: {
        // color: '#0047FF', // Keep it blue? Design shows blue text always basically.
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        marginTop: 10,
    },
    textAreaContainer: {
        minHeight: 120,
        marginBottom: 24,
        alignItems: 'flex-start',
        paddingTop: 16,
    },
    textArea: {
        fontSize: 16,
        textAlignVertical: 'top',
    },
    photoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    photoBox: {
        width: '30%',
        aspectRatio: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    submitButton: {
        backgroundColor: '#407BFF',
        borderRadius: 30, // Pill shape
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ComplaintRequestScreen;
