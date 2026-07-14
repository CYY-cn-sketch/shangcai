package com.sufe.ai.artifact.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.service.ArtifactService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/submissions")
public class TeacherArtifactController {

    private final ArtifactService artifactService;
    private final ObjectMapper objectMapper;

    public TeacherArtifactController(ArtifactService artifactService, ObjectMapper objectMapper) {
        this.artifactService = artifactService;
        this.objectMapper = objectMapper;
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
