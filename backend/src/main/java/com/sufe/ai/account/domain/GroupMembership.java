package com.sufe.ai.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "group_membership")
public class GroupMembership {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "group_id", length = 36, nullable = false, updatable = false)
    private String groupId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected GroupMembership() {
    }

    private GroupMembership(String id, String userId, String groupId) {
        this.id = requireText(id, "id");
        this.userId = requireText(userId, "userId");
        this.groupId = requireText(groupId, "groupId");
        this.createdAt = Instant.now();
    }

    public static GroupMembership create(String id, String userId, String groupId) {
        return new GroupMembership(id, userId, groupId);
    }

    public static GroupMembership create(String userId, String groupId) {
        return create(UUID.randomUUID().toString(), userId, groupId);
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

    public String getGroupId() {
        return groupId;
    }
}
