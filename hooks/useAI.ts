import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PriceAnalysis = {
  verdict: 'fair' | 'above_average' | 'below_average' | 'suspicious';
  badge: 'great_deal' | 'fair_price' | 'premium' | null;
  warning: string | null;
  summary: string;
  average_price: number;
  price_range_low: number;
  price_range_high: number;
  confidence: 'high' | 'medium' | 'low';
  comparables_count: number;
  analysed_at: string;
};

// ── AI Rental Assistant ─────────────────────────────────────────────────────

export const useAIAssistant = () => {
  const { showError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);

  const sendMessage = async (userMessage: string): Promise<void> => {
    if (!userMessage.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(newMessages);
    setThinking(true);

    try {
      const data = await callEdgeFunction<{ reply: string }>(
        'ai-assistant', 'POST', {
        type: 'chat',
        messages: newMessages,
      }
      );

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data?.reply ?? 'Sorry, I could not process that.' },
      ]);
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return { messages, thinking, sendMessage, clearMessages };
};

// ── Price Intelligence ──────────────────────────────────────────────────────

export const usePriceAnalysis = (propertyId: string | null) => {
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      // Check cache first
      const { data: cached } = await supabase
        .from('price_analyses')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (cached) {
        // Refresh if older than 7 days
        const ageInDays = (Date.now() - new Date(cached.analysed_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) {
          setAnalysis(cached as PriceAnalysis);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh analysis
      const data = await callEdgeFunction<{ analysis: PriceAnalysis }>(
        'analyse-property-price', 'POST', { property_id: propertyId }
      );
      if (data?.analysis) setAnalysis(data.analysis);
    } catch {
      // Silently fail — price analysis is non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, [propertyId]);

  return { analysis, loading };
};

// ── Neighbourhood Insights ──────────────────────────────────────────────────

export const useNeighbourhoodInsights = (state: string | null, lga: string | null) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state || !lga) return;

    const fetch = async () => {
      setLoading(true);
      try {
        // Check cache
        const { data: cached } = await supabase
          .from('neighbourhood_insights')
          .select('*')
          .eq('state', state)
          .eq('lga', lga)
          .single();

        if (cached) {
          setInsights(cached);
          setLoading(false);
          return;
        }

        // Generate fresh
        const data = await callEdgeFunction('ai-assistant', 'POST', {
          type: 'neighbourhood',
          state,
          lga,
        });
        if (data) setInsights(data);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [state, lga]);

  return { insights, loading };
};

// ── Generic AI Hook ─────────────────────────────────────────────────────────

export const useAI = () => {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);

  const chatWithAssistant = async (messages: string | ChatMessage[]): Promise<string | null> => {
    setLoading(true);
    try {
      const formattedMessages = typeof messages === 'string'
        ? [{ role: 'user', content: messages }]
        : messages;

      const data = await callEdgeFunction<{ reply: string }>(
        'ai-assistant', 'POST', {
        type: 'chat',
        messages: formattedMessages,
      }
      );
      console.log(data?.reply)
      return data?.reply ?? null;

    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const explainClause = async (clauseText: string): Promise<string | null> => {
    setLoading(true);
    try {
      const data = await callEdgeFunction<{ explanation: string }>(
        'ai-assistant', 'POST', {
        type: 'explain_clause',
        clause: clauseText,
      }
      );
      return data?.explanation ?? null;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { chatWithAssistant, explainClause, loading };
};
