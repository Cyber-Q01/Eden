import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FieldLabel } from './Common';

const AMENITY_ITEMS = [
    { name: '24/7 Security', icon: 'shield-checkmark-outline' as const },
    { name: 'Internet/WiFi', icon: 'wifi-outline' as const },
    { name: 'Parking Space', icon: 'car-outline' as const },
    { name: 'Furnished', icon: 'bed-outline' as const },
    { name: 'Running Water', icon: 'water-outline' as const },
    { name: 'Pet Friendly', icon: 'paw-outline' as const },
    { name: 'Generator', icon: 'flash-outline' as const },
    { name: 'Air Friendly', icon: 'snow-outline' as const },
];

export const PropertyStep3 = ({ form, setField, pickImage, pickVideo, openModal }: any) => {
    const { colors, isDark } = useTheme();

    const handleRemoveImage = (index: number) => {
        setField('images', form.images.filter((_: any, i: number) => i !== index));
    };

    const toggleAmenity = (name: string) => {
        if (form.amenities.includes(name)) {
            setField('amenities', form.amenities.filter((a: string) => a !== name));
        } else {
            setField('amenities', [...form.amenities, name]);
        }
    };

    // Render an image upload slot or display the uploaded image
    const renderPhotoBox = (index: number, isCover = false) => {
        const imageUri = form.images[index];

        if (imageUri) {
            return (
                <View style={[styles.photoBox, isCover ? styles.coverBox : styles.smallBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Image source={{ uri: imageUri }} style={styles.photoImage} />
                    <TouchableOpacity
                        onPress={() => handleRemoveImage(index)}
                        style={styles.removePhoto}
                    >
                        <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <TouchableOpacity
                onPress={pickImage}
                style={[
                    styles.photoBox,
                    styles.addPhotoBtn,
                    isCover ? styles.coverBox : styles.smallBox,
                    { backgroundColor: colors.card, borderColor: colors.border }
                ]}
            >
                {isCover ? (
                    <View style={styles.coverUploadContent}>
                        <Ionicons name="camera-outline" size={32} color={colors.primary} />
                        <Text style={[styles.coverUploadTitle, { color: colors.primary }]}>Cover Photo</Text>
                        <Text style={[styles.coverUploadSubtitle, { color: colors.textSecondary }]}>Tap to upload</Text>
                    </View>
                ) : (
                    <Ionicons name="add" size={24} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    // Tips banner colors
    const tipsBg = isDark ? '#064E3B' : '#ECFDF5';
    const tipsBorder = isDark ? '#065F46' : '#A7F3D0';
    const tipsTextColor = isDark ? '#6EE7B7' : '#065F46';

    return (
        <View style={styles.stepContent}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Property Photos</Text>
            <Text style={[styles.sectionSubheader, { color: colors.textSecondary }]}>
                Add at least 5 photos. First photo is the cover image
            </Text>

            {/* Asymmetrical Photo Grid */}
            <View style={styles.gridContainer}>
                <View style={styles.topRow}>
                    {/* Left side: Cover Photo slot (tall) */}
                    <View style={styles.leftCol}>
                        {renderPhotoBox(0, true)}
                    </View>
                    {/* Right side: 2 stacked slots */}
                    <View style={styles.rightCol}>
                        {renderPhotoBox(1)}
                        {renderPhotoBox(2)}
                    </View>
                </View>
                {/* Bottom row: 2 slots side by side */}
                <View style={styles.bottomRow}>
                    <View style={styles.bottomCol}>
                        {renderPhotoBox(3)}
                    </View>
                    <View style={styles.bottomCol}>
                        {renderPhotoBox(4)}
                    </View>
                </View>
            </View>

            {/* Quality Tips Badge */}
            <View style={[styles.tipsBanner, { backgroundColor: tipsBg, borderColor: tipsBorder }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={isDark ? '#6EE7B7' : '#059669'} style={{ marginRight: 10 }} />
                <Text style={[styles.tipsText, { color: tipsTextColor }]}>
                    Use natural lighting. Show all rooms. Avoid filters. High quality photos get 3x more inquiries.
                </Text>
            </View>

            {/* Property Video Upload */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Property Video (Optional, max 15MB)</FieldLabel>
                {form.video_url ? (
                    <View style={[styles.videoContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="videocam" size={32} color={colors.primary} />
                        <Text style={[styles.videoText, { color: colors.text }]}>Video Selected</Text>
                        <TouchableOpacity
                            onPress={() => setField('video_url', '')}
                            style={styles.removeVideoBtn}
                        >
                            <Ionicons name="close-circle" size={22} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={pickVideo}
                        style={[styles.addVideoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <Ionicons name="videocam-outline" size={24} color={colors.primary} />
                        <Text style={[styles.addVideoText, { color: colors.primary }]}>Upload Video</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Amenities Section */}
            <View style={styles.amenitiesSection}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Amenities</Text>

                <View style={styles.amenitiesGrid}>
                    {/* Left column */}
                    <View style={styles.amenitiesCol}>
                        {AMENITY_ITEMS.slice(0, 4).map(item => (
                            <View
                                key={item.name}
                                style={[styles.amenityRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <View style={styles.amenityLabelGroup}>
                                    <Ionicons name={item.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={[styles.amenityName, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                </View>
                                <Switch
                                    value={form.amenities.includes(item.name)}
                                    onValueChange={() => toggleAmenity(item.name)}
                                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                    thumbColor={form.amenities.includes(item.name) ? colors.primary : colors.textSecondary}
                                    style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                                />
                            </View>
                        ))}
                    </View>

                    {/* Right column */}
                    <View style={styles.amenitiesCol}>
                        {AMENITY_ITEMS.slice(4).map(item => (
                            <View
                                key={item.name}
                                style={[styles.amenityRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <View style={styles.amenityLabelGroup}>
                                    <Ionicons name={item.icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={[styles.amenityName, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                </View>
                                <Switch
                                    value={form.amenities.includes(item.name)}
                                    onValueChange={() => toggleAmenity(item.name)}
                                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                    thumbColor={form.amenities.includes(item.name) ? colors.primary : colors.textSecondary}
                                    style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                                />
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    sectionSubheader: {
        fontSize: 12,
        marginBottom: 16,
    },
    gridContainer: {
        marginBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    leftCol: {
        flex: 1.2,
    },
    rightCol: {
        flex: 1,
        gap: 10,
    },
    bottomRow: {
        flexDirection: 'row',
        gap: 10,
    },
    bottomCol: {
        flex: 1,
    },
    photoBox: {
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    addPhotoBtn: {
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverBox: {
        height: 180,
    },
    smallBox: {
        height: 85,
    },
    coverUploadContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverUploadTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 8,
    },
    coverUploadSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    photoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removePhoto: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 11,
    },
    tipsBanner: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    tipsText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 20,
    },
    videoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 14,
        height: 80,
        position: 'relative',
    },
    videoText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 10,
    },
    removeVideoBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 11,
    },
    addVideoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 14,
        height: 80,
    },
    addVideoText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    amenitiesSection: {
        marginTop: 10,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    amenitiesCol: {
        flex: 1,
        gap: 8,
    },
    amenityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 46,
    },
    amenityLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 4,
    },
    amenityName: {
        fontSize: 11,
        fontWeight: '600',
    },
});
