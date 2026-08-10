package com.sufe.ai.generation.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.service.GenerationJobService;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/generation/jobs")
public class GenerationJobController {

    private final GenerationJobService generationJobService;
    private final WorkBuddyProperties workBuddyProperties;

    public GenerationJobController(
            GenerationJobService generationJobService,
            WorkBuddyProperties workBuddyProperties
    ) {
        this.generationJobService = generationJobService;
        this.workBuddyProperties = workBuddyProperties;
    }

    @PostMapping
    public ResponseEntity<?> submit(
            Authentication authentication,
            @Valid @RequestBody SubmitGenerationJobRequest request
    ) {
        if (request.artifactType() == ArtifactType.VIDEO && !workBuddyProperties.enabled()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ErrorResponse(
                            "WORKBUDDY_DISABLED",
                            "WorkBuddy is disabled; no provider request was created"
                    ));
        }
        GenerationJobService.SubmissionResult result = generationJobService.submit(
                authentication.getName(),
                new GenerationJobService.SubmitCommand(
                        request.artifactType(),
                        request.projectId(),
                        request.conversationId(),
                        request.ideaId(),
                        request.expertId(),
                        request.contextSnapshot().toString(),
                        request.idempotencyKey(),
                        request.costConfirmed()
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

    @GetMapping("/{jobId}/artifact")
    public ResponseEntity<?> getArtifact(Authentication authentication, @PathVariable String jobId) {
        GenerationJob job = generationJobService.findOwnedJob(authentication.getName(), jobId).orElse(null);
        if (job == null
                || job.getStatus() != GenerationJobStatus.SUCCEEDED
                || job.getArtifactType() != ArtifactType.VIDEO
                || job.getOutputPath() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("GENERATION_ARTIFACT_NOT_FOUND", "Generated video is not available"));
        }

        Path root = workBuddyProperties.jobsRoot().toAbsolutePath().normalize();
        Path artifact = root.resolve(job.getOutputPath()).normalize();
        if (!artifact.startsWith(root) || !Files.isRegularFile(artifact)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("GENERATION_ARTIFACT_NOT_FOUND", "Generated video is not available"));
        }
        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("video/mp4"))
                    .contentLength(Files.size(artifact))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"result.mp4\"")
                    .body(new FileSystemResource(artifact));
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("GENERATION_ARTIFACT_READ_FAILED", "Generated video could not be read"));
        }
    }

    public record SubmitGenerationJobRequest(
            @NotNull ArtifactType artifactType,
            @NotBlank @Size(max = 64) String projectId,
            @NotBlank @Size(max = 64) String conversationId,
            @Size(max = 64) String ideaId,
            @NotBlank @Size(max = 64) String expertId,
            @NotNull JsonNode contextSnapshot,
            @NotBlank @Size(max = 128) String idempotencyKey,
            boolean costConfirmed
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

        @AssertTrue(message = "VIDEO generation requires explicit cost confirmation")
        public boolean isVideoCostConfirmed() {
            return artifactType == null || artifactType != ArtifactType.VIDEO || costConfirmed;
        }

        @AssertTrue(message = "VIDEO generation is only available to the media expert")
        public boolean isVideoExpertValid() {
            return artifactType == null || artifactType != ArtifactType.VIDEO || "media".equals(expertId);
        }

        @AssertTrue(message = "VIDEO generation requires ideaId")
        public boolean isVideoIdeaPresent() {
            return artifactType == null
                    || artifactType != ArtifactType.VIDEO
                    || (ideaId != null && !ideaId.isBlank());
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
