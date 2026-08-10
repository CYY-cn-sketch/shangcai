package com.sufe.ai.provider.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sufe.providers.lexiang.pull")
public record LexiangPullProperties(
        boolean scheduledEnabled,
        long fixedDelayMs
) {
    public LexiangPullProperties {
        if (fixedDelayMs < 1_000) {
            throw new IllegalArgumentException("乐享回拉 fixedDelayMs 不能小于 1000");
        }
    }
}
