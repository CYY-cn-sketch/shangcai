package com.sufe.ai.provider.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;

@ConfigurationProperties(prefix = "sufe.providers.lexiang")
public record LexiangProperties(
        boolean enabled,
        URI apiBase,
        String appKey,
        String appSecret,
        String staffId,
        String knowledgeStaffId,
        String spaceId,
        int maxConcurrency
) {
    public LexiangProperties {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("乐享 maxConcurrency 必须大于 0");
        }
    }

    public boolean configured() {
        return enabled && hasText(appKey) && hasText(appSecret);
    }

    public boolean knowledgeConfigured() {
        return configured() && hasText(knowledgeStaffId);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
