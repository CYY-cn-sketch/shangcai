package com.sufe.ai.generation.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.service.GenerationJobService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;

@RestController
@RequestMapping("/api/generation/jobs")
public class GenerationJobController {

    private final GenerationJobService generationJobService;

    public GenerationJobController(GenerationJobService generationJobService) {
        this.generationJobService = generationJobService;
    }

    @PostMapping
    public ResponseEntity<GenerationJobResponse> submit(
            Authentication authentication,
            @Valid @RequestBody SubmitGenerationJobRequest request
    ) {
        GenerationJobService.SubmissionResult result = generationJobService.submit(
                authentication.getName(),
                new GenerationJobService.SubmitCommand(
                        request.artifactType(),
                        request.projectId(),
                        request.conversationId(),
                        request.ideaId(),
                        request.expertId(),
                        request.contextSnapshot().toString(),
                        request.idempotencyKey()
                )
        );
        GenerationJobResponse response = GenerationJobResponse.from(result.job());
        if (!result.created()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.accepted()
                .location(URI.create("/api/generation/jobs/" + result.job().getId()))
                .body(response);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<?> get(Authentication authentication, @PathVariable String jobId) {
        GenerationJob job = generationJobService.findOwnedJob(authentication.getName(), jobId).orElse(null);
        if (job == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("GENERATION_JOB_NOT_FOUND", "生成任务不存在"));
        }
        return ResponseEntity.ok(GenerationJobResponse.from(job));
    }

    public record SubmitGenerationJobRequest(
            @NotNull ArtifactType artifactType,
            @NotBlank @Size(max = 64) String projectId,
            @NotBlank @Size(max = 64) String conversationId,
            @Size(max = 64) String ideaId,
            @NotBlank @Size(max = 64) String expertId,
            @NotNull JsonNode contextSnapshot,
            @NotBlank @Size(max = 128) String idempotencyKey
    ) {
        @AssertTrue(message = "contextSnapshot 不能为空")
        public boolean isContextSnapshotPresent() {
            return contextSnapshot != null && !contextSnapshot.isNull() && !contextSnapshot.isMissingNode();
        }

        @AssertTrue(message = "contextSnapshot 不能超过 15000 个字符")
        public boolean isContextSnapshotSizeValid() {
            return contextSnapshot == null || contextSnapshot.toString().length() <= 15_000;
        }

        @AssertTrue(message = "当前仅支持 PPT 和 VIDEO 生成")
        public boolean isArtifactTypeSupported() {
            return artifactType == null || artifactType == ArtifactType.PPT || artifactType == ArtifactType.VIDEO;
        }
    }

    public record GenerationJobResponse(
            String id,
            GenerationProvider provider,
            ArtifactType artifactType,
            String projectId,
            String conversationId,
            String ideaId,
            String expertId,
            String idempotencyKey,
            GenerationJobStatus status,
            String artifactUrl,
            Instant createdAt,
            Instant updatedAt,
            Instant startedAt,
            Instant completedAt
    ) {
        private static GenerationJobResponse from(GenerationJob job) {
            return new GenerationJobResponse(
                    job.getId(),
                    job.getProvider(),
                    job.getArtifactType(),
                    job.getProjectId(),
                    job.getConversationId(),
                    job.getIdeaId(),
                    job.getExpertId(),
                    job.getIdempotencyKey(),
                    job.getStatus(),
                    job.getStatus() == GenerationJobStatus.SUCCEEDED && job.getOutputPath() != null
                            ? "/api/generation/jobs/" + job.getId() + "/artifact"
                            : null,
                    job.getCreatedAt(),
                    job.getUpdatedAt(),
                    job.getStartedAt(),
                    job.getCompletedAt()
            );
        }
    }

    public record ErrorResponse(String code, String message) {
    }
}
