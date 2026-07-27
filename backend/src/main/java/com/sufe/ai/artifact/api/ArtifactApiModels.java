package com.sufe.ai.artifact.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.service.ArtifactService;

import java.time.Instant;

public final class ArtifactApiModels {

    private ArtifactApiModels() {
    }

    public record ArtifactResponse(
            String id,
            String ideaId,
            String sourceMessageId,
            String artifactType,
            String title,
            String summary,
            JsonNode content,
            boolean fileAvailable,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static ArtifactResponse from(ArtifactRecord artifact, ObjectMapper objectMapper) {
            return new ArtifactResponse(
                    artifact.getId(),
                    artifact.getIdeaId(),
                    artifact.getSourceMessageId(),
                    artifact.getArtifactType(),
                    artifact.getTitle(),
                    artifact.getSummary(),
                    readJson(objectMapper, artifact.getContentJson()),
                    artifact.getFilePath() != null,
                    artifact.getCreatedAt(),
                    artifact.getUpdatedAt()
            );
        }
    }

    public record SubmissionResponse(
            String id,
            String artifactId,
            String ideaId,
            String sourceMessageId,
            String student,
            String group,
            String groupName,
            String artifactType,
            String artifactTitle,
            String artifactSummary,
            JsonNode content,
            SubmissionStatus status,
            String teacherComment,
            JsonNode aiDiagnosis,
            boolean excellent,
            Instant submittedAt,
            Instant reviewedAt,
            Instant updatedAt
    ) {
        public static SubmissionResponse from(ArtifactService.SubmissionView view, ObjectMapper objectMapper) {
            ArtifactSubmission submission = view.submission();
            ArtifactRecord artifact = view.artifact();
            return new SubmissionResponse(
                    submission.getId(),
                    artifact.getId(),
                    artifact.getIdeaId(),
                    artifact.getSourceMessageId(),
                    submission.getStudentName(),
                    submission.getGroupLabel(),
                    submission.getGroupName(),
                    artifact.getArtifactType(),
                    artifact.getTitle(),
                    artifact.getSummary(),
                    readJson(objectMapper, artifact.getContentJson()),
                    submission.getStatus(),
                    submission.getTeacherComment(),
                    submission.getAiDiagnosisJson() == null ? null : readJson(objectMapper, submission.getAiDiagnosisJson()),
                    submission.isExcellent(),
                    submission.getSubmittedAt(),
                    submission.getReviewedAt(),
                    submission.getUpdatedAt()
            );
        }
    }

    private static JsonNode readJson(ObjectMapper objectMapper, String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据库中的成果 JSON 无法解析", exception);
        }
    }
}
