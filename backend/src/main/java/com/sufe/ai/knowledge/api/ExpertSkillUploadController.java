package com.sufe.ai.knowledge.api;

import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkill;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.knowledge.service.ExpertSkillUploadParser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge/expert-skill-uploads")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class ExpertSkillUploadController {

    private final ExpertSkillUploadParser parser;
    private final ExpertSkillUploadRepository uploadRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final AuditLogService auditLogService;

    public ExpertSkillUploadController(
            ExpertSkillUploadParser parser,
            ExpertSkillUploadRepository uploadRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository,
            KnowledgeBaseRepository knowledgeBaseRepository,
            AuditLogService auditLogService
    ) {
        this.parser = parser;
        this.uploadRepository = uploadRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.expertKnowledgeRouteRepository = expertKnowledgeRouteRepository;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<UploadResponse> listUploads() {
        return uploadRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toUploadResponse).toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> upload(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("paths") List<String> paths,
            Authentication authentication
    ) {
        ExpertSkillUploadRecord.ParsedSkill parsed;
        try {
            parsed = parser.parse(files, paths);
        } catch (IllegalArgumentException exception) {
            return badRequest("INVALID_EXPERT_SKILL_UPLOAD", exception.getMessage());
        }
        ExpertSkillUploadRecord record = uploadRepository.saveAndFlush(
                ExpertSkillUploadRecord.parsed(authentication.getName(), parsed)
        );
        auditLogService.record(
                authentication.getName(),
                "EXPERT_SKILL_PARSED",
                "EXPERT_SKILL_UPLOAD",
                record.getId(),
                "解析专家 Skill 文件夹：" + record.getFolderName() + "（未启用）"
        );
        return ResponseEntity.created(URI.create("/api/knowledge/expert-skill-uploads/" + record.getId()))
                .body(toUploadResponse(record));
    }

    @PostMapping("/{uploadId}/confirm")
    @Transactional
    public ResponseEntity<?> confirm(
            @PathVariable String uploadId,
            @Valid @RequestBody ConfirmRequest request,
            Authentication authentication
    ) {
        ExpertSkillUploadRecord upload = uploadRepository.findById(uploadId).orElse(null);
        if (upload == null) return notFound("EXPERT_SKILL_UPLOAD_NOT_FOUND", "Skill 上传记录不存在");
        if (upload.getStatus() == ExpertSkillUploadStatus.ENABLED) {
            ExpertProfile existing = expertProfileRepository.findById(upload.getExpertId()).orElse(null);
            return existing == null
                    ? conflict("EXPERT_SKILL_UPLOAD_INCONSISTENT", "已确认的专家记录不存在")
                    : ResponseEntity.ok(toExpertResponse(existing));
        }
        if (expertProfileRepository.findByName(upload.getParsedName()).isPresent()) {
            return conflict("EXPERT_EXISTS", "解析出的专家名称已存在，请先调整现有专家配置");
        }

        List<String> categories = request.knowledgeCategories().stream()
                .map(String::trim)
                .distinct()
                .toList();
        for (String category : categories) {
            if (knowledgeBaseRepository.findByCategory(category).isEmpty()) {
                return badRequest("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在：" + category);
            }
        }

        String expertId = "skill-" + UUID.randomUUID();
        ExpertProfile expert = ExpertProfile.create(
                expertId,
                upload.getParsedName(),
                upload.getParsedRole(),
                upload.getParsedScenario(),
                upload.getParsedAccent()
        );
        expert.update(
                upload.getParsedName(),
                upload.getParsedRole(),
                upload.getParsedScenario(),
                upload.getParsedAccent(),
                upload.getMainFilePath(),
                upload.getSourceContent(),
                upload.getUploadedBy(),
                upload.getParsedSystemPrompt(),
                upload.getParsedUserPrompt(),
                true
        );
        try {
            expert = expertProfileRepository.saveAndFlush(expert);
        } catch (DataIntegrityViolationException exception) {
            return conflict("EXPERT_EXISTS", "解析出的专家名称已存在，请先调整现有专家配置");
        }
        expertSkillRepository.save(ExpertSkill.create(
                upload.getId() + "-skill",
                expert.getId(),
                upload.getParsedName() + " Skill",
                "已确认上传",
                "来自 " + upload.getMainFilePath() + "；仅按文本配置使用，不执行上传文件。"
        ));
        String confirmedExpertId = expert.getId();
        categories.forEach(category -> expertKnowledgeRouteRepository.save(
                ExpertKnowledgeRoute.create(confirmedExpertId, category)
        ));
        upload.enable(expert.getId(), authentication.getName());
        uploadRepository.save(upload);
        auditLogService.record(
                authentication.getName(),
                "EXPERT_SKILL_ENABLED",
                "EXPERT_PROFILE",
                expert.getId(),
                "确认并启用专家 Skill：" + expert.getName()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toExpertResponse(expert));
    }

    private UploadResponse toUploadResponse(ExpertSkillUploadRecord record) {
        return new UploadResponse(
                record.getId(),
                record.getFolderName(),
                record.getMainFilePath(),
                record.getFileCount(),
                record.getParsedName(),
                record.getParsedRole(),
                record.getParsedScenario(),
                record.getParsedAccent(),
                record.getParsedSystemPrompt(),
                record.getParsedUserPrompt(),
                record.getStatus().name(),
                record.getExpertId(),
                record.getUploadedBy(),
                record.getConfirmedBy(),
                record.getCreatedAt(),
                record.getConfirmedAt()
        );
    }

    private ExpertResponse toExpertResponse(ExpertProfile expert) {
        List<SkillResponse> skills = expertSkillRepository.findByExpertIdOrderByCreatedAtAsc(expert.getId()).stream()
                .map(skill -> new SkillResponse(skill.getId(), skill.getName(), skill.getStage(), skill.getDescription()))
                .toList();
        List<String> categories = expertKnowledgeRouteRepository.findByExpertId(expert.getId()).stream()
                .map(ExpertKnowledgeRoute::getCategory)
                .sorted(Comparator.naturalOrder())
                .toList();
        return new ExpertResponse(
                expert.getId(),
                expert.getName(),
                expert.getRoleDescription(),
                expert.getScenario(),
                expert.getAccent(),
                expert.isActive(),
                expert.getSourceSkillName(),
                expert.getSourceSkillContent(),
                expert.getSourceSkillUploadedBy(),
                expert.getSystemPrompt(),
                expert.getUserPrompt(),
                skills,
                categories
        );
    }

    private static ResponseEntity<ErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> notFound(String code, String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> conflict(String code, String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(code, message));
    }

    public record ConfirmRequest(
            @NotEmpty @Size(max = 20) List<@Size(min = 1, max = 100) String> knowledgeCategories
    ) {
    }

    public record UploadResponse(
            String id,
            String folderName,
            String mainFilePath,
            int fileCount,
            String parsedName,
            String parsedRole,
            String parsedScenario,
            String parsedAccent,
            String parsedSystemPrompt,
            String parsedUserPrompt,
            String status,
            String expertId,
            String uploadedBy,
            String confirmedBy,
            Instant createdAt,
            Instant confirmedAt
    ) {
    }

    public record SkillResponse(String id, String name, String stage, String description) {
    }

    public record ExpertResponse(
            String id,
            String name,
            String role,
            String scenario,
            String accent,
            boolean active,
            String sourceSkillName,
            String sourceSkillContent,
            String sourceSkillUploadedBy,
            String systemPrompt,
            String userPrompt,
            List<SkillResponse> skills,
            List<String> knowledgeCategories
    ) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
