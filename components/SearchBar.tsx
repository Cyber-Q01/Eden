import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ThemedTextInput from './ThemedTextInput';

interface SearchBarProps {
    placeholder?: string;
    onSearch?: (text: string) => void;
    onFilterPress?: () => void;
    showFilter?: boolean;
    style?: ViewStyle;
}

const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = "Search...",
    onSearch,
    onFilterPress,
    showFilter = true,
    style
}) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.container, style]}>
            <ThemedTextInput
                placeholder={placeholder}
                containerStyle={styles.inputWrapper}
                style={styles.input}
                leftIcon={<Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.icon} />}
                onChangeText={onSearch}
            />
            {showFilter && (
                <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.card }]} onPress={onFilterPress}>
                    <Ionicons name="options-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    inputWrapper: {
        flex: 1,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        height: '100%',
    },
    filterButton: {
        width: 56,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
});

export default SearchBar;
