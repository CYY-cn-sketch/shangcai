package com.sufe.ai.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_group")
public class ProjectGroup {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "group_label", length = 50, nullable = false)
    private String groupLabel;

    @Column(name = "project_name", length = 150, nullable = false)
    private String projectName;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ProjectGroup() {
    }

    private ProjectGroup(String id, String groupLabel, String projectName) {
        Instant now = Instant.now();
        this.id = requireText(id, "id");
        this.groupLabel = requireText(groupLabel, "groupLabel");
        this.projectName = requireText(projectName, "projectName");
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ProjectGroup create(String id, String groupLabel, String projectName) {
        return new ProjectGroup(id, groupLabel, projectName);
    }

    public static ProjectGroup create(String groupLabel, String projectName) {
        return create(UUID.randomUUID().toString(), groupLabel, projectName);
    }

    public void updateDetails(String groupLabel, String projectName, boolean active) {
        this.groupLabel = requireText(groupLabel, "groupLabel");
        this.projectName = requireText(projectName, "projectName");
        this.active = active;
        this.updatedAt = Instant.now();
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

    public String getGroupLabel() {
        return groupLabel;
    }

    public String getProjectName() {
        return projectName;
    }

    public boolean isActive() {
        return active;
    }
}
