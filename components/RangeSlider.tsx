import React, { useCallback, useState } from 'react';
import { StyleSheet, View, PanResponder, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RangeSliderProps {
    min: number;
    max: number;
    step?: number;
    initialLow?: number;
    initialHigh?: number;
    onValueChanged: (low: number, high: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80; // Assuming 20px padding on each side for the container
const THUMB_RADIUS = 12;

const RangeSlider: React.FC<RangeSliderProps> = ({
    min,
    max,
    step = 1,
    initialLow,
    initialHigh,
    onValueChanged,
}) => {
    const { colors } = useTheme();
    const [low, setLow] = useState(initialLow ?? min);
    const [high, setHigh] = useState(initialHigh ?? max);
    const [sliderWidth, setSliderWidth] = useState(SLIDER_WIDTH);

    const getPositionFromValue = useCallback((value: number) => {
        return ((value - min) / (max - min)) * sliderWidth;
    }, [min, max, sliderWidth]);

    const getValueFromPosition = useCallback((position: number) => {
        const value = min + (position / sliderWidth) * (max - min);
        return Math.round(value / step) * step;
    }, [min, max, sliderWidth, step]);

    const handlePanResponderMoveLow = (_: any, gestureState: any) => {
        const newPos = Math.max(0, Math.min(gestureState.moveX - (SCREEN_WIDTH - sliderWidth) / 2, getPositionFromValue(high) - THUMB_RADIUS));
        const newValue = getValueFromPosition(newPos);
        setLow(newValue);
        onValueChanged(newValue, high);
    };

    const handlePanResponderMoveHigh = (_: any, gestureState: any) => {
        const newPos = Math.min(sliderWidth, Math.max(gestureState.moveX - (SCREEN_WIDTH - sliderWidth) / 2, getPositionFromValue(low) + THUMB_RADIUS));
        const newValue = getValueFromPosition(newPos);
        setHigh(newValue);
        onValueChanged(low, newValue);
    };

    const panResponderLow = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: handlePanResponderMoveLow,
    });

    const panResponderHigh = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: handlePanResponderMoveHigh,
    });

    const lowPos = getPositionFromValue(low);
    const highPos = getPositionFromValue(high);

    return (
        <View 
            style={styles.container}
            onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        >
            <View style={[styles.track, { backgroundColor: colors.border }]} />
            <View 
                style={[
                    styles.activeTrack, 
                    { 
                        backgroundColor: colors.primary,
                        left: lowPos,
                        width: highPos - lowPos
                    }
                ]} 
            />
            
            <View
                {...panResponderLow.panHandlers}
                style={[
                    styles.thumb,
                    { 
                        left: lowPos - THUMB_RADIUS,
                        backgroundColor: '#FFF',
                        borderColor: colors.border
                    }
                ]}
            />
            
            <View
                {...panResponderHigh.panHandlers}
                style={[
                    styles.thumb,
                    { 
                        left: highPos - THUMB_RADIUS,
                        backgroundColor: '#FFF',
                        borderColor: colors.border
                    }
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 40,
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
    },
    track: {
        height: 4,
        borderRadius: 2,
        width: '100%',
    },
    activeTrack: {
        height: 4,
        position: 'absolute',
        borderRadius: 2,
    },
    thumb: {
        width: THUMB_RADIUS * 2,
        height: THUMB_RADIUS * 2,
        borderRadius: THUMB_RADIUS,
        borderWidth: 2,
        position: 'absolute',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
});

export default RangeSlider;
