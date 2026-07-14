package com.sufe.ai.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_account")
public class UserAccount {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(length = 190, nullable = false, unique = true)
    private String account;

    @Column(name = "password_hash", length = 100, nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private UserRole role;

    @Column(name = "display_name", length = 100, nullable = false)
    private String displayName;

    @Column(length = 150, nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(length = 32, nullable = false)
    private UserStatus status;

    @Column(name = "quota_remaining", nullable = false)
    private int quotaRemaining;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserAccount() {
    }

    private UserAccount(
            String id,
            String account,
            String passwordHash,
            UserRole role,
            String displayName,
            String title,
            int quotaRemaining
    ) {
        Instant now = Instant.now();
        this.id = requireText(id, "id");
        this.account = normalizeAccount(account);
        this.passwordHash = requireText(passwordHash, "passwordHash");
        this.role = Objects.requireNonNull(role, "role 不能为空");
        this.displayName = normalizeDisplayName(displayName);
        this.title = requireText(title, "title");
        if (quotaRemaining < 0) {
            throw new IllegalArgumentException("quotaRemaining 不能小于 0");
        }
        this.quotaRemaining = quotaRemaining;
        this.status = UserStatus.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static UserAccount create(
            String id,
            String account,
            String passwordHash,
            UserRole role,
            String displayName,
            String title,
            int quotaRemaining
    ) {
        return new UserAccount(id, account, passwordHash, role, displayName, title, quotaRemaining);
    }

    public static UserAccount register(
            String account,
            String passwordHash,
            UserRole role,
            String displayName,
            String title,
            int quotaRemaining
    ) {
        return create(UUID.randomUUID().toString(), account, passwordHash, role, displayName, title, quotaRemaining);
    }

    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }

    public void updateDisplayName(String displayName) {
        this.displayName = normalizeDisplayName(displayName);
        this.updatedAt = Instant.now();
    }

    public void updateAdminProfile(UserRole role, String displayName, String title, int quotaRemaining, UserStatus status) {
        this.role = Objects.requireNonNull(role, "role 不能为空");
        this.displayName = normalizeDisplayName(displayName);
        this.title = requireText(title, "title");
        if (quotaRemaining < 0) {
            throw new IllegalArgumentException("quotaRemaining 不能小于 0");
        }
        this.quotaRemaining = quotaRemaining;
        this.status = Objects.requireNonNull(status, "status 不能为空");
        this.updatedAt = Instant.now();
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = requireText(passwordHash, "passwordHash");
        this.updatedAt = Instant.now();
    }

    private static String normalizeAccount(String value) {
        return requireText(value, "account").toLowerCase(Locale.ROOT);
    }

    private static String normalizeDisplayName(String value) {
        String displayName = requireText(value, "displayName");
        if (displayName.length() > 100) {
            throw new IllegalArgumentException("displayName 不能超过 100 个字符");
        }
        return displayName;
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

    public String getAccount() {
        return account;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserRole getRole() {
        return role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getTitle() {
        return title;
    }

    public UserStatus getStatus() {
        return status;
    }

    public int getQuotaRemaining() {
        return quotaRemaining;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
