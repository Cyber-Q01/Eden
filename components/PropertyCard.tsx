import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PropertyCardProps {
    image: any;
    title: string;
    price: string;
    location: string;
    onPress?: () => void;
    variant?: 'vertical' | 'horizontal';
    isFavorite?: boolean;
    onFavoritePress?: () => void;
    containerStyle?: ViewStyle;
    isVerified?: boolean;
    buttonText?: string;
    onButtonPress?: () => void;
    isLandlord?: boolean;
    views?: number;
    status?: string;
    onEdit?: () => void;
    commission?: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
    image,
    title,
    price,
    location,
    onPress,
    variant = 'vertical',
    onFavoritePress,
    isFavorite,
    containerStyle,
    isVerified = true,
    buttonText = "BOOK NOW",
    onButtonPress,
    isLandlord,
    views,
    status,
    onEdit,
    commission
}) => {
    const { colors } = useTheme();

    const getSource = (src: any) => {
        if (!src) return require('../assets/images/Homes/home1.png');
        if (typeof src === 'string') return { uri: src };
        return src;
    };

    const finalSource = getSource(image);
    const placeholder = require('../assets/images/Homes/home1.png');

    // VARIANT: 'horizontal' (Matches the "Vertical Listing" design in the HTML)
    // Horizontal row for vertical lists
    if (variant === 'horizontal') {
        return (
            <TouchableOpacity
                style={[styles.cardList, { backgroundColor: colors.card }, containerStyle]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Image
                    source={finalSource}
                    placeholder={placeholder}
                    style={styles.imageList}
                    contentFit="cover"
                    transition={200}
                />
                <View style={styles.contentList}>
                    <Text numberOfLines={1} style={[styles.titleList, { color: colors.text }]}>{title}</Text>
                    <View style={styles.locationContainerList}>
                        <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
                        <Text numberOfLines={1} style={[styles.locationTextList, { color: colors.textSecondary }]}>{location}</Text>
                    </View>
                    <Text style={[styles.priceList, { color: colors.primary }]}>{price}</Text>
                </View>
                {!isLandlord && (
                    <TouchableOpacity
                        style={styles.favoriteButtonList}
                        onPress={onFavoritePress}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={18}
                            color={isFavorite ? "#EF4444" : colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
                <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    }

    // VARIANT: 'vertical' (Matches the "Horizontal Listing" design in the HTML)
    // Vertical card for horizontal carousels
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

                {isVerified && !isLandlord && (
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                )}

                {isLandlord && status && (
                    <View style={[styles.statusBadge, { backgroundColor: status.toLowerCase() === 'available' ? '#059669' : '#F59E0B' }]}>
                        <Text style={styles.statusText}>{status}</Text>
                    </View>
                )}

                {isLandlord && onEdit && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={onEdit}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil" size={14} color="#0F172A" />
                    </TouchableOpacity>
                )}

                {!isLandlord && (
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={onFavoritePress}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={16}
                            color={isFavorite ? "#EF4444" : colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.contentVertical}>
                <Text numberOfLines={1} style={[styles.titleVertical, { color: colors.text }]}>{title}</Text>

                <View style={styles.locationContainerVertical}>
                    <Ionicons name="location-sharp" size={14} color={colors.textSecondary} />
                    <Text numberOfLines={1} style={[styles.locationTextVertical, { color: colors.textSecondary }]}>{location}</Text>
                </View>

                <View style={styles.priceRowVertical}>
                    <View>
                        <Text style={[styles.priceVertical, { color: colors.primary }]}>{price}</Text>
                        {commission && (
                            <Text style={[styles.commissionText, { color: '#10B981' }]}>{commission}</Text>
                        )}
                    </View>
                    {isLandlord && views !== undefined && (
                        <View style={styles.viewsContainer}>
                            <Ionicons name="eye-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.viewsText, { color: colors.textSecondary }]}>{views} views</Text>
                        </View>
                    )}
                </View>
            </View>

            {buttonText && !isLandlord && (
                <TouchableOpacity
                    style={[styles.proceedButton, { backgroundColor: '#FDBA74' }]}
                    onPress={onButtonPress || onPress}
                >
                    <Text style={styles.proceedButtonText}>{buttonText}</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    // CARD STYLE (Used in horizontal listings)
    cardVertical: {
        width: 280,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
        alignItems: 'center',
    },
    imageWrapperVertical: {
        width: '100%',
        height: 160,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
    },
    imageVertical: {
        width: '100%',
        height: '100%',
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
        fontWeight: '500',
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentVertical: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 4,
    },
    titleVertical: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'System', // Closest to Plus Jakarta Sans if not loaded
    },
    locationContainerVertical: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationTextVertical: {
        fontSize: 12,
        color: '#6B7280',
    },
    priceVertical: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2,
    },
    proceedButton: {
        alignSelf: 'stretch',
        marginHorizontal: 16,
        marginBottom: 16,
        height: 40,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    editButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    priceRowVertical: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    viewsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewsText: {
        fontSize: 11,
        fontWeight: '500',
    },

    // LIST STYLE (Used in vertical listings)
    cardList: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
        alignItems: 'center',
        gap: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    imageList: {
        width: 96,
        height: 96,
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
    },
    contentList: {
        flex: 1,
        gap: 4,
        paddingVertical: 8,
    },
    titleList: {
        fontSize: 16,
        fontWeight: '700',
    },
    locationContainerList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationTextList: {
        fontSize: 12,
        color: '#6B7280',
    },
    priceList: {
        fontSize: 14,
        fontWeight: '800',
    },
    arrowContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButtonList: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commissionText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
});

export default PropertyCard;
