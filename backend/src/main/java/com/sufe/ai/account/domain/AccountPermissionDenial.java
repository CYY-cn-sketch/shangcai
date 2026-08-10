package com.sufe.ai.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account_permission_denial")
public class AccountPermissionDenial {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false)
    private String userId;

    @Column(name = "permission_key", length = 100, nullable = false, updatable = false)
    private String permissionKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AccountPermissionDenial() {
    }

    private AccountPermissionDenial(String id, String userId, String permissionKey) {
        this.id = requireText(id, "id");
        this.userId = requireText(userId, "userId");
        this.permissionKey = requireText(permissionKey, "permissionKey");
        this.createdAt = Instant.now();
    }

    public static AccountPermissionDenial create(String userId, String permissionKey) {
        return new AccountPermissionDenial(UUID.randomUUID().toString(), userId, permissionKey);
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    public String getUserId() {
        return userId;
    }

    public String getPermissionKey() {
        return permissionKey;
    }
}
