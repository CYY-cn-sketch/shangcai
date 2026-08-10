package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "lexiang_pull_lock")
public class LexiangPullLock {

    @Id
    @Column(name = "lock_key", length = 64, nullable = false, updatable = false)
    private String lockKey;

    @Column(name = "owner_id", length = 64, nullable = false, updatable = false)
    private String ownerId;

    @Column(name = "locked_at", nullable = false, updatable = false)
    private Instant lockedAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    protected LexiangPullLock() {
    }

    private LexiangPullLock(String lockKey, String ownerId, Instant lockedAt, Instant expiresAt) {
        this.lockKey = lockKey;
        this.ownerId = ownerId;
        this.lockedAt = lockedAt;
        this.expiresAt = expiresAt;
    }

    public static LexiangPullLock acquire(String lockKey, String ownerId, Instant now, Instant expiresAt) {
        if (lockKey == null || !lockKey.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("乐享回拉锁名称无效");
        }
        if (ownerId == null || !ownerId.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("乐享回拉锁持有者无效");
        }
        if (now == null || expiresAt == null || !expiresAt.isAfter(now)) {
            throw new IllegalArgumentException("乐享回拉锁有效期无效");
        }
        return new LexiangPullLock(lockKey, ownerId, now, expiresAt);
    }

    public String getLockKey() { return lockKey; }
    public String getOwnerId() { return ownerId; }
    public Instant getExpiresAt() { return expiresAt; }
}
