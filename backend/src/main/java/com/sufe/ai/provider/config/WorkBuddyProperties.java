package com.sufe.ai.provider.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.nio.file.Path;

@ConfigurationProperties(prefix = "sufe.providers.workbuddy")
public record WorkBuddyProperties(
        boolean enabled,
        URI baseUrl,
        Path jobsRoot,
        int maxConcurrency
) {
    public WorkBuddyProperties {
        if (maxConcurrency < 1) {
            throw new IllegalArgumentException("WorkBuddy maxConcurrency 必须大于 0");
        }
    }
}
