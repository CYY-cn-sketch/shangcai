package com.sufe.ai.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "expert_profile")
public class ExpertProfile {

    @Id
    @Column(length = 64, nullable = false, updatable = false)
    private String id;

    @Column(length = 100, nullable = false, unique = true)
    private String name;

    @Column(name = "role_description", length = 500, nullable = false)
    private String roleDescription;

    @Column(length = 300, nullable = false)
    private String scenario;

    @Column(length = 32, nullable = false)
    private String accent;

    @Column(name = "source_skill_name", length = 200)
    private String sourceSkillName;

    @Column(name = "source_skill_content", columnDefinition = "TEXT")
    private String sourceSkillContent;

    @Column(name = "source_skill_uploaded_by", length = 100)
    private String sourceSkillUploadedBy;

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(name = "user_prompt", columnDefinition = "TEXT")
    private String userPrompt;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ExpertProfile() {
    }

    private ExpertProfile(String id, String name, String roleDescription, String scenario, String accent) {
        Instant now = Instant.now();
        this.id = KnowledgeBase.requireText(id, "id");
        this.name = KnowledgeBase.requireText(name, "name");
        this.roleDescription = KnowledgeBase.requireText(roleDescription, "roleDescription");
        this.scenario = KnowledgeBase.requireText(scenario, "scenario");
        this.accent = KnowledgeBase.requireText(accent, "accent");
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ExpertProfile create(String id, String name, String roleDescription, String scenario, String accent) {
        return new ExpertProfile(id, name, roleDescription, scenario, accent);
    }

    public void update(
            String name,
            String roleDescription,
            String scenario,
            String accent,
            String sourceSkillName,
            String sourceSkillContent,
            String sourceSkillUploadedBy,
            String systemPrompt,
            String userPrompt,
            boolean active
    ) {
        this.name = KnowledgeBase.requireText(name, "name");
        this.roleDescription = KnowledgeBase.requireText(roleDescription, "roleDescription");
        this.scenario = KnowledgeBase.requireText(scenario, "scenario");
        this.accent = KnowledgeBase.requireText(accent, "accent");
        this.sourceSkillName = normalizeOptional(sourceSkillName);
        this.sourceSkillContent = normalizeOptional(sourceSkillContent);
        this.sourceSkillUploadedBy = normalizeOptional(sourceSkillUploadedBy);
        this.systemPrompt = normalizeOptional(systemPrompt);
        this.userPrompt = normalizeOptional(userPrompt);
        this.active = active;
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getRoleDescription() {
        return roleDescription;
    }

    public String getScenario() {
        return scenario;
    }

    public String getAccent() {
        return accent;
    }

    public String getSourceSkillName() {
        return sourceSkillName;
    }

    public String getSourceSkillContent() {
        return sourceSkillContent;
    }

    public String getSourceSkillUploadedBy() {
        return sourceSkillUploadedBy;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public String getUserPrompt() {
        return userPrompt;
    }

    public boolean isActive() {
        return active;
    }
}
