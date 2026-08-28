import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CustomDatePickerModalProps {
    visible: boolean;
    value: string; // YYYY-MM-DD
    onConfirm: (dateStr: string) => void;
    onClose: () => void;
    maximumDate?: Date;
    minimumDate?: Date;
    title?: string;
}

/**
 * Safely parses YYYY-MM-DD into a local Date (at local midnight).
 * Avoids UTC parsing shifts (e.g. new Date('1995-05-15') parsing as UTC midnight).
 */
export const parseYYYYMMDD = (dateStr: string, fallback?: Date): Date => {
    if (dateStr && dateStr.trim()) {
        const parts = dateStr.trim().split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                return new Date(year, month, day, 12, 0, 0); // Use 12:00 PM local to avoid any DST boundary shifts
            }
        }
    }
    return fallback || new Date(2000, 0, 1, 12, 0, 0);
};

/**
 * Safely formats a Date object into YYYY-MM-DD using local time getters.
 * Avoids toISOString() timezone offset shifts.
 */
export const formatYYYYMMDD = (dateObj: Date): string => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const CustomDatePickerModal = ({
    visible,
    value,
    onConfirm,
    onClose,
    maximumDate,
    minimumDate,
    title = 'Select Date of Birth',
}: CustomDatePickerModalProps) => {
    const { colors, isDark } = useTheme();
    const [tempDate, setTempDate] = useState<Date>(() => parseYYYYMMDD(value));

    // Keep tempDate in sync whenever modal becomes visible or value changes (iOS spinner only)
    useEffect(() => {
        if (visible && Platform.OS === 'ios') {
            setTempDate(parseYYYYMMDD(value));
        }
    }, [visible, value]);

    // ── Android: the native dialog is one-shot (mount → opens dialog). ─────────
    // The library re-runs its open() effect whenever the `onChange` prop identity
    // or the value timestamp changes, and a re-opened dialog resets/flickers.
    // The old code passed an inline onChange (new identity every render) AND a
    // stale `tempDate` state (dialog first opened on 2000-01-01 or the previous
    // pick, then jumped) — that was the "glitchy calendar".
    // Fix: stable onChange via ref + value parsed fresh from props at render time.
    const confirmRef = useRef(onConfirm);
    confirmRef.current = onConfirm;
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    const handleNativeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
        closeRef.current();
        if (event.type === 'set' && selectedDate) {
            confirmRef.current(formatYYYYMMDD(selectedDate));
        }
    }, []);

    if (!visible) return null;

    // Android: mounting DateTimePicker opens the native dialog directly
    if (Platform.OS === 'android') {
        return (
            <DateTimePicker
                value={parseYYYYMMDD(value)}
                mode="date"
                display="default"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={handleNativeChange}
            />
        );
    }

    // iOS: Wrap DateTimePicker inside a modal with Cancel / Done header
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                const formatted = formatYYYYMMDD(tempDate);
                                onConfirm(formatted);
                                onClose();
                            }}
                            style={styles.headerBtn}
                        >
                            <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Picker */}
                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="spinner"
                            maximumDate={maximumDate}
                            minimumDate={minimumDate}
                            textColor={colors.text}
                            onChange={(_: DateTimePickerEvent, selectedDate?: Date) => {
                                if (selectedDate) {
                                    setTempDate(selectedDate);
                                }
                            }}
                            style={styles.picker}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
    doneText: {
        fontSize: 15,
        fontWeight: '700',
    },
    pickerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    picker: {
        width: '100%',
        height: 200,
    },
});

export default CustomDatePickerModal;
