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
}
