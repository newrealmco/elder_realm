// providers.js — AI provider registry with model configs, pricing, and request/response adapters

const MAX_TOKENS = 700;

export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (fast)', inputPer1M: 1, outputPer1M: 5 },
      { id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5 (balanced)', inputPer1M: 3, outputPer1M: 15 },
      { id: 'claude-opus-4-6', label: 'Opus 4.6 (best)', inputPer1M: 5, outputPer1M: 25 },
    ],
    defaultModel: 'claude-haiku-4-5-20251001',

    buildRequest(apiKey, model, systemPrompt, messages) {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
        }),
      };
    },

    parseResponse(data) {
      if (data.stop_reason === 'max_tokens') {
        console.warn('DM response was truncated by max_tokens limit');
      }
      return {
        text: data.content?.[0]?.text || '',
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
        },
      };
    },
  },

  openai: {
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (cheapest)', inputPer1M: 0.10, outputPer1M: 0.40 },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (fast)', inputPer1M: 0.40, outputPer1M: 1.60 },
      { id: 'gpt-4.1', label: 'GPT-4.1 (quality)', inputPer1M: 2, outputPer1M: 8 },
    ],
    defaultModel: 'gpt-4.1-mini',

    buildRequest(apiKey, model, systemPrompt, messages) {
      // OpenAI uses system message in the messages array
      const oaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          messages: oaiMessages,
        }),
      };
    },

    parseResponse(data) {
      if (data.choices?.[0]?.finish_reason === 'length') {
        console.warn('DM response was truncated by max_tokens limit');
      }
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };
    },
  },

  gemini: {
    name: 'Google Gemini',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash-lite', label: 'Flash Lite (cheapest)', inputPer1M: 0.10, outputPer1M: 0.40 },
      { id: 'gemini-2.5-flash', label: 'Flash (fast)', inputPer1M: 0.30, outputPer1M: 2.50 },
      { id: 'gemini-2.5-pro', label: 'Pro (quality)', inputPer1M: 1.25, outputPer1M: 10 },
    ],
    defaultModel: 'gemini-2.5-flash',

    buildRequest(apiKey, model, systemPrompt, messages) {
      // Gemini uses "user"/"model" roles and a different body structure
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: MAX_TOKENS },
        }),
      };
    },

    parseResponse(data) {
      if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        console.warn('DM response was truncated by max_tokens limit');
      }
      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: {
          input_tokens: data.usageMetadata?.promptTokenCount || 0,
          output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    },
  },

  xai: {
    name: 'xAI (Grok)',
    keyPlaceholder: 'xai-...',
    keyUrl: 'https://console.x.ai/',
    models: [
      { id: 'grok-4.1-fast', label: 'Grok 4.1 Fast (cheap)', inputPer1M: 0.20, outputPer1M: 0.50 },
      { id: 'grok-3-mini', label: 'Grok 3 Mini (fast)', inputPer1M: 0.25, outputPer1M: 0.50 },
      { id: 'grok-4', label: 'Grok 4 (quality)', inputPer1M: 3, outputPer1M: 15 },
    ],
    defaultModel: 'grok-3-mini',

    buildRequest(apiKey, model, systemPrompt, messages) {
      // xAI uses OpenAI-compatible format
      const xaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];
      return {
        url: 'https://api.x.ai/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          messages: xaiMessages,
        }),
      };
    },

    parseResponse(data) {
      if (data.choices?.[0]?.finish_reason === 'length') {
        console.warn('DM response was truncated by max_tokens limit');
      }
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };
    },
  },
};

// ── Provider / Model Selection ────────────────────────────────────────────────

export function getSelectedProvider() {
  return localStorage.getItem('chronicles_provider') || 'anthropic';
}

export function setSelectedProvider(id) {
  localStorage.setItem('chronicles_provider', id);
}

export function getSelectedModel() {
  return localStorage.getItem('chronicles_model') || '';
}

export function setSelectedModel(id) {
  localStorage.setItem('chronicles_model', id);
}

export function getEffectiveModel(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return '';
  const saved = getSelectedModel();
  const valid = provider.models.some(m => m.id === saved);
  return valid ? saved : provider.defaultModel;
}

// ── Per-Provider API Key Storage ──────────────────────────────────────────────

export function getProviderApiKey(providerId) {
  return localStorage.getItem(`chronicles_apikey_${providerId}`) || '';
}

export function setProviderApiKey(providerId, key) {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(`chronicles_apikey_${providerId}`, trimmed);
  } else {
    localStorage.removeItem(`chronicles_apikey_${providerId}`);
  }
}

// ── Dynamic Pricing Lookup ────────────────────────────────────────────────────

export function getModelPricing(providerId, modelId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return { inputPerToken: 0, outputPerToken: 0 };
  const model = provider.models.find(m => m.id === modelId);
  if (!model) return { inputPerToken: 0, outputPerToken: 0 };
  return {
    inputPerToken: model.inputPer1M / 1_000_000,
    outputPerToken: model.outputPer1M / 1_000_000,
  };
}

// ── Legacy Key Migration ──────────────────────────────────────────────────────

(function migrateLegacyKey() {
  const legacy = localStorage.getItem('chronicles_api_key');
  if (legacy) {
    // Move legacy key to Anthropic if no Anthropic key exists yet
    if (!localStorage.getItem('chronicles_apikey_anthropic')) {
      localStorage.setItem('chronicles_apikey_anthropic', legacy);
    }
    localStorage.removeItem('chronicles_api_key');
  }
})();
