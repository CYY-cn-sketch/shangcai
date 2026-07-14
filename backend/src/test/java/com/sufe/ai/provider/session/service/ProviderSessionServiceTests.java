package com.sufe.ai.provider.session.service;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.session.domain.ProviderSession;
import com.sufe.ai.provider.session.repository.ProviderSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProviderSessionServiceTests {

    @Test
    void returnsWinningSessionWhenConcurrentCreateHitsUniqueConstraint() {
        ProviderSessionRepository repository = mock(ProviderSessionRepository.class);
        ProviderSessionService service = new ProviderSessionService(repository);
        ProviderSession winningSession = ProviderSession.create(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG,
                "anonymous-winner-001"
        );

        when(repository.findByUserIdAndProjectIdAndConversationIdAndExpertIdAndProvider(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG
        )).thenReturn(Optional.empty()).thenReturn(Optional.of(winningSession));
        when(repository.saveAndFlush(any(ProviderSession.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        ProviderSession result = service.getOrCreate(
                " user-001 ",
                " project-001 ",
                " conversation-001 ",
                " pitch-expert ",
                GenerationProvider.LEXIANG
        );

        assertThat(result).isSameAs(winningSession);
        assertThat(result.getAnonymousStaffId()).isEqualTo("anonymous-winner-001");
    }
}
