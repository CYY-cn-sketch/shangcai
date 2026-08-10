package com.sufe.ai.provider.session;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.session.domain.ProviderSession;
import com.sufe.ai.provider.session.repository.ProviderSessionRepository;
import com.sufe.ai.provider.session.service.ProviderSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static java.time.temporal.ChronoUnit.MICROS;

@ActiveProfiles("test")
@SpringBootTest
class ProviderSessionPersistenceTests {

    @Autowired
    private ProviderSessionService providerSessionService;

    @Autowired
    private ProviderSessionRepository providerSessionRepository;

    @Test
    void getOrCreateKeepsAnonymousStaffIdStableForTheSameContext() {
        String suffix = UUID.randomUUID().toString();

        ProviderSession first = providerSessionService.getOrCreate(
                "user-" + suffix,
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG
        );
        ProviderSession second = providerSessionService.getOrCreate(
                " user-" + suffix + " ",
                " project-001 ",
                " conversation-001 ",
                " pitch-expert ",
                GenerationProvider.LEXIANG
        );

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(second.getAnonymousStaffId()).isEqualTo(first.getAnonymousStaffId()).isNotBlank();
        assertThat(second.getAnonymousStaffId()).hasSizeBetween(16, 32);
        assertThat(second.getExternalSessionId()).isNull();
        assertThat(second.getVersion()).isZero();
        assertThat(second.getCreatedAt()).isNotNull();
        assertThat(second.getUpdatedAt()).isEqualTo(second.getCreatedAt());
    }

    @Test
    void updatesExternalSessionIdAndIncrementsVersion() {
        String suffix = UUID.randomUUID().toString();
        ProviderSession created = providerSessionService.getOrCreate(
                "user-" + suffix,
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG
        );
        ProviderSession beforeUpdate = providerSessionRepository.findById(created.getId()).orElseThrow();

        ProviderSession updated = providerSessionService.updateExternalSessionId(
                created.getId(),
                " external-session-001 "
        );

        assertThat(updated.getExternalSessionId()).isEqualTo("external-session-001");
        assertThat(updated.getVersion()).isEqualTo(beforeUpdate.getVersion() + 1);
        assertThat(updated.getCreatedAt()).isCloseTo(beforeUpdate.getCreatedAt(), within(1, MICROS));
        assertThat(updated.getUpdatedAt()).isAfterOrEqualTo(beforeUpdate.getUpdatedAt());

        ProviderSession persisted = providerSessionRepository.findById(created.getId()).orElseThrow();
        assertThat(persisted.getExternalSessionId()).isEqualTo("external-session-001");
        assertThat(persisted.getVersion()).isEqualTo(updated.getVersion());
    }
}
