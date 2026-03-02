import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface SectionHeaderProps {
    title: string;
    actionText?: string;
    onActionPress?: () => void;
    style?: ViewStyle;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    actionText,
    onActionPress,
    style
}) => {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>{title}</Text>
            {actionText && onActionPress && (
                <TouchableOpacity onPress={onActionPress}>
                    <Text style={styles.actionText}>{actionText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    actionText: {
        fontSize: 14,
        color: '#407BFF',
        fontWeight: '600',
    },
});

export default SectionHeader;
