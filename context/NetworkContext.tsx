import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NetworkContextType {
    isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({ isConnected: true });

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(true);
    const [showBanner, setShowBanner] = useState(false);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const connected = state.isConnected ?? true;
            setIsConnected(connected);

            if (!connected) {
                setShowBanner(true);
            } else {
                // Show "back online" briefly then hide
                if (showBanner) {
                    setTimeout(() => setShowBanner(false), 2500);
                }
            }
        });

        return () => unsubscribe();
    }, [showBanner]);

    return (
        <NetworkContext.Provider value={{ isConnected }}>
            {children}
            {showBanner && (
                <View
                    style={[
                        styles.banner,
                        {
                            top: insets.top,
                            backgroundColor: isConnected ? '#4CAF50' : '#424242',
                        },
                    ]}
                >
                    <Ionicons
                        name={isConnected ? 'wifi-outline' : 'cloud-offline-outline'}
                        size={16}
                        color="#FFF"
                    />
                    <Text style={styles.bannerText}>
                        {isConnected ? 'Back online' : 'No internet connection'}
                    </Text>
                </View>
            )}
        </NetworkContext.Provider>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8,
        zIndex: 10000,
    },
    bannerText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
