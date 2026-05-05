import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type PhotoUploaderProps = {
    images: string[];
    onAddImages: (uris: string[]) => void;
    onRemoveImage: (index: number) => void;
    maxImages?: number;
};

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ images, onAddImages, onRemoveImage, maxImages = 3 }) => {
    const { colors } = useTheme();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: maxImages - images.length,
            quality: 0.3,
        });

        if (!result.canceled) {
            onAddImages(result.assets.map(a => a.uri));
        }
    };

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property photos</Text>
            <View style={[styles.photoContainer, { backgroundColor: colors.card }]}>
                {images.map((uri, index) => (
                    <View key={index} style={[styles.photoBox, { backgroundColor: colors.background }]}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                        <TouchableOpacity onPress={() => onRemoveImage(index)} style={styles.removeImageBtn}>
                            <Ionicons name="close-circle" size={24} color={'red'} />
                        </TouchableOpacity>
                    </View>
                ))}
                {images.length < maxImages && (
                    <TouchableOpacity onPress={pickImage} style={[styles.photoBox, { backgroundColor: colors.background }]}>
                        <Ionicons name="camera-outline" size={32} color={colors.text} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginTop: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    photoContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'flex-start',
        padding: 20,
        borderRadius: 16,
    },
    photoBox: {
        width: 100,
        height: 100,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
});

export default PhotoUploader;
