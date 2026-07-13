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
        String spaceId,
        int maxConcurrency
) {
    public boolean configured() {
        return enabled && hasText(appKey) && hasText(appSecret);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
