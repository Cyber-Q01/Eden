import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
    currentStep: number;
    totalSteps: number;
    labels?: string[];
};

const StepIndicator = ({ currentStep, totalSteps, labels }: Props) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container} >
            {
                Array.from({ length: totalSteps }).map((_, index) => {
                    const isCompleted = index < currentStep;
                    const isActive = index === currentStep;
                    return (
                        <React.Fragment key={index} >
                            <View style={styles.stepWrapper}>
                                <View style={
                                    [
                                        styles.circle,
                                        { borderColor: isActive || isCompleted ? colors.primary : colors.border },
                                        (isActive || isCompleted) && { backgroundColor: colors.primary },
                                    ]
                                }>
                                    {
                                        isCompleted ? (
                                            <Text style={styles.checkmark} >✓</ Text >
                                        ) : (
                                            <Text style={[styles.stepNumber, { color: isActive ? '#fff' : colors.textSecondary }]} >
                                                {index + 1}
                                            </Text>
                                        )}
                                </View>
                                {
                                    labels && (
                                        <Text style={
                                            [
                                                styles.label,
                                                { color: isActive ? colors.primary : colors.textSecondary },
                                                isActive && { fontWeight: '600' },
                                            ]
                                        } numberOfLines={1} >
                                            {labels[index]}
                                        </Text>
                                    )
                                }
                            </View>
                            {
                                index < totalSteps - 1 && (
                                    <View style={
                                        [
                                            styles.line,
                                            { backgroundColor: isCompleted ? colors.primary : colors.border },
                                        ]
                                    } />
                                )
                            }
                        </React.Fragment>
                    );
                })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    stepWrapper: {
        alignItems: 'center',
        gap: 4,
    },
    circle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumber: {
        fontSize: 12,
        fontWeight: '600',
    },
    checkmark: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    label: {
        fontSize: 10,
        maxWidth: 60,
        textAlign: 'center',
    },
    line: {
        flex: 1,
        height: 2,
        marginBottom: 16,
        marginHorizontal: 4,
    },
});

export default StepIndicator;