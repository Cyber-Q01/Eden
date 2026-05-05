import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface PropertyCardProps {
    image: ImageSourcePropType | string;
    title: string;
    price: string;
    location: string;
    onPress?: () => void;
    variant?: 'vertical' | 'horizontal';
    onFavoritePress?: () => void;
    onRemovePress?: () => void;
    containerStyle?: ViewStyle;
    isVerified?: boolean;
    buttonText?: string;
    onButtonPress?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
    image,
    title,
    price,
    location,
    onPress,
    variant = 'vertical',
    onFavoritePress,
    onRemovePress,
    containerStyle,
    isVerified = true, // Default to true as per user request design
    buttonText = "PROCEED-N666",
    onButtonPress
}) => {
    const { colors, isDark } = useTheme();

    // Robust source resolver for expo-image
    const getSource = (src: any) => {
        if (!src) return require('../assets/images/Homes/home1.png');
        if (typeof src === 'string') {
            if (src.startsWith('http')) return { uri: src };
            return { uri: src };
        }
        if (typeof src === 'number') return src;
        if (src?.uri) return { uri: src.uri };
        return src;
    };

    const finalSource = getSource(image);

    const placeholder = require('../assets/images/Homes/home1.png');

    if (variant === 'horizontal') {
        return (
            <TouchableOpacity style={[styles.cardHorizontal, { backgroundColor: colors.card, borderColor: colors.border }, containerStyle]} onPress={onPress}>
                <Image
                    source={finalSource}
                    placeholder={placeholder}
                    style={styles.imageHorizontal}
                    contentFit="cover"
                    transition={200}
                />
                <View style={styles.contentHorizontal}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.price, { color: colors.primary }]}>{price}</Text>
                    <Text style={[styles.location, { color: colors.textSecondary }]}>{location}</Text>
                    {onRemovePress && (
                        <TouchableOpacity style={styles.removeButton} onPress={onRemovePress}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.cardVertical, { backgroundColor: colors.card }, containerStyle]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.imageWrapperVertical}>
                <Image
                    source={finalSource}
                    placeholder={placeholder}
                    style={styles.imageVertical}
                    contentFit="cover"
                    transition={200}
                />

                {isVerified && (
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                )}

                {onFavoritePress && (
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={onFavoritePress}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="heart" size={20} color="#FF4D4D" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.contentVertical}>
                <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>

                <View style={styles.locationContainer}>
                    <Ionicons name="location-sharp" size={14} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>{location}</Text>
                </View>

                <Text style={[styles.priceLarge, { color: colors.primary }]}>{price}</Text>

                {buttonText && (
                    <TouchableOpacity
                        style={[styles.proceedButton, { backgroundColor: '#F4A261' }]}
                        onPress={onButtonPress || onPress}
                    >
                        <Text style={styles.proceedButtonText}>{buttonText}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // Vertical Styles
    cardVertical: {
        width: width * 0.8, // Fallback width
        borderRadius: 24,
        padding: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 16,
    },
    imageWrapperVertical: {
        width: '100%',
        height: 140,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#F0F0F0', // Debug background
    },
    imageVertical: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    verifiedBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#059669',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    verifiedText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    contentVertical: {
        paddingTop: 12,
        paddingHorizontal: 4,
        gap: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 24,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '400',
    },
    priceLarge: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 4,
        marginBottom: 8,
    },
    proceedButton: {
        width: '100%',
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // Horizontal Styles (Kept as legacy or update if needed)
    cardHorizontal: {
        flexDirection: 'row',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        padding: 12,
        gap: 16,
    },
    imageHorizontal: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    contentHorizontal: {
        flex: 1,
        justifyContent: 'center',
    },
    removeButton: {
        marginTop: 8,
    },
    removeText: {
        fontSize: 12,
        color: '#FF4D4D',
        fontWeight: '600',
    },
    price: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    location: {
        fontSize: 12,
    },
});

export default PropertyCard;
