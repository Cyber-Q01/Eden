import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from './ScreenWrapper';

const PlaceholderScreen = ({ title }: { title: string }) => {
    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>Coming Soon</Text>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
    },
});

export default PlaceholderScreen;
