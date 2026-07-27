package com.sufe.ai.artifact.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.service.ArtifactService;
import com.sufe.ai.artifact.service.TeacherAiReviewService;
import com.sufe.ai.provider.deepseek.DeepSeekClientException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/submissions")
public class TeacherArtifactController {

    private final ArtifactService artifactService;
    private final ObjectMapper objectMapper;
    private final TeacherAiReviewService aiReviewService;

    public TeacherArtifactController(
            ArtifactService artifactService,
            ObjectMapper objectMapper,
            TeacherAiReviewService aiReviewService
    ) {
        this.artifactService = artifactService;
        this.objectMapper = objectMapper;
        this.aiReviewService = aiReviewService;
    }

    @PostMapping("/{submissionId}/ai-diagnosis")
    public ResponseEntity<?> diagnoseSubmission(Authentication authentication, @PathVariable String submissionId) {
        try {
            return ResponseEntity.ok(aiReviewService.diagnose(authentication.getName(), submissionId));
        } catch (DeepSeekClientException exception) {
            return ResponseEntity.status(exception.getResponseStatus())
                    .body(new DiagnosisErrorResponse(exception.getErrorCode(), exception.getMessage()));
        }
    }

    public record DiagnosisErrorResponse(String code, String message) {
    }

    @GetMapping
    public List<ArtifactApiModels.SubmissionResponse> listSubmissions() {
        return artifactService.listTeacherSubmissions().stream()
                .map(view -> ArtifactApiModels.SubmissionResponse.from(view, objectMapper))
                .toList();
    }

    @PatchMapping("/{submissionId}")
    public ArtifactApiModels.SubmissionResponse reviewSubmission(
            Authentication authentication,
            @PathVariable String submissionId,
            @Valid @RequestBody ReviewSubmissionRequest request
    ) {
        return ArtifactApiModels.SubmissionResponse.from(
                artifactService.reviewSubmission(
                        authentication.getName(),
                        submissionId,
                        new ArtifactService.ReviewCommand(request.status(), request.teacherComment(), request.excellent())
                ),
                objectMapper
        );
    }

    public record ReviewSubmissionRequest(
            SubmissionStatus status,
            @Size(max = 10_000) String teacherComment,
            Boolean excellent
    ) {
        @AssertTrue(message = "至少提供一个需要修改的审核字段")
        public boolean isAnyFieldPresent() {
            return status != null || teacherComment != null || excellent != null;
        }

        @AssertTrue(message = "教师不能将成果标记为已撤回")
        public boolean isStatusAllowed() {
            return status == null || status != SubmissionStatus.WITHDRAWN;
        }
    }
}
