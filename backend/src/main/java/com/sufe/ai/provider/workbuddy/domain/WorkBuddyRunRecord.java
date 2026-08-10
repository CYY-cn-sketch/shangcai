package com.sufe.ai.provider.workbuddy.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workbuddy_run")
public class WorkBuddyRunRecord {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "run_id", length = 128, nullable = false, updatable = false, unique = true)
    private String runId;

    @Column(name = "job_directory", length = 512, nullable = false, updatable = false)
    private String jobDirectory;

    @Column(name = "output_path", length = 512, nullable = false, updatable = false)
    private String outputPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WorkBuddyRunRecord() {
    }

    private WorkBuddyRunRecord(String userId, String runId, String jobDirectory, String outputPath) {
        this.id = UUID.randomUUID().toString();
        this.userId = requireText(userId, "userId");
        this.runId = requireText(runId, "runId");
        this.jobDirectory = requireText(jobDirectory, "jobDirectory");
        this.outputPath = requireText(outputPath, "outputPath");
        this.createdAt = Instant.now();
    }

    public static WorkBuddyRunRecord create(String userId, String runId, String jobDirectory, String outputPath) {
        return new WorkBuddyRunRecord(userId, runId, jobDirectory, outputPath);
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getRunId() {
        return runId;
    }

    public String getJobDirectory() {
        return jobDirectory;
    }

    public String getOutputPath() {
        return outputPath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
