package com.sufe.ai.generation.repository;

import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class GenerationJobRepositoryTests {

    @Autowired
    private GenerationJobRepository repository;

    @Test
    void persistsQueuedJobWithIsolatedContextAndIdempotencyKey() {
        GenerationJob job = GenerationJob.queued(
                "student-001",
                "conversation-001",
                "project-001",
                "idea-001",
                "pitch-expert",
                GenerationProvider.LEXIANG,
                ArtifactType.PPT,
                "{\"summary\":\"测试上下文\"}",
                "ppt-project-001-v1"
        );

        repository.saveAndFlush(job);

        GenerationJob persisted = repository
                .findByUserIdAndIdempotencyKey("student-001", "ppt-project-001-v1")
                .orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(GenerationJobStatus.QUEUED);
        assertThat(persisted.getConversationId()).isEqualTo("conversation-001");
        assertThat(persisted.getInputSnapshot()).contains("测试上下文");
    }
}
