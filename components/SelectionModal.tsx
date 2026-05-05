import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SelectionModalProps {
    visible: boolean;
    title: string;
    options: string[];
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ visible, title, options, selectedValue, onSelect, onClose }) => {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {options.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.typeOption,
                                    { borderBottomColor: colors.border },
                                    selectedValue === item && { backgroundColor: colors.card }
                                ]}
                                onPress={() => onSelect(item)}
                            >
                                <Text style={[
                                    styles.typeOptionText,
                                    { color: selectedValue === item ? colors.primary : colors.text },
                                    selectedValue === item && { fontWeight: 'bold' }
                                ]}>
                                    {item}
                                </Text>
                                {selectedValue === item && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    typeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    typeOptionText: {
        fontSize: 16,
    },
});

export default SelectionModal;
