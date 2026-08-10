package com.sufe.ai.provider;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VerifiedProviderUsageTests {

    @Test
    void normalizesOnlyExplicitProviderFields() {
        VerifiedProviderUsage usage = new VerifiedProviderUsage(" request-001 ", " model-001 ", 12, 8);

        assertThat(usage.requestId()).isEqualTo("request-001");
        assertThat(usage.modelName()).isEqualTo("model-001");
        assertThat(usage.inputTokens()).isEqualTo(12);
        assertThat(usage.outputTokens()).isEqualTo(8);
    }

    @Test
    void rejectsMissingRequestIdAndNegativeTokenCounts() {
        assertThatThrownBy(() -> new VerifiedProviderUsage(" ", null, 1, 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new VerifiedProviderUsage("request-001", null, -1, 1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
