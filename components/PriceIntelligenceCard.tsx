import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { callEdgeFunction } from '../lib/api';

type PriceAnalysis = {
    verdict: 'fair' | 'above_average' | 'below_average' | 'suspicious';
    badge: 'great_deal' | 'fair_price' | 'premium' | 'suspicious' | null;
    warning: string | null;
    summary: string;
    average_price: number;
    price_range_low: number;
    price_range_high: number;
    confidence: 'high' | 'medium' | 'low';
    comparables_count: number;
};

type Props = {
    propertyId: string;
    propertyPrice: number;
};

const BADGE_CONFIG = {
    great_deal: { label: '🔥 Great Deal', bg: '#22c55e15', text: '#16a34a', border: '#22c55e30' },
    fair_price: { label: '✅ Fair Price', bg: '#3b82f615', text: '#2563eb', border: '#3b82f630' },
    premium: { label: '💎 Premium', bg: '#8b5cf615', text: '#7c3aed', border: '#8b5cf630' },
    suspicious: { label: '⚠️ Unusual Price', bg: '#f59e0b15', text: '#d97706', border: '#f59e0b30' },
};

const PriceIntelligenceCard = ({ propertyId, propertyPrice }: Props) => {
    const { colors } = useTheme();
    const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadAnalysis();
    }, [propertyId]);

    const loadAnalysis = async () => {
        setLoading(true);
        try {
            // Try to get cached analysis first from the DB via properties endpoint
            const data = await callEdgeFunction<any>(
                'analyse-property-price',
                'POST',
                { property_id: propertyId }
            );
            if (data?.analysis) setAnalysis(data.analysis);
            else if (data?.verdict) setAnalysis(data);
        } catch {
            // Silently fail — price intelligence is non-critical
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Analysing price...
                    </Text>
                </View>
            </View>
        );
    }

    if (!analysis || analysis.confidence === 'low') return null;

    const badge = analysis.badge ? BADGE_CONFIG[analysis.badge] : null;
    const priceRange = analysis.price_range_high - analysis.price_range_low;
    const normalizedPos = priceRange > 0
        ? Math.min(1, Math.max(0, (propertyPrice - analysis.price_range_low) / priceRange))
        : 0.5;

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header row */}
            <TouchableOpacity
                style={styles.headerRow}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.titleRow}>
                    <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Price Intelligence</Text>
                </View>
                <View style={styles.rightRow}>
                    {badge && (
                        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                    )}
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {/* Summary always visible */}
            <Text style={[styles.summary, { color: colors.textSecondary }]}>{analysis.summary}</Text>

            {/* Expanded details */}
            {expanded && (
                <View style={styles.expandedContent}>
                    {/* Price range bar */}
                    <View style={styles.rangeSection}>
                        <View style={styles.rangeLabels}>
                            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
                                ₦{(analysis.price_range_low / 1000).toFixed(0)}k
                            </Text>
                            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
                                Area range
                            </Text>
                            <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
                                ₦{(analysis.price_range_high / 1000).toFixed(0)}k
                            </Text>
                        </View>
                        <View style={[styles.rangeBar, { backgroundColor: colors.border }]}>
                            <View style={[styles.rangeFill, { width: '70%', backgroundColor: colors.primary + '30' }]} />
                            {/* Property price marker */}
                            <View style={[styles.priceMarker, {
                                left: `${normalizedPos * 100}%` as any,
                                backgroundColor: colors.primary,
                            }]} />
                        </View>
                        <Text style={[styles.avgText, { color: colors.textSecondary }]}>
                            Area average: ₦{analysis.average_price.toLocaleString()}/yr
                            {' · '}
                            {analysis.comparables_count} similar properties
                        </Text>
                    </View>

                    {/* Warning */}
                    {analysis.warning && (
                        <View style={[styles.warningBox, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b30' }]}>
                            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                            <Text style={[styles.warningText, { color: '#d97706' }]}>{analysis.warning}</Text>
                        </View>
                    )}

                    {/* Confidence */}
                    <Text style={[styles.confidence, { color: colors.textSecondary }]}>
                        Analysis confidence: {analysis.confidence}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
        marginHorizontal: 20, marginBottom: 12,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loadingText: { fontSize: 13 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 14, fontWeight: '700' },
    rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    summary: { fontSize: 13, lineHeight: 18 },
    expandedContent: { gap: 10, marginTop: 4 },
    rangeSection: { gap: 6 },
    rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    rangeLabel: { fontSize: 11 },
    rangeBar: {
        height: 8, borderRadius: 4, overflow: 'visible', position: 'relative',
    },
    rangeFill: { position: 'absolute', left: '15%', height: '100%', borderRadius: 4 },
    priceMarker: {
        position: 'absolute', top: -4, width: 16, height: 16,
        borderRadius: 8, marginLeft: -8, borderWidth: 2, borderColor: '#fff',
    },
    avgText: { fontSize: 11, marginTop: 2 },
    warningBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        padding: 10, borderRadius: 8, borderWidth: 1,
    },
    warningText: { fontSize: 12, flex: 1, lineHeight: 17 },
    confidence: { fontSize: 11, textAlign: 'right' },
});

export default PriceIntelligenceCard;
