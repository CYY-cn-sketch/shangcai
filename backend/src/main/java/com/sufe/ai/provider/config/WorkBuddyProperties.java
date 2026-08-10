package com.sufe.ai.provider.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.nio.file.Path;

@ConfigurationProperties(prefix = "sufe.providers.workbuddy")
public record WorkBuddyProperties(
        boolean enabled,
        URI baseUrl,
        Path jobsRoot,
        int maxConcurrency,
        long pollIntervalMs,
        long runTimeoutMs
) {
    public WorkBuddyProperties {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("WorkBuddy maxConcurrency 必须大于 0");
        }
        if (pollIntervalMs < 1) {
            throw new IllegalArgumentException("WorkBuddy pollIntervalMs must be greater than 0");
        }
        if (runTimeoutMs < pollIntervalMs) {
            throw new IllegalArgumentException("WorkBuddy runTimeoutMs must not be shorter than pollIntervalMs");
        }
    }
}
