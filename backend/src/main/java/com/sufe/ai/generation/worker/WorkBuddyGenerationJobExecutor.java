package com.sufe.ai.generation.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import com.sufe.ai.provider.workbuddy.service.WorkBuddyRunService;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

/**
 * Executes one paid WorkBuddy video run for one persisted platform job.
 * Provider status is queried only while the expected MP4 is absent.
 */
@Component
public class WorkBuddyGenerationJobExecutor implements GenerationJobExecutor {

    private static final long MINIMUM_VIDEO_BYTES = 1_024;

    private final WorkBuddyProperties properties;
    private final WorkBuddyClient client;
    private final WorkBuddyRunService runService;
    private final GenerationJobWorker worker;
    private final ObjectMapper objectMapper;

    public WorkBuddyGenerationJobExecutor(
            WorkBuddyProperties properties,
            WorkBuddyClient client,
            WorkBuddyRunService runService,
            GenerationJobWorker worker,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.client = client;
        this.runService = runService;
        this.worker = worker;
        this.objectMapper = objectMapper;
    }

    @Override
    public GenerationProvider provider() {
        return GenerationProvider.WORKBUDDY;
    }

    @Override
    public ExecutionResult execute(GenerationJob job) throws Exception {
        if (!properties.enabled()) {
            throw new IllegalStateException("WorkBuddy is disabled");
        }
        if (!job.isProviderCostConfirmed()) {
            throw new IllegalStateException("WorkBuddy provider cost was not explicitly confirmed");
        }

        WorkBuddyRunService.PreparedRun prepared = runService.prepare(
                job.getUserId(),
                readBusinessPrompt(job.getInputSnapshot())
        );
        WorkBuddyClient.RunSubmission submission = client.submit(
                prepared.prompt(),
                new WorkBuddyClient.Sender(job.getUserId(), job.getUserId())
        );
        String runId = submission.runId();
        try {
            runService.record(job.getUserId(), runId, prepared);
            worker.recordExternalRunId(job.getId(), runId);
        } catch (RuntimeException exception) {
            cancelQuietly(runId);
            throw exception;
        }

        Instant deadline = Instant.now().plusMillis(properties.runTimeoutMs());
        while (true) {
            Optional<Path> completed = runService.findCompletedResult(runId, job.getUserId())
                    .filter(WorkBuddyGenerationJobExecutor::isValidVideo);
            if (completed.isPresent()) {
                // This return is the hard stop: no provider status request is made after MP4 exists.
                return new ExecutionResult(
                        prepared.outputPath(),
                        runId,
                        submission.verifiedUsage()
                );
            }

            if (!Instant.now().isBefore(deadline)) {
                cancelQuietly(runId);
                throw new IllegalStateException("WorkBuddy video generation timed out after "
                        + Duration.ofMillis(properties.runTimeoutMs()));
            }

            WorkBuddyClient.RunStatus status = client.getRun(runId);
            if (isTerminalFailure(status.data())) {
                throw new IllegalStateException("WorkBuddy video generation failed: "
                        + status.data().path("status").asText("unknown"));
            }

            try {
                Thread.sleep(properties.pollIntervalMs());
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                cancelQuietly(runId);
                throw exception;
            }
        }
    }

    private String readBusinessPrompt(String inputSnapshot) {
        try {
            JsonNode snapshot = objectMapper.readTree(inputSnapshot);
            JsonNode prompt = snapshot == null ? null : snapshot.get("businessPrompt");
            if (prompt == null || !prompt.isTextual() || prompt.textValue().isBlank()) {
                throw new IllegalArgumentException("VIDEO contextSnapshot.businessPrompt is required");
            }
            return prompt.textValue().trim();
        } catch (IOException exception) {
            throw new IllegalArgumentException("VIDEO contextSnapshot is not valid JSON", exception);
        }
    }

    private static boolean isValidVideo(Path path) {
        try {
            return Files.isRegularFile(path) && Files.size(path) > MINIMUM_VIDEO_BYTES;
        } catch (IOException exception) {
            return false;
        }
    }

    private static boolean isTerminalFailure(JsonNode data) {
        String status = data.path("status").asText("").trim().toLowerCase(Locale.ROOT);
        return status.equals("failed")
                || status.equals("error")
                || status.equals("canceled")
                || status.equals("cancelled");
    }

    private void cancelQuietly(String runId) {
        try {
            client.cancel(runId);
        } catch (RuntimeException ignored) {
            // Preserve the original failure. Cancellation is best effort and never retried automatically.
        }
    }
}
