package com.sufe.ai.artifact.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.artifact.service.ArtifactService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/student")
public class StudentArtifactController {

    private final ArtifactService artifactService;
    private final ObjectMapper objectMapper;

    public StudentArtifactController(ArtifactService artifactService, ObjectMapper objectMapper) {
        this.artifactService = artifactService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/artifacts")
    public List<ArtifactApiModels.ArtifactResponse> listArtifacts(Authentication authentication) {
        return artifactService.listOwnedArtifacts(authentication.getName()).stream()
                .map(artifact -> ArtifactApiModels.ArtifactResponse.from(artifact, objectMapper))
                .toList();
    }

    @PostMapping("/artifacts")
    public ResponseEntity<ArtifactApiModels.ArtifactResponse> saveArtifact(
            Authentication authentication,
            @Valid @RequestBody SaveArtifactRequest request
    ) {
        var artifact = artifactService.saveArtifact(
                authentication.getName(),
                new ArtifactService.SaveArtifactCommand(
                        request.ideaId(),
                        request.sourceMessageId(),
                        request.artifactType(),
                        request.title(),
                        request.summary(),
                        request.content().toString()
                )
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/student/artifacts/" + artifact.getId()))
                .body(ArtifactApiModels.ArtifactResponse.from(artifact, objectMapper));
    }

    @PostMapping("/artifacts/{artifactId}/submit")
    public ArtifactApiModels.SubmissionResponse submitArtifact(
            Authentication authentication,
            @PathVariable String artifactId
    ) {
        return ArtifactApiModels.SubmissionResponse.from(
                artifactService.submitArtifact(authentication.getName(), artifactId),
                objectMapper
        );
    }

    @PostMapping("/artifacts/{artifactId}/download-events")
    public ResponseEntity<Void> recordClientDownload(
            Authentication authentication,
            @PathVariable String artifactId
    ) {
        artifactService.recordClientDownload(authentication.getName(), artifactId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/submissions")
    public List<ArtifactApiModels.SubmissionResponse> listSubmissions(Authentication authentication) {
        return artifactService.listStudentSubmissions(authentication.getName()).stream()
                .map(view -> ArtifactApiModels.SubmissionResponse.from(view, objectMapper))
                .toList();
    }

    @PatchMapping("/submissions/{submissionId}/withdraw")
    public ArtifactApiModels.SubmissionResponse withdrawSubmission(
            Authentication authentication,
            @PathVariable String submissionId
    ) {
        return ArtifactApiModels.SubmissionResponse.from(
                artifactService.withdrawSubmission(authentication.getName(), submissionId),
                objectMapper
        );
    }

    @DeleteMapping("/submissions/{submissionId}")
    public ResponseEntity<Void> deleteSubmission(
            Authentication authentication,
            @PathVariable String submissionId
    ) {
        artifactService.deleteWithdrawnSubmission(authentication.getName(), submissionId);
        return ResponseEntity.noContent().build();
    }

    public record SaveArtifactRequest(
            @NotBlank @Size(max = 36) String ideaId,
            @Size(max = 64) String sourceMessageId,
            @NotBlank @Pattern(regexp = "BRAINSTORM|POSITIONING|MARKET|BP|PPT|SCRIPT|DEFENSE|MEDIA") String artifactType,
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 10_000) String summary,
            @NotNull JsonNode content
    ) {
        @AssertTrue(message = "content 不能超过 30000 个字符")
        public boolean isContentSizeValid() {
            return content == null || content.toString().length() <= 30_000;
        }
    }
}
