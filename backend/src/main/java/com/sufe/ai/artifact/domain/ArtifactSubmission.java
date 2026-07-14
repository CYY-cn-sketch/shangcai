package com.sufe.ai.artifact.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "artifact_submission")
public class ArtifactSubmission {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "artifact_id", length = 36, nullable = false, updatable = false)
    private String artifactId;

    @Column(name = "student_user_id", length = 36, nullable = false, updatable = false)
    private String studentUserId;

    @Column(name = "student_name", length = 100, nullable = false)
    private String studentName;

    @Column(name = "group_label", length = 50, nullable = false)
    private String groupLabel;

    @Column(name = "group_name", length = 150, nullable = false)
    private String groupName;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private SubmissionStatus status;

    @Column(name = "teacher_comment", columnDefinition = "TEXT")
    private String teacherComment;

    @Column(name = "reviewer_user_id", length = 36)
    private String reviewerUserId;

    @Column(name = "is_excellent", nullable = false)
    private boolean excellent;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ArtifactSubmission() {
    }

    private ArtifactSubmission(
            String artifactId,
            String studentUserId,
            String studentName,
            String groupLabel,
            String groupName
    ) {
        this.id = UUID.randomUUID().toString();
        this.artifactId = requireText(artifactId, "artifactId");
        this.studentUserId = requireText(studentUserId, "studentUserId");
        this.studentName = requireText(studentName, "studentName");
        this.groupLabel = requireText(groupLabel, "groupLabel");
        this.groupName = requireText(groupName, "groupName");
        resubmit(studentName, groupLabel, groupName);
        this.excellent = false;
    }

    public static ArtifactSubmission create(
            String artifactId,
            String studentUserId,
            String studentName,
            String groupLabel,
            String groupName
    ) {
        return new ArtifactSubmission(artifactId, studentUserId, studentName, groupLabel, groupName);
    }

    public void resubmit(String studentName, String groupLabel, String groupName) {
        Instant now = Instant.now();
        this.studentName = requireText(studentName, "studentName");
        this.groupLabel = requireText(groupLabel, "groupLabel");
        this.groupName = requireText(groupName, "groupName");
        this.status = SubmissionStatus.PENDING;
        this.teacherComment = null;
        this.reviewerUserId = null;
        this.submittedAt = now;
        this.reviewedAt = null;
        this.updatedAt = now;
    }

    public void review(SubmissionStatus status, String teacherComment, String reviewerUserId, Boolean excellent) {
        if (status == SubmissionStatus.WITHDRAWN) {
            throw new IllegalArgumentException("教师不能将成果标记为已撤回");
        }
        if (status != null) this.status = status;
        if (teacherComment != null) this.teacherComment = normalizeOptional(teacherComment);
        if (excellent != null) this.excellent = excellent;
        this.reviewerUserId = requireText(reviewerUserId, "reviewerUserId");
        this.reviewedAt = Instant.now();
        this.updatedAt = this.reviewedAt;
    }

    public void withdraw() {
        this.status = SubmissionStatus.WITHDRAWN;
        this.teacherComment = "学生已撤回本次提交。";
        this.reviewedAt = Instant.now();
        this.updatedAt = this.reviewedAt;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getArtifactId() { return artifactId; }
    public String getStudentUserId() { return studentUserId; }
    public String getStudentName() { return studentName; }
    public String getGroupLabel() { return groupLabel; }
    public String getGroupName() { return groupName; }
    public SubmissionStatus getStatus() { return status; }
    public String getTeacherComment() { return teacherComment; }
    public String getReviewerUserId() { return reviewerUserId; }
    public boolean isExcellent() { return excellent; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
