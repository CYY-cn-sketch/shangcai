package com.sufe.ai.knowledge.api;

import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkill;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping({"/api/admin", "/api/knowledge"})
public class AdminKnowledgeController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeAssetRepository knowledgeAssetRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;

    public AdminKnowledgeController(
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeAssetRepository knowledgeAssetRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository
    ) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.knowledgeAssetRepository = knowledgeAssetRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.expertKnowledgeRouteRepository = expertKnowledgeRouteRepository;
    }

    @GetMapping("/knowledge-bases")
    public List<KnowledgeBaseResponse> listKnowledgeBases() {
        return knowledgeBaseRepository.findAll().stream()
                .sorted(Comparator.comparing(KnowledgeBase::getCategory))
                .map(this::toKnowledgeBaseResponse)
                .toList();
    }

    @PostMapping("/knowledge-bases")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createKnowledgeBase(@Valid @RequestBody KnowledgeBaseRequest request) {
        if (knowledgeBaseRepository.findByCategory(request.category().trim()).isPresent()) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
        try {
            KnowledgeBase base = knowledgeBaseRepository.saveAndFlush(
                    KnowledgeBase.create(request.category(), request.description(), request.usedBy())
            );
            return ResponseEntity.created(URI.create("/api/admin/knowledge-bases/" + base.getId()))
                    .body(toKnowledgeBaseResponse(base));
        } catch (DataIntegrityViolationException exception) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
    }

    @PatchMapping("/knowledge-bases/{baseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updateKnowledgeBase(@PathVariable String baseId, @Valid @RequestBody UpdateKnowledgeBaseRequest request) {
        KnowledgeBase base = knowledgeBaseRepository.findById(baseId).orElse(null);
        if (base == null) {
            return notFound("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (knowledgeBaseRepository.findByCategory(request.category().trim())
                .filter(existing -> !existing.getId().equals(baseId))
                .isPresent()) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
        try {
            base.update(request.category(), request.description(), request.usedBy(), request.active());
            return ResponseEntity.ok(toKnowledgeBaseResponse(knowledgeBaseRepository.saveAndFlush(base)));
        } catch (DataIntegrityViolationException exception) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
    }

    @DeleteMapping("/knowledge-bases/{baseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteKnowledgeBase(@PathVariable String baseId) {
        KnowledgeBase base = knowledgeBaseRepository.findById(baseId).orElse(null);
        if (base == null) {
            return notFound("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (knowledgeAssetRepository.countByKnowledgeBaseId(baseId) > 0) {
            return conflict("KNOWLEDGE_BASE_HAS_ASSETS", "知识库目录已有资料，不能删除");
        }
        expertKnowledgeRouteRepository.deleteByCategory(base.getCategory());
        knowledgeBaseRepository.delete(base);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/knowledge-assets")
    public List<KnowledgeAssetResponse> listKnowledgeAssets(Authentication authentication) {
        boolean includeSensitiveContent = canManageKnowledge(authentication);
        return knowledgeAssetRepository.findAll().stream()
                .sorted(Comparator.comparing(KnowledgeAsset::getName))
                .map(asset -> toKnowledgeAssetResponse(asset, includeSensitiveContent))
                .toList();
    }

    @PostMapping("/knowledge-assets")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createKnowledgeAsset(@Valid @RequestBody KnowledgeAssetRequest request) {
        KnowledgeBase base = knowledgeBaseRepository.findByCategory(request.category().trim()).orElse(null);
        if (base == null) {
            return badRequest("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        KnowledgeAsset asset = KnowledgeAsset.create(
                base.getId(),
                request.name(),
                request.sizeLabel(),
                request.fileType(),
                request.preview(),
                request.contentText(),
                request.uploadedBy()
        );
        asset.setEnabled(request.enabled());
        asset = knowledgeAssetRepository.saveAndFlush(asset);
        return ResponseEntity.created(URI.create("/api/admin/knowledge-assets/" + asset.getId()))
                .body(toKnowledgeAssetResponse(asset, true));
    }

    @PatchMapping("/knowledge-assets/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updateKnowledgeAsset(@PathVariable String assetId, @Valid @RequestBody UpdateKnowledgeAssetRequest request) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        asset.update(
                request.name(),
                request.sizeLabel(),
                request.fileType(),
                request.preview(),
                request.contentText(),
                request.enabled()
        );
        return ResponseEntity.ok(toKnowledgeAssetResponse(knowledgeAssetRepository.saveAndFlush(asset), true));
    }

    @DeleteMapping("/knowledge-assets/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteKnowledgeAsset(@PathVariable String assetId) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        knowledgeAssetRepository.delete(asset);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/experts")
    public List<ExpertResponse> listExperts(Authentication authentication) {
        boolean includeSensitiveContent = canManageKnowledge(authentication);
        return expertProfileRepository.findAll().stream()
                .sorted(Comparator.comparing(ExpertProfile::getName))
                .map(expert -> toExpertResponse(expert, includeSensitiveContent))
                .toList();
    }

    @PostMapping("/experts")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createExpert(@Valid @RequestBody ExpertRequest request) {
        if (expertProfileRepository.existsById(request.id()) || expertProfileRepository.findByName(request.name()).isPresent()) {
            return conflict("EXPERT_EXISTS", "专家已存在");
        }
        ExpertProfile expert = ExpertProfile.create(
                request.id(),
                request.name(),
                request.role(),
                request.scenario(),
                request.accent()
        );
        expert.update(
                request.name(),
                request.role(),
                request.scenario(),
                request.accent(),
                request.sourceSkillName(),
                request.sourceSkillContent(),
                request.sourceSkillUploadedBy(),
                request.systemPrompt(),
                request.userPrompt(),
                request.active()
        );
        try {
            expert = expertProfileRepository.saveAndFlush(expert);
        } catch (DataIntegrityViolationException exception) {
            return conflict("EXPERT_EXISTS", "专家已存在");
        }
        replaceExpertChildren(expert.getId(), request.skills(), request.knowledgeCategories());
        return ResponseEntity.created(URI.create("/api/admin/experts/" + expert.getId()))
                .body(toExpertResponse(expert, true));
    }

    @PatchMapping("/experts/{expertId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updateExpert(@PathVariable String expertId, @Valid @RequestBody UpdateExpertRequest request) {
        ExpertProfile expert = expertProfileRepository.findById(expertId).orElse(null);
        if (expert == null) {
            return notFound("EXPERT_NOT_FOUND", "专家不存在");
        }
        expert.update(
                request.name(),
                request.role(),
                request.scenario(),
                request.accent(),
                request.sourceSkillName(),
                request.sourceSkillContent(),
                request.sourceSkillUploadedBy(),
                request.systemPrompt(),
                request.userPrompt(),
                request.active()
        );
        try {
            expert = expertProfileRepository.saveAndFlush(expert);
        } catch (DataIntegrityViolationException exception) {
            return conflict("EXPERT_EXISTS", "专家已存在");
        }
        replaceExpertChildren(expert.getId(), request.skills(), request.knowledgeCategories());
        return ResponseEntity.ok(toExpertResponse(expert, true));
    }

    @DeleteMapping("/experts/{expertId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteExpert(@PathVariable String expertId) {
        ExpertProfile expert = expertProfileRepository.findById(expertId).orElse(null);
        if (expert == null) {
            return notFound("EXPERT_NOT_FOUND", "专家不存在");
        }
        expertKnowledgeRouteRepository.deleteByExpertId(expertId);
        expertSkillRepository.deleteByExpertId(expertId);
        expertProfileRepository.delete(expert);
        return ResponseEntity.noContent().build();
    }

    private void replaceExpertChildren(String expertId, List<SkillRequest> skills, List<String> categories) {
        expertSkillRepository.deleteByExpertId(expertId);
        expertKnowledgeRouteRepository.deleteByExpertId(expertId);
        skills.forEach(skill -> expertSkillRepository.save(ExpertSkill.create(
                skill.id(),
                expertId,
                skill.name(),
                skill.stage(),
                skill.description()
        )));
        categories.stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .forEach(category -> expertKnowledgeRouteRepository.save(ExpertKnowledgeRoute.create(expertId, category)));
    }

    private KnowledgeBaseResponse toKnowledgeBaseResponse(KnowledgeBase base) {
        return new KnowledgeBaseResponse(
                base.getId(),
                base.getCategory(),
                base.getDescription(),
                base.getUsedBy(),
                base.isActive(),
                knowledgeAssetRepository.countByKnowledgeBaseId(base.getId())
        );
    }

    private KnowledgeAssetResponse toKnowledgeAssetResponse(KnowledgeAsset asset, boolean includeSensitiveContent) {
        String category = knowledgeBaseRepository.findById(asset.getKnowledgeBaseId())
                .map(KnowledgeBase::getCategory)
                .orElse("");
        return new KnowledgeAssetResponse(
                asset.getId(),
                category,
                asset.getName(),
                asset.getSizeLabel(),
                asset.getFileType(),
                asset.getPreview(),
                includeSensitiveContent ? asset.getContentText() : null,
                asset.getUploadedBy(),
                asset.isEnabled(),
                asset.getCreatedAt()
        );
    }

    private ExpertResponse toExpertResponse(ExpertProfile expert, boolean includeSensitiveContent) {
        return new ExpertResponse(
                expert.getId(),
                expert.getName(),
                expert.getRoleDescription(),
                expert.getScenario(),
                expert.getAccent(),
                expert.isActive(),
                expert.getSourceSkillName(),
                includeSensitiveContent ? expert.getSourceSkillContent() : null,
                includeSensitiveContent ? expert.getSourceSkillUploadedBy() : null,
                includeSensitiveContent ? expert.getSystemPrompt() : null,
                includeSensitiveContent ? expert.getUserPrompt() : null,
                expertSkillRepository.findByExpertIdOrderByCreatedAtAsc(expert.getId()).stream()
                        .map(skill -> new SkillResponse(skill.getId(), skill.getName(), skill.getStage(), skill.getDescription()))
                        .toList(),
                expertKnowledgeRouteRepository.findByExpertId(expert.getId()).stream()
                        .map(ExpertKnowledgeRoute::getCategory)
                        .sorted()
                        .toList()
        );
    }

    private static boolean canManageKnowledge(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_TEACHER")
                        || authority.getAuthority().equals("ROLE_ADMIN"));
    }

    private static ResponseEntity<ErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> conflict(String code, String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> notFound(String code, String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(code, message));
    }

    public record KnowledgeBaseRequest(
            @NotBlank @Size(max = 100) String category,
            @NotBlank @Size(max = 500) String description,
            @NotBlank @Size(max = 300) String usedBy
    ) {
    }

    public record UpdateKnowledgeBaseRequest(
            @NotBlank @Size(max = 100) String category,
            @NotBlank @Size(max = 500) String description,
            @NotBlank @Size(max = 300) String usedBy,
            boolean active
    ) {
    }

    public record KnowledgeAssetRequest(
            @NotBlank @Size(max = 100) String category,
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 50) String sizeLabel,
            @NotBlank @Size(max = 80) String fileType,
            @NotBlank @Size(max = 1000) String preview,
            @Size(max = 50000) String contentText,
            @NotBlank @Size(max = 100) String uploadedBy,
            boolean enabled
    ) {
    }

    public record UpdateKnowledgeAssetRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 50) String sizeLabel,
            @NotBlank @Size(max = 80) String fileType,
            @NotBlank @Size(max = 1000) String preview,
            @Size(max = 50000) String contentText,
            boolean enabled
    ) {
    }

    public record ExpertRequest(
            @NotBlank @Size(max = 64) String id,
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 500) String role,
            @NotBlank @Size(max = 300) String scenario,
            @NotBlank @Size(max = 32) String accent,
            @Size(max = 200) String sourceSkillName,
            @Size(max = 80000) String sourceSkillContent,
            @Size(max = 100) String sourceSkillUploadedBy,
            @Size(max = 50000) String systemPrompt,
            @Size(max = 50000) String userPrompt,
            boolean active,
            @NotEmpty List<@Valid SkillRequest> skills,
            @NotNull List<@NotBlank @Size(max = 100) String> knowledgeCategories
    ) {
        @AssertTrue(message = "Skill 文件只能保存为文本配置，不能作为程序执行")
        public boolean isSkillContentTextOnly() {
            return sourceSkillContent == null || !sourceSkillContent.contains("\u0000");
        }
    }

    public record UpdateExpertRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 500) String role,
            @NotBlank @Size(max = 300) String scenario,
            @NotBlank @Size(max = 32) String accent,
            @Size(max = 200) String sourceSkillName,
            @Size(max = 80000) String sourceSkillContent,
            @Size(max = 100) String sourceSkillUploadedBy,
            @Size(max = 50000) String systemPrompt,
            @Size(max = 50000) String userPrompt,
            boolean active,
            @NotEmpty List<@Valid SkillRequest> skills,
            @NotNull List<@NotBlank @Size(max = 100) String> knowledgeCategories
    ) {
        @AssertTrue(message = "Skill 文件只能保存为文本配置，不能作为程序执行")
        public boolean isSkillContentTextOnly() {
            return sourceSkillContent == null || !sourceSkillContent.contains("\u0000");
        }
    }

    public record SkillRequest(
            @NotBlank @Size(max = 64) String id,
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String stage,
            @NotBlank @Size(max = 500) String description
    ) {
    }

    public record KnowledgeBaseResponse(
            String id,
            String category,
            String description,
            String usedBy,
            boolean active,
            long assetCount
    ) {
    }

    public record KnowledgeAssetResponse(
            String id,
            String category,
            String name,
            String sizeLabel,
            String fileType,
            String preview,
            String contentText,
            String uploadedBy,
            boolean enabled,
            Instant createdAt
    ) {
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

    public record SkillResponse(String id, String name, String stage, String description) {
    }

    public record ErrorResponse(String code, String message) {
    }

}
