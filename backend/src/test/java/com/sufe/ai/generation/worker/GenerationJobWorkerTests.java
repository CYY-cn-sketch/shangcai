package com.sufe.ai.generation.worker;

import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ActiveProfiles("test")
@SpringBootTest
class GenerationJobWorkerTests {

    @Autowired
    private GenerationJobRepository repository;

    @Autowired
    private GenerationJobWorker worker;

    @BeforeEach
    void clearJobs() {
        repository.deleteAll();
    }

    @Test
    void claimsOnlyQueuedJobsForRequestedProvider() {
        GenerationJob workBuddyJob = repository.saveAndFlush(queuedJob(
                GenerationProvider.WORKBUDDY,
                ArtifactType.VIDEO,
                "workbuddy-oldest"
        ));
        GenerationJob lexiangJob = repository.saveAndFlush(queuedJob(
                GenerationProvider.LEXIANG,
                ArtifactType.PPT,
                "lexiang-job"
        ));

        GenerationJob claimed = worker.claimNext(GenerationProvider.LEXIANG, "lexiang-worker-01")
                .orElseThrow();

        assertThat(claimed.getId()).isEqualTo(lexiangJob.getId());
        assertThat(repository.findById(workBuddyJob.getId()).orElseThrow().getStatus())
                .isEqualTo(GenerationJobStatus.QUEUED);
    }

    @Test
    void claimsOldestQueuedJobFirst() {
        GenerationJob first = repository.saveAndFlush(queuedJob(
                GenerationProvider.LEXIANG,
                ArtifactType.PPT,
                "first"
        ));
        GenerationJob second = repository.saveAndFlush(queuedJob(
                GenerationProvider.LEXIANG,
                ArtifactType.PPT,
                "second"
        ));
        assertThat(first.getCreatedAt()).isBefore(second.getCreatedAt());

        GenerationJob claimed = worker.claimNext(GenerationProvider.LEXIANG, "lexiang-worker-01")
                .orElseThrow();

        assertThat(claimed.getId()).isEqualTo(first.getId());
        assertThat(repository.findById(second.getId()).orElseThrow().getStatus())
                .isEqualTo(GenerationJobStatus.QUEUED);
    }

    @Test
    void marksClaimedJobRunningAndRecordsExternalRunIdLater() {
        GenerationJob queued = repository.saveAndFlush(queuedJob(
                GenerationProvider.WORKBUDDY,
                ArtifactType.VIDEO,
                "state-change"
        ));

        GenerationJob claimed = worker.claimNext(GenerationProvider.WORKBUDDY, " workbuddy-worker-02 ")
                .orElseThrow();

        assertThat(claimed.getStatus()).isEqualTo(GenerationJobStatus.RUNNING);
        assertThat(claimed.getProviderWorkerId()).isEqualTo("workbuddy-worker-02");
        assertThat(claimed.getStartedAt()).isNotNull();
        assertThat(claimed.getExternalRunId()).isNull();

        GenerationJob updated = worker.recordExternalRunId(queued.getId(), " external-run-123 ");

        assertThat(updated.getStatus()).isEqualTo(GenerationJobStatus.RUNNING);
        assertThat(updated.getExternalRunId()).isEqualTo("external-run-123");
        assertThat(repository.findById(queued.getId()).orElseThrow().getExternalRunId())
                .isEqualTo("external-run-123");
    }

    @Test
    void rejectsExternalRunIdBeforeJobIsClaimed() {
        GenerationJob queued = repository.saveAndFlush(queuedJob(
                GenerationProvider.WORKBUDDY,
                ArtifactType.VIDEO,
                "not-claimed"
        ));

        assertThatThrownBy(() -> worker.recordExternalRunId(queued.getId(), "external-run-123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RUNNING");

        GenerationJob unchanged = repository.findById(queued.getId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(GenerationJobStatus.QUEUED);
        assertThat(unchanged.getExternalRunId()).isNull();
    }

    private static GenerationJob queuedJob(
            GenerationProvider provider,
            ArtifactType artifactType,
            String idempotencyKey
    ) {
        return GenerationJob.queued(
                "student-001",
                "conversation-001",
                "project-001",
                null,
                "pitch-expert",
                provider,
                artifactType,
                "{\"summary\":\"snapshot\"}",
                idempotencyKey
        );
    }
}
