import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
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
    containerStyle
}) => {
    const { colors } = useTheme();
    const imageSource = typeof image === 'string' ? { uri: image } : image;

    if (variant === 'horizontal') {
        return (
            <TouchableOpacity style={[styles.cardHorizontal, { backgroundColor: colors.card, borderColor: colors.border }, containerStyle]} onPress={onPress}>
                <Image source={imageSource} style={styles.imageHorizontal} />
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
        <TouchableOpacity style={[styles.cardVertical, { backgroundColor: colors.card }, containerStyle]} onPress={onPress}>
            <View style={styles.imageWrapperVertical}>
                <Image source={imageSource} style={styles.imageVertical} />
                {onFavoritePress && (
                    <TouchableOpacity style={[styles.favoriteButton, { backgroundColor: colors.card + 'CC' }]} onPress={onFavoritePress}>
                        <Ionicons name="heart" size={20} color="#FF4D4D" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={[styles.contentVertical, { backgroundColor: colors.card }]}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.price, { color: colors.primary }]}>{price}</Text>
                <Text style={[styles.location, { color: colors.textSecondary }]}>{location}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // Vertical Styles
    cardVertical: {
        width: width * 0.65,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    imageWrapperVertical: {
        width: '100%',
        height: 160,
        position: 'relative',
    },
    imageVertical: {
        width: '100%',
        height: '100%',
    },
    contentVertical: {
        padding: 16,
        alignItems: 'center', // Centered as per original design
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Horizontal Styles
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
        alignSelf: 'flex-start', // Changed from center to matched designed if needed, but original was center? 
        // Original code: alignSelf: 'center' inside cardContent.
        // Let's stick to start or center.
        marginTop: 8,
    },
    removeText: {
        fontSize: 12,
        color: '#FF4D4D',
        fontWeight: '600',
    },

    // Common
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    price: {
        fontSize: 14, // Vertical usage had 14, Horizontal had 16. Let's compromise or use style override if needed.
        // Vertical: 14
        // Horizontal: 16 fontWeight 800
        // I will use 15 semi-bold as common, or keep it responsive. 
        // Actually, let's keep it simple.
        fontWeight: '700',
        marginBottom: 4,
    },
    location: {
        fontSize: 12,
    },
});

export default PropertyCard;
