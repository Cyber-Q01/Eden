import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
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
    placeholder = "Search by location, price, or type",
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
                rightIcon={showFilter && onFilterPress ? (
                    <TouchableOpacity onPress={onFilterPress} activeOpacity={0.7} style={styles.filterButtonInline}>
                        <Ionicons name="options-outline" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : undefined}
                onChangeText={onSearch}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    inputWrapper: {
        height: 56,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        height: '100%',
    },
    filterButtonInline: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SearchBar;
