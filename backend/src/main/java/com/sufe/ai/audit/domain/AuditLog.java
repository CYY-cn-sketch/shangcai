package com.sufe.ai.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "actor_user_id", length = 36, nullable = false, updatable = false)
    private String actorUserId;

    @Column(name = "actor_account", length = 190, nullable = false, updatable = false)
    private String actorAccount;

    @Column(name = "actor_display_name", length = 100, nullable = false, updatable = false)
    private String actorDisplayName;

    @Column(name = "actor_role", length = 32, nullable = false, updatable = false)
    private String actorRole;

    @Column(length = 64, nullable = false, updatable = false)
    private String action;

    @Column(name = "resource_type", length = 64, nullable = false, updatable = false)
    private String resourceType;

    @Column(name = "resource_id", length = 64, nullable = false, updatable = false)
    private String resourceId;

    @Column(length = 500, nullable = false, updatable = false)
    private String summary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditLog() {
    }

    private AuditLog(
            String actorUserId,
            String actorAccount,
            String actorDisplayName,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String summary
    ) {
        this.id = UUID.randomUUID().toString();
        this.actorUserId = requireText(actorUserId, "actorUserId");
        this.actorAccount = requireText(actorAccount, "actorAccount");
        this.actorDisplayName = requireText(actorDisplayName, "actorDisplayName");
        this.actorRole = requireText(actorRole, "actorRole");
        this.action = requireText(action, "action");
        this.resourceType = requireText(resourceType, "resourceType");
        this.resourceId = requireText(resourceId, "resourceId");
        this.summary = requireText(summary, "summary");
        this.createdAt = Instant.now();
    }

    public static AuditLog create(
            String actorUserId,
            String actorAccount,
            String actorDisplayName,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String summary
    ) {
        return new AuditLog(actorUserId, actorAccount, actorDisplayName, actorRole, action, resourceType, resourceId, summary);
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

    public String getActorAccount() {
        return actorAccount;
    }

    public String getActorDisplayName() {
        return actorDisplayName;
    }

    public String getActorRole() {
        return actorRole;
    }

    public String getAction() {
        return action;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
