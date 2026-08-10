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
@Table(name = "expert_skill_upload")
public class ExpertSkillUploadRecord {

    @Id
    @Column(length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "uploaded_by", length = 100, nullable = false, updatable = false)
    private String uploadedBy;

    @Column(name = "folder_name", length = 200, nullable = false, updatable = false)
    private String folderName;

    @Column(name = "main_file_path", length = 512, nullable = false, updatable = false)
    private String mainFilePath;

    @Column(name = "file_count", nullable = false, updatable = false)
    private int fileCount;

    @Column(name = "source_content", columnDefinition = "MEDIUMTEXT", nullable = false, updatable = false)
    private String sourceContent;

    @Column(name = "parsed_name", length = 100, nullable = false, updatable = false)
    private String parsedName;

    @Column(name = "parsed_role", length = 500, nullable = false, updatable = false)
    private String parsedRole;

    @Column(name = "parsed_scenario", length = 300, nullable = false, updatable = false)
    private String parsedScenario;

    @Column(name = "parsed_accent", length = 32, nullable = false, updatable = false)
    private String parsedAccent;

    @Column(name = "parsed_system_prompt", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String parsedSystemPrompt;

    @Column(name = "parsed_user_prompt", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String parsedUserPrompt;

    @Column(name = "parsed_skill_name", length = 100, updatable = false)
    private String parsedSkillName;

    @Column(name = "parsed_skill_description", length = 500, updatable = false)
    private String parsedSkillDescription;

    @Column(name = "parsed_knowledge_rule", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String parsedKnowledgeRule;

    @Column(name = "parsed_output_format", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String parsedOutputFormat;

    @Column(name = "parsed_boundaries", columnDefinition = "MEDIUMTEXT", updatable = false)
    private String parsedBoundaries;

    @Enumerated(EnumType.STRING)
    @Column(length = 16, nullable = false)
    private ExpertSkillUploadStatus status;

    @Column(name = "expert_id", length = 64)
    private String expertId;

    @Column(name = "confirmed_by", length = 100)
    private String confirmedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected ExpertSkillUploadRecord() {
    }

    public static ExpertSkillUploadRecord parsed(String uploadedBy, ParsedSkill parsed) {
        ExpertSkillUploadRecord record = new ExpertSkillUploadRecord();
        record.id = UUID.randomUUID().toString();
        record.uploadedBy = requireText(uploadedBy, "uploadedBy");
        record.folderName = requireText(parsed.folderName(), "folderName");
        record.mainFilePath = requireText(parsed.mainFilePath(), "mainFilePath");
        record.fileCount = parsed.fileCount();
        record.sourceContent = requireText(parsed.sourceContent(), "sourceContent");
        record.parsedName = requireText(parsed.name(), "name");
        record.parsedRole = requireText(parsed.role(), "role");
        record.parsedScenario = requireText(parsed.scenario(), "scenario");
        record.parsedAccent = requireText(parsed.accent(), "accent");
        record.parsedSystemPrompt = normalizeOptional(parsed.systemPrompt());
        record.parsedUserPrompt = normalizeOptional(parsed.userPrompt());
        record.parsedSkillName = normalizeOptional(parsed.skillName());
        record.parsedSkillDescription = normalizeOptional(parsed.skillDescription());
        record.parsedKnowledgeRule = normalizeOptional(parsed.knowledgeRule());
        record.parsedOutputFormat = normalizeOptional(parsed.outputFormat());
        record.parsedBoundaries = normalizeOptional(parsed.boundaries());
        record.status = ExpertSkillUploadStatus.PARSED;
        record.createdAt = Instant.now();
        return record;
    }

    public void enable(String expertId, String confirmedBy) {
        if (status != ExpertSkillUploadStatus.PARSED) {
            throw new IllegalStateException("Skill 上传记录已经确认");
        }
        this.expertId = requireText(expertId, "expertId");
        this.confirmedBy = requireText(confirmedBy, "confirmedBy");
        this.status = ExpertSkillUploadStatus.ENABLED;
        this.confirmedAt = Instant.now();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " 不能为空");
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getId() { return id; }
    public String getUploadedBy() { return uploadedBy; }
    public String getFolderName() { return folderName; }
    public String getMainFilePath() { return mainFilePath; }
    public int getFileCount() { return fileCount; }
    public String getSourceContent() { return sourceContent; }
    public String getParsedName() { return parsedName; }
    public String getParsedRole() { return parsedRole; }
    public String getParsedScenario() { return parsedScenario; }
    public String getParsedAccent() { return parsedAccent; }
    public String getParsedSystemPrompt() { return parsedSystemPrompt; }
    public String getParsedUserPrompt() { return parsedUserPrompt; }
    public String getParsedSkillName() { return parsedSkillName; }
    public String getParsedSkillDescription() { return parsedSkillDescription; }
    public String getParsedKnowledgeRule() { return parsedKnowledgeRule; }
    public String getParsedOutputFormat() { return parsedOutputFormat; }
    public String getParsedBoundaries() { return parsedBoundaries; }
    public ExpertSkillUploadStatus getStatus() { return status; }
    public String getExpertId() { return expertId; }
    public String getConfirmedBy() { return confirmedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getConfirmedAt() { return confirmedAt; }

    public record ParsedSkill(
            String folderName,
            String mainFilePath,
            int fileCount,
            String sourceContent,
            String name,
            String role,
            String scenario,
            String accent,
            String systemPrompt,
            String userPrompt,
            String skillName,
            String skillDescription,
            String knowledgeRule,
            String outputFormat,
            String boundaries
    ) {
    }
}
