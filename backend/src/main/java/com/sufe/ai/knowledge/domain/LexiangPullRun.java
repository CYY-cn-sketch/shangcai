package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lexiang_pull_run")
public class LexiangPullRun {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private LexiangPullRunStatus status;

    @Column(name = "triggered_by", length = 100, nullable = false)
    private String triggeredBy;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "seen_count", nullable = false)
    private int seenCount;

    @Column(name = "added_count", nullable = false)
    private int addedCount;

    @Column(name = "updated_count", nullable = false)
    private int updatedCount;

    @Column(name = "missing_count", nullable = false)
    private int missingCount;

    @Column(name = "conflict_count", nullable = false)
    private int conflictCount;

    @Column(name = "failed_count", nullable = false)
    private int failedCount;

    @Column(length = 500)
    private String message;

    protected LexiangPullRun() {
    }

    private LexiangPullRun(String triggeredBy) {
        this.id = UUID.randomUUID().toString();
        this.status = LexiangPullRunStatus.RUNNING;
        this.triggeredBy = requireText(triggeredBy);
        this.startedAt = Instant.now();
        this.message = "乐享课程知识回拉执行中";
    }

    public static LexiangPullRun start(String triggeredBy) {
        return new LexiangPullRun(triggeredBy);
    }

    public void complete(
            LexiangPullRunStatus status,
            int seenCount,
            int addedCount,
            int updatedCount,
            int missingCount,
            int conflictCount,
            int failedCount,
            String message
    ) {
        if (status == null || status == LexiangPullRunStatus.RUNNING) {
            throw new IllegalArgumentException("完成状态无效");
        }
        this.status = status;
        this.seenCount = nonNegative(seenCount);
        this.addedCount = nonNegative(addedCount);
        this.updatedCount = nonNegative(updatedCount);
        this.missingCount = nonNegative(missingCount);
        this.conflictCount = nonNegative(conflictCount);
        this.failedCount = nonNegative(failedCount);
        this.message = normalizeMessage(message);
        this.completedAt = Instant.now();
    }

    private static String requireText(String value) {
        if (value == null || value.isBlank()) return "system";
        return value.trim().length() <= 100 ? value.trim() : value.trim().substring(0, 100);
    }

    private static int nonNegative(int value) {
        if (value < 0) throw new IllegalArgumentException("同步计数不能小于 0");
        return value;
    }

    private static String normalizeMessage(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }

    public String getId() { return id; }
    public LexiangPullRunStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public int getSeenCount() { return seenCount; }
    public int getAddedCount() { return addedCount; }
    public int getUpdatedCount() { return updatedCount; }
    public int getMissingCount() { return missingCount; }
    public int getConflictCount() { return conflictCount; }
    public int getFailedCount() { return failedCount; }
    public String getMessage() { return message; }
}
