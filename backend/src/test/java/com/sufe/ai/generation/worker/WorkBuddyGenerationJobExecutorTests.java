package com.sufe.ai.generation.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import com.sufe.ai.provider.workbuddy.service.WorkBuddyRunService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkBuddyGenerationJobExecutorTests {

    @TempDir
    Path tempDir;

    @Test
    void neverCallsProviderForAStoredJobWithoutExplicitCostAuthorization() {
        WorkBuddyClient client = mock(WorkBuddyClient.class);
        WorkBuddyRunService runService = mock(WorkBuddyRunService.class);
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        WorkBuddyGenerationJobExecutor executor = new WorkBuddyGenerationJobExecutor(
                properties(), client, runService, worker, new ObjectMapper());
        GenerationJob unconfirmed = GenerationJob.queued(
                "user-001", "conversation-001", "project-001", "idea-001", "media",
                GenerationProvider.WORKBUDDY, ArtifactType.VIDEO,
                "{\"businessPrompt\":\"render this video\"}",
                "legacy-unconfirmed-job");
        unconfirmed.start("test-worker");

        assertThatThrownBy(() -> executor.execute(unconfirmed))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not explicitly confirmed");
        verify(client, never()).submit(anyString(), any());
    }

    @Test
    void stopsProviderQueriesAsSoonAsTheVideoFileExists() throws Exception {
        WorkBuddyClient client = mock(WorkBuddyClient.class);
        WorkBuddyRunService runService = mock(WorkBuddyRunService.class);
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        WorkBuddyGenerationJobExecutor executor = new WorkBuddyGenerationJobExecutor(
                properties(), client, runService, worker, new ObjectMapper());
        GenerationJob job = runningVideoJob();
        Path completedVideo = tempDir.resolve("result.mp4");
        Files.write(completedVideo, new byte[2_048]);
        WorkBuddyRunService.PreparedRun prepared = new WorkBuddyRunService.PreparedRun(
                "user/job", "user/job/result.mp4", "isolated prompt");

        when(runService.prepare(job.getUserId(), "render this video")).thenReturn(prepared);
        when(client.submit(anyString(), any())).thenReturn(new WorkBuddyClient.RunSubmission("run-001"));
        when(runService.findCompletedResult("run-001", job.getUserId()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(completedVideo));
        when(client.getRun("run-001")).thenReturn(new WorkBuddyClient.RunStatus(
                "run-001", new ObjectMapper().createObjectNode().put("status", "running")));

        GenerationJobExecutor.ExecutionResult result = executor.execute(job);

        assertThat(result.outputPath()).isEqualTo("user/job/result.mp4");
        verify(client, times(1)).submit(anyString(), any());
        verify(client, times(1)).getRun("run-001");
        verify(client, never()).cancel(anyString());
    }

    @Test
    void neverQueriesProviderStatusWhenVideoAlreadyExistsAfterSubmit() throws Exception {
        WorkBuddyClient client = mock(WorkBuddyClient.class);
        WorkBuddyRunService runService = mock(WorkBuddyRunService.class);
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        WorkBuddyGenerationJobExecutor executor = new WorkBuddyGenerationJobExecutor(
                properties(), client, runService, worker, new ObjectMapper());
        GenerationJob job = runningVideoJob();
        Path completedVideo = tempDir.resolve("immediate.mp4");
        Files.write(completedVideo, new byte[2_048]);
        WorkBuddyRunService.PreparedRun prepared = new WorkBuddyRunService.PreparedRun(
                "user/job", "user/job/result.mp4", "isolated prompt");

        when(runService.prepare(job.getUserId(), "render this video")).thenReturn(prepared);
        when(client.submit(anyString(), any())).thenReturn(new WorkBuddyClient.RunSubmission("run-002"));
        when(runService.findCompletedResult("run-002", job.getUserId()))
                .thenReturn(Optional.of(completedVideo));

        executor.execute(job);

        verify(client, times(1)).submit(anyString(), any());
        verify(client, never()).getRun(anyString());
        verify(client, never()).cancel(anyString());
    }

    private WorkBuddyProperties properties() {
        return new WorkBuddyProperties(true, URI.create("http://workbuddy.test"), tempDir, 1, 1, 5_000);
    }

    private static GenerationJob runningVideoJob() {
        GenerationJob job = GenerationJob.queued(
                "user-001", "conversation-001", "project-001", "idea-001", "media",
                GenerationProvider.WORKBUDDY, ArtifactType.VIDEO,
                "{\"businessPrompt\":\"render this video\"}",
                "workbuddy-video:asset-001:v1",
                true);
        job.start("test-worker");
        return job;
    }
}
