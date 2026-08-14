import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type PickerOption = {
    label: string;
    value: string;
    icon?: string;
};

type Props = {
    visible: boolean;
    title: string;
    options?: PickerOption[];
    selectedValue?: string;
    onSelect: (value: string) => void;
    onClose: () => void;
};

const BottomSheetPicker = ({ visible, title, options, selectedValue, onSelect, onClose }: Props) => {
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = React.useState('');
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return options || [];
        return (options || []).filter(opt => 
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80 || gestureState.vy > 0.5) {
                    closeSheet();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 10,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            setSearchQuery(''); // Reset search on open
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const renderItem = ({ item }: { item: PickerOption }) => {
        const isSelected = item.value === selectedValue;
        return (
            <TouchableOpacity
                style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => {
                    onSelect(item.value);
                    closeSheet();
                }}
                activeOpacity={0.7}
            >
                <View style={styles.optionLeft}>
                    {item.icon && (
                        <View style={[styles.iconContainer, { backgroundColor: isSelected ? colors.primary + '20' : colors.card }]}>
                            <Ionicons name={item.icon as any} size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                        </View>
                    )}
                    <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.text }]}>
                        {item.label}
                    </Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={closeSheet}>
            <TouchableWithoutFeedback onPress={closeSheet}>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        { backgroundColor: colors.background, transform: [{ translateY }] },
                    ]}
                >
                    {/* Drag handle */}
                    <View {...panResponder.panHandlers} style={styles.dragArea}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header with Search */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={styles.headerTop}>
                            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search banks..."
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Options */}
                    <FlatList
                        data={filteredOptions}
                        keyExtractor={(item) => item.value}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={48} color={colors.border} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No banks found</Text>
                            </View>
                        }
                    />
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
    },
    dragArea: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        height: '100%',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 34,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
});

export default BottomSheetPicker;