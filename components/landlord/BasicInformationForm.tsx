import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getLGAsForState, getStateNames } from '../../lib/nigeriaData';
import BottomSheetPicker from '../BottomSheetPicker';
import ThemedTextInput from '../ThemedTextInput';

const HOME_TYPES = ['1 Bedroom', '2 Bedroom', 'Studio', 'Self-contain', 'Duplex', 'Bungalow'];

type BasicInformationFormProps = {
    title: string;
    setTitle: (text: string) => void;
    description: string;
    setDescription: (text: string) => void;
    price: string;
    setPrice: (text: string) => void;
    state: string;
    setState: (text: string) => void;
    lga: string;
    setLga: (text: string) => void;
    type: string;
    setType: (text: string) => void;
};

const BasicInformationForm: React.FC<BasicInformationFormProps> = ({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    state, setState,
    lga, setLga,
    type, setType
}) => {
    const { colors } = useTheme();

    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showStatePicker, setShowStatePicker] = useState(false);
    const [showLgaPicker, setShowLgaPicker] = useState(false);

    const handleStateSelect = (selectedState: string) => {
        setState(selectedState);
        setLga(''); // Reset LGA when state changes
    };

    return (
        <View style={styles.section}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Basic Information</Text>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Property Title</Text>
                <ThemedTextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter property title"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
                <ThemedTextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={4}
                    containerStyle={styles.textAreaContainer}
                    style={styles.textArea}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Price</Text>
                <ThemedTextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="Enter property price e.g. 500000"
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>State</Text>
                <TouchableOpacity
                    style={[styles.dropdown, { borderColor: colors.border }]}
                    onPress={() => setShowStatePicker(true)}
                >
                    <Text style={[styles.dropdownText, { color: state ? colors.text : colors.textSecondary }]}>
                        {state || 'Select State'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>LGA</Text>
                <TouchableOpacity
                    style={[styles.dropdown, { borderColor: colors.border }, !state && { opacity: 0.5 }]}
                    onPress={() => state && setShowLgaPicker(true)}
                    disabled={!state}
                >
                    <Text style={[styles.dropdownText, { color: lga ? colors.text : colors.textSecondary }]}>
                        {lga || 'Select LGA'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Property Type</Text>
                <TouchableOpacity
                    style={[styles.dropdown, { borderColor: colors.border }]}
                    onPress={() => setShowTypePicker(true)}
                >
                    <Text style={[styles.dropdownText, { color: type ? colors.text : colors.textSecondary }]}>
                        {type || 'Select property type'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Pickers */}
            <BottomSheetPicker
                visible={showTypePicker}
                title="Select Property Type"
                options={HOME_TYPES.map(t => ({ label: t, value: t }))}
                selectedValue={type}
                onSelect={(val) => setType(val)}
                onClose={() => setShowTypePicker(false)}
            />

            <BottomSheetPicker
                visible={showStatePicker}
                title="Select State"
                options={getStateNames().map(s => ({ label: s, value: s }))}
                selectedValue={state}
                onSelect={(val) => handleStateSelect(val)}
                onClose={() => setShowStatePicker(false)}
            />

            <BottomSheetPicker
                visible={showLgaPicker}
                title="Select LGA"
                options={getLGAsForState(state).map(l => ({ label: l, value: l }))}
                selectedValue={lga}
                onSelect={(val) => setLga(val)}
                onClose={() => setShowLgaPicker(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginTop: 20,
        marginBottom: 30,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    textAreaContainer: {
        height: 120,
        paddingTop: 16,
        alignItems: 'flex-start',
    },
    textArea: {
        textAlignVertical: 'top',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    dropdownText: {
        fontSize: 16,
    },
});

export default BasicInformationForm;
