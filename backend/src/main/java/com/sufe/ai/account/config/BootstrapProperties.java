package com.sufe.ai.account.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sufe.bootstrap")
public record BootstrapProperties(
        boolean demoDataEnabled,
        String demoPassword
) {
}
