package com.sufe.ai.provider.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;

@ConfigurationProperties(prefix = "sufe.providers.deepseek")
public record DeepSeekProperties(
        boolean enabled,
        URI apiBase,
        String apiKey,
        String flashModel,
        String proModel,
        int maxOutputTokens,
        int maxHistoryMessages,
        int maxKnowledgeChars
) {
    public DeepSeekProperties {
        if (apiBase == null) throw new IllegalArgumentException("DeepSeek apiBase 不能为空");
        if (maxOutputTokens < 1) throw new IllegalArgumentException("DeepSeek maxOutputTokens 必须大于 0");
        if (maxHistoryMessages < 1) throw new IllegalArgumentException("DeepSeek maxHistoryMessages 必须大于 0");
        if (maxKnowledgeChars < 0) throw new IllegalArgumentException("DeepSeek maxKnowledgeChars 不能小于 0");
    }

    public boolean configured() {
        return enabled && hasText(apiKey) && hasText(flashModel) && hasText(proModel);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
