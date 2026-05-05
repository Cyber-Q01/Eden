import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AIAssistantModal from './AIAssistantModal';

const AIAssistantTrigger = () => {
    const { colors } = useTheme();
    const { role } = useAuth();
    const [visible, setVisible] = useState(false);

    // Only show for Tenants (Renters)
    if (role !== 'TENANT') return null;

    return (
        <>
            <TouchableOpacity
                style={[styles.blob, { backgroundColor: colors.primary }]}
                onPress={() => setVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="sparkles" size={24} color="#fff" />
            </TouchableOpacity>

            <AIAssistantModal 
                visible={visible} 
                onClose={() => setVisible(false)} 
            />
        </>
    );
};

const styles = StyleSheet.create({
    blob: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        zIndex: 9999,
    },
});

export default AIAssistantTrigger;
