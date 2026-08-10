package com.sufe.ai.knowledge.api;

import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkill;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.KnowledgeBaseScope;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadFileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.knowledge.service.LexiangKnowledgeSyncService;
import com.sufe.ai.knowledge.service.LexiangKnowledgeSyncService.LexiangKnowledgeDeleteException;
import com.sufe.ai.storage.DocumentTextExtractionService;
import com.sufe.ai.storage.FileStorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping({"/api/admin", "/api/knowledge"})
public class AdminKnowledgeController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeAssetRepository knowledgeAssetRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;
    private final ExpertSkillUploadRepository expertSkillUploadRepository;
    private final ExpertSkillUploadFileRepository expertSkillUploadFileRepository;
    private final FileStorageService fileStorageService;
    private final DocumentTextExtractionService extractionService;
    private final AuditLogService auditLogService;
    private final LexiangKnowledgeSyncService lexiangKnowledgeSyncService;

    public AdminKnowledgeController(
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeAssetRepository knowledgeAssetRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository,
            ExpertSkillUploadRepository expertSkillUploadRepository,
            ExpertSkillUploadFileRepository expertSkillUploadFileRepository,
            FileStorageService fileStorageService,
            DocumentTextExtractionService extractionService,
            AuditLogService auditLogService,
            LexiangKnowledgeSyncService lexiangKnowledgeSyncService
    ) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.knowledgeAssetRepository = knowledgeAssetRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.expertKnowledgeRouteRepository = expertKnowledgeRouteRepository;
        this.expertSkillUploadRepository = expertSkillUploadRepository;
        this.expertSkillUploadFileRepository = expertSkillUploadFileRepository;
        this.fileStorageService = fileStorageService;
        this.extractionService = extractionService;
        this.auditLogService = auditLogService;
        this.lexiangKnowledgeSyncService = lexiangKnowledgeSyncService;
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
    public ResponseEntity<?> createKnowledgeBase(
            Authentication authentication,
            @Valid @RequestBody KnowledgeBaseRequest request
    ) {
        if (knowledgeBaseRepository.findByCategory(request.category().trim()).isPresent()) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
        try {
            KnowledgeBase base = knowledgeBaseRepository.saveAndFlush(
                    KnowledgeBase.create(request.category(), request.description(), request.usedBy())
            );
            auditLogService.record(
                    authentication.getName(),
                    "KNOWLEDGE_BASE_CREATE",
                    "KNOWLEDGE_BASE",
                    base.getId(),
                    "创建知识库 " + base.getCategory()
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
    public ResponseEntity<?> updateKnowledgeBase(
            Authentication authentication,
            @PathVariable String baseId,
            @Valid @RequestBody UpdateKnowledgeBaseRequest request
    ) {
        KnowledgeBase base = knowledgeBaseRepository.findById(baseId).orElse(null);
        if (base == null) {
            return notFound("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (!base.isCourseShared()) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "专家专属知识库只能通过对应专家的 Skill 配置维护"
            );
        }
        if (knowledgeBaseRepository.findByCategory(request.category().trim())
                .filter(existing -> !existing.getId().equals(baseId))
                .isPresent()) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
        try {
            base.update(request.category(), request.description(), request.usedBy(), request.active());
            base = knowledgeBaseRepository.saveAndFlush(base);
            auditLogService.record(
                    authentication.getName(),
                    "KNOWLEDGE_BASE_UPDATE",
                    "KNOWLEDGE_BASE",
                    base.getId(),
                    "更新知识库 " + base.getCategory() + "，状态：" + (base.isActive() ? "启用" : "停用")
            );
            return ResponseEntity.ok(toKnowledgeBaseResponse(base));
        } catch (DataIntegrityViolationException exception) {
            return conflict("KNOWLEDGE_BASE_EXISTS", "知识库目录已存在");
        }
    }

    @DeleteMapping("/knowledge-bases/{baseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteKnowledgeBase(Authentication authentication, @PathVariable String baseId) {
        KnowledgeBase base = knowledgeBaseRepository.findById(baseId).orElse(null);
        if (base == null) {
            return notFound("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (!base.isCourseShared()) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "专家专属知识库随专家配置管理，不能在知识库页面单独删除"
            );
        }
        if (knowledgeAssetRepository.countByKnowledgeBaseId(baseId) > 0) {
            return conflict("KNOWLEDGE_BASE_HAS_ASSETS", "知识库目录已有资料，不能删除");
        }
        expertKnowledgeRouteRepository.deleteByCategory(base.getCategory());
        knowledgeBaseRepository.delete(base);
        auditLogService.record(
                authentication.getName(),
                "KNOWLEDGE_BASE_DELETE",
                "KNOWLEDGE_BASE",
                baseId,
                "删除知识库 " + base.getCategory()
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/knowledge-assets")
    public List<KnowledgeAssetResponse> listKnowledgeAssets(Authentication authentication) {
        boolean includeSensitiveContent = canManageKnowledge(authentication);
        return knowledgeAssetRepository.findAll().stream()
                .filter(asset -> includeSensitiveContent || !isExpertPrivateAsset(asset))
                .sorted(Comparator.comparing(KnowledgeAsset::getName))
                .map(asset -> toKnowledgeAssetResponse(asset, includeSensitiveContent))
                .toList();
    }

    @PostMapping("/knowledge-assets")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createKnowledgeAsset(
            Authentication authentication,
            @Valid @RequestBody KnowledgeAssetRequest request
    ) {
        KnowledgeBase base = knowledgeBaseRepository.findByCategory(request.category().trim()).orElse(null);
        if (base == null) {
            return badRequest("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (!base.isCourseShared()) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "教师上传资料只能进入课程共享知识库；专家专属资料请通过 Skill 配置导入"
            );
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
        auditLogService.record(
                authentication.getName(),
                "KNOWLEDGE_ASSET_CREATE",
                "KNOWLEDGE_ASSET",
                asset.getId(),
                "创建知识资料 " + asset.getName() + "，知识库：" + base.getCategory()
        );
        return ResponseEntity.created(URI.create("/api/admin/knowledge-assets/" + asset.getId()))
                .body(toKnowledgeAssetResponse(asset, true));
    }

    @PostMapping(value = "/knowledge-assets/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadKnowledgeAsset(
            Authentication authentication,
            @RequestParam String category,
            @RequestParam String preview,
            @RequestParam(required = false) String contentText,
            @RequestParam String uploadedBy,
            @RequestParam(defaultValue = "true") boolean enabled,
            @RequestParam MultipartFile file
    ) {
        if (!hasLength(category, 100) || !hasLength(preview, 1000) || !hasLength(uploadedBy, 100)) {
            return badRequest("INVALID_KNOWLEDGE_FILE_METADATA", "知识资料信息不完整或过长");
        }
        if (contentText != null && contentText.length() > 50_000) {
            return badRequest("KNOWLEDGE_CONTENT_TOO_LONG", "知识资料可读文本不能超过 50000 个字符");
        }
        KnowledgeBase base = knowledgeBaseRepository.findByCategory(category.trim()).orElse(null);
        if (base == null) {
            return badRequest("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (!base.isCourseShared()) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "普通知识库上传只能进入课程共享知识库；专家专属资料请在对应专家详情中上传"
            );
        }

        return storeKnowledgeAssetFile(
                authentication,
                base,
                preview,
                uploadedBy,
                enabled,
                file,
                "KNOWLEDGE_ASSET_UPLOAD",
                false
        );
    }

    @PostMapping(value = "/experts/{expertId}/knowledge-assets/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadExpertPrivateKnowledgeAsset(
            Authentication authentication,
            @PathVariable String expertId,
            @RequestParam MultipartFile file
    ) {
        ExpertProfile expert = expertProfileRepository.findById(expertId).orElse(null);
        if (expert == null) {
            return notFound("EXPERT_NOT_FOUND", "专家不存在");
        }
        KnowledgeBase privateBase = ensureExpertPrivateKnowledgeBase(expert);
        return storeKnowledgeAssetFile(
                authentication,
                privateBase,
                "文件已保存，等待系统读取正文。",
                authentication.getName(),
                privateBase.isActive(),
                file,
                "EXPERT_PRIVATE_KNOWLEDGE_UPLOAD",
                true
        );
    }

    @DeleteMapping("/experts/{expertId}/knowledge-assets/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteExpertPrivateKnowledgeAsset(
            Authentication authentication,
            @PathVariable String expertId,
            @PathVariable String assetId
    ) {
        KnowledgeBase privateBase = knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType(expertId, KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElse(null);
        if (privateBase == null) {
            return notFound("EXPERT_PRIVATE_KNOWLEDGE_BASE_NOT_FOUND", "该专家尚未建立专属知识库");
        }
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null || !privateBase.getId().equals(asset.getKnowledgeBaseId())) {
            return notFound("EXPERT_PRIVATE_KNOWLEDGE_ASSET_NOT_FOUND", "该专家的知识资料不存在");
        }
        if (asset.isSkillImport()) {
            return conflict(
                    "SKILL_IMPORTED_ASSET_REQUIRES_SKILL_UPDATE",
                    "该资料来自 Skill 包，请更新该专家 Skill 统一替换，不能单独删除"
            );
        }
        String storageKey = asset.getStorageKey();
        String assetName = asset.getName();
        knowledgeAssetRepository.delete(asset);
        knowledgeAssetRepository.flush();
        auditLogService.record(
                authentication.getName(),
                "EXPERT_PRIVATE_KNOWLEDGE_DELETE",
                "KNOWLEDGE_ASSET",
                assetId,
                "删除专家手动补充知识资料 " + assetName + "，专家：" + expertId
        );
        deleteStoredFilesAfterCommit(storageKey == null ? List.of() : List.of(storageKey));
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> storeKnowledgeAssetFile(
            Authentication authentication,
            KnowledgeBase base,
            String preview,
            String uploadedBy,
            boolean enabled,
            MultipartFile file,
            String auditAction,
            boolean expertDirectUpload
    ) {
        FileStorageService.StoredFile stored;
        try {
            stored = fileStorageService.storeKnowledgeFile(file);
        } catch (IllegalArgumentException exception) {
            return badRequest("INVALID_KNOWLEDGE_FILE", exception.getMessage());
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("KNOWLEDGE_FILE_STORE_FAILED", "知识资料文件保存失败"));
        }

        try {
            DocumentTextExtractionService.ExtractionResult extraction = extractionService.extract(
                    fileStorageService.load(stored.storageKey()),
                    stored.originalName()
            );
            KnowledgeAsset asset = KnowledgeAsset.create(
                    base.getId(),
                    stored.originalName(),
                    formatFileSize(stored.size()),
                    displayFileType(stored.originalName()),
                    extraction.ready() ? buildExtractedPreview(extraction.contentText()) : preview,
                    extraction.ready() ? extraction.contentText() : null,
                    uploadedBy
            );
            if (expertDirectUpload) asset.markExpertDirectUpload();
            asset.updateExtraction(extraction.status(), extraction.message(), extraction.contentText());
            asset.setEnabled(enabled);
            asset.attachFile(
                    stored.storageKey(),
                    stored.originalName(),
                    stored.mimeType(),
                    stored.size(),
                    stored.sha256()
            );
            if (!expertDirectUpload) asset.queueLexiangSync();
            asset = knowledgeAssetRepository.saveAndFlush(asset);
            auditLogService.record(
                    authentication.getName(),
                    auditAction,
                    "KNOWLEDGE_ASSET",
                    asset.getId(),
                    "上传知识资料文件 " + stored.originalName() + "，知识库：" + base.getCategory()
                            + "，大小：" + stored.size() + " 字节"
            );
            return ResponseEntity.created(URI.create("/api/knowledge/knowledge-assets/" + asset.getId()))
                    .body(toKnowledgeAssetResponse(asset, true));
        } catch (RuntimeException exception) {
            fileStorageService.delete(stored.storageKey());
            throw exception;
        }
    }

    @PostMapping(value = "/knowledge-assets/{assetId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> attachKnowledgeAssetFile(
            Authentication authentication,
            @PathVariable String assetId,
            @RequestParam MultipartFile file
    ) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (isExpertPrivateAsset(asset)) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "Skill 导入的专家专属资料请通过专家配置更新"
            );
        }
        if (asset.getLexiangEntryId() != null
                && !LexiangKnowledgeSyncService.extensionOf(asset.getOriginalName())
                .equals(LexiangKnowledgeSyncService.extensionOf(file.getOriginalFilename()))) {
            return badRequest(
                    "LEXIANG_REPLACEMENT_EXTENSION_MISMATCH",
                    "已同步到乐享的文件只能替换为相同扩展名；如需更换格式，请先删除该资料后重新上传"
            );
        }
        FileStorageService.StoredFile stored;
        try {
            stored = fileStorageService.storeKnowledgeFile(file);
        } catch (IllegalArgumentException exception) {
            return badRequest("INVALID_KNOWLEDGE_FILE", exception.getMessage());
        } catch (IOException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("KNOWLEDGE_FILE_STORE_FAILED", "知识资料文件保存失败"));
        }
        String previousStorageKey = asset.getStorageKey();
        boolean replacingFile = asset.hasFile();
        try {
            DocumentTextExtractionService.ExtractionResult extraction = extractionService.extract(
                    fileStorageService.load(stored.storageKey()),
                    stored.originalName()
            );
            asset.attachFile(
                    stored.storageKey(),
                    stored.originalName(),
                    stored.mimeType(),
                    stored.size(),
                    stored.sha256()
            );
            asset.updateExtraction(extraction.status(), extraction.message(), extraction.contentText());
            asset.queueLexiangSync();
            asset = knowledgeAssetRepository.saveAndFlush(asset);
            if (previousStorageKey != null) deleteStoredFilesAfterCommit(List.of(previousStorageKey));
            auditLogService.record(
                    authentication.getName(),
                    replacingFile ? "KNOWLEDGE_ASSET_FILE_REPLACE" : "KNOWLEDGE_ASSET_FILE_ATTACH",
                    "KNOWLEDGE_ASSET",
                    asset.getId(),
                    (replacingFile ? "替换" : "补充") + "知识资料文件 " + stored.originalName()
                            + "，资料：" + asset.getName() + "，大小：" + stored.size() + " 字节"
            );
            return ResponseEntity.ok(toKnowledgeAssetResponse(asset, true));
        } catch (RuntimeException exception) {
            fileStorageService.delete(stored.storageKey());
            throw exception;
        }
    }

    @GetMapping("/knowledge-assets/{assetId}/file")
    public ResponseEntity<?> downloadKnowledgeAsset(@PathVariable String assetId, Authentication authentication) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null || (!asset.isEnabled() && !canManageKnowledge(authentication))) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (isExpertPrivateAsset(asset) && !canManageKnowledge(authentication)) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (!asset.hasFile()) {
            return conflict("KNOWLEDGE_FILE_NOT_AVAILABLE", "该资料只有历史文本记录，尚未保存原始文件");
        }
        Resource resource;
        try {
            resource = fileStorageService.load(asset.getStorageKey());
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return conflict("KNOWLEDGE_FILE_NOT_AVAILABLE", "知识资料文件不存在或已失效");
        }
        String fileName = asset.getOriginalName() == null ? asset.getName() : asset.getOriginalName();
        String contentType = asset.getMimeType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : asset.getMimeType();
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(fileName, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(contentType));
        if (asset.getFileSizeBytes() != null) response.contentLength(asset.getFileSizeBytes());
        auditLogService.record(
                authentication.getName(),
                "KNOWLEDGE_ASSET_DOWNLOAD",
                "KNOWLEDGE_ASSET",
                asset.getId(),
                "下载知识资料文件 " + fileName + "，资料：" + asset.getName()
        );
        return response.body(resource);
    }

    @PatchMapping("/knowledge-assets/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updateKnowledgeAsset(
            Authentication authentication,
            @PathVariable String assetId,
            @Valid @RequestBody UpdateKnowledgeAssetRequest request
    ) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (isExpertPrivateAsset(asset)) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "Skill 导入的专家专属资料请通过专家配置更新"
            );
        }
        asset.update(
                request.name(),
                request.sizeLabel(),
                request.fileType(),
                request.preview(),
                request.contentText(),
                request.enabled()
        );
        if (asset.hasFile()) asset.queueLexiangSync();
        asset = knowledgeAssetRepository.saveAndFlush(asset);
        auditLogService.record(
                authentication.getName(),
                "KNOWLEDGE_ASSET_UPDATE",
                "KNOWLEDGE_ASSET",
                asset.getId(),
                "更新知识资料 " + asset.getName() + "，状态：" + (asset.isEnabled() ? "启用" : "停用")
        );
        return ResponseEntity.ok(toKnowledgeAssetResponse(asset, true));
    }

    @DeleteMapping("/knowledge-assets/{assetId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteKnowledgeAsset(Authentication authentication, @PathVariable String assetId) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (isExpertPrivateAsset(asset)) {
            return badRequest(
                    "EXPERT_PRIVATE_KNOWLEDGE_REQUIRES_SKILL_IMPORT",
                    "Skill 导入的专家专属资料请通过专家配置更新"
            );
        }
        try {
            lexiangKnowledgeSyncService.deleteRemoteBeforeLocal(asset);
        } catch (LexiangKnowledgeDeleteException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new ErrorResponse("LEXIANG_DELETE_FAILED", exception.getMessage()));
        }
        String storageKey = asset.getStorageKey();
        knowledgeAssetRepository.delete(asset);
        knowledgeAssetRepository.flush();
        auditLogService.record(
                authentication.getName(),
                "KNOWLEDGE_ASSET_DELETE",
                "KNOWLEDGE_ASSET",
                assetId,
                "删除知识资料 " + asset.getName()
        );
        deleteStoredFilesAfterCommit(storageKey == null ? List.of() : List.of(storageKey));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/knowledge-assets/{assetId}/lexiang-sync")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> syncKnowledgeAssetWithLexiang(@PathVariable String assetId) {
        KnowledgeAsset asset = knowledgeAssetRepository.findById(assetId).orElse(null);
        if (asset == null) {
            return notFound("KNOWLEDGE_ASSET_NOT_FOUND", "知识库资料不存在");
        }
        if (isExpertPrivateAsset(asset) || !asset.hasFile()) {
            return badRequest("LEXIANG_SYNC_NOT_APPLICABLE", "只有带原始文件的课程共享资料可以同步到乐享知识库");
        }
        asset.queueLexiangSync();
        knowledgeAssetRepository.saveAndFlush(asset);
        KnowledgeAsset synchronizedAsset = lexiangKnowledgeSyncService.syncNow(assetId);
        return ResponseEntity.ok(toKnowledgeAssetResponse(synchronizedAsset, true));
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
        ErrorResponse knowledgeValidationError = validateExpertKnowledgeCategories(request.id(), request.knowledgeCategories());
        if (knowledgeValidationError != null) {
            return ResponseEntity.badRequest().body(knowledgeValidationError);
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
        replaceExpertChildren(expert, request.skills(), request.knowledgeCategories());
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
        ErrorResponse knowledgeValidationError = validateExpertKnowledgeCategories(expertId, request.knowledgeCategories());
        if (knowledgeValidationError != null) {
            return ResponseEntity.badRequest().body(knowledgeValidationError);
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
        replaceExpertChildren(expert, request.skills(), request.knowledgeCategories());
        return ResponseEntity.ok(toExpertResponse(expert, true));
    }

    @DeleteMapping("/experts/{expertId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteExpert(
            @PathVariable String expertId,
            @RequestParam(defaultValue = "false") boolean deletePrivateKnowledge,
            Authentication authentication
    ) {
        ExpertProfile expert = expertProfileRepository.findById(expertId).orElse(null);
        if (expert == null) {
            return notFound("EXPERT_NOT_FOUND", "专家不存在");
        }
        KnowledgeBase privateBase = knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType(expertId, KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElse(null);
        List<KnowledgeAsset> privateAssets = privateBase == null
                ? List.of()
                : knowledgeAssetRepository.findByKnowledgeBaseId(privateBase.getId());
        if (!privateAssets.isEmpty() && !deletePrivateKnowledge) {
            return conflict(
                    "EXPERT_HAS_PRIVATE_KNOWLEDGE",
                    "该专家的专属知识库已有 " + privateAssets.size() + " 份资料；确认后可连同专属库一起删除"
            );
        }

        var uploads = expertSkillUploadRepository.findAllByExpertIdOrderByConfirmedAtDesc(expertId);
        List<String> storageKeys = new java.util.ArrayList<>();
        privateAssets.stream().map(KnowledgeAsset::getStorageKey).filter(java.util.Objects::nonNull).forEach(storageKeys::add);
        uploads.stream()
                .flatMap(upload -> expertSkillUploadFileRepository.findByUploadIdOrderByRelativePathAsc(upload.getId()).stream())
                .map(com.sufe.ai.knowledge.domain.ExpertSkillUploadFile::getStorageKey)
                .filter(java.util.Objects::nonNull)
                .forEach(storageKeys::add);

        expertSkillUploadRepository.deleteAll(uploads);
        knowledgeAssetRepository.deleteAll(privateAssets);
        expertKnowledgeRouteRepository.deleteByExpertId(expertId);
        expertSkillRepository.deleteByExpertId(expertId);
        if (privateBase != null) {
            knowledgeBaseRepository.delete(privateBase);
            knowledgeBaseRepository.flush();
        }
        expertProfileRepository.delete(expert);
        expertProfileRepository.flush();
        auditLogService.record(
                authentication.getName(),
                deletePrivateKnowledge ? "EXPERT_DELETE_WITH_PRIVATE_KNOWLEDGE" : "EXPERT_DELETE",
                "EXPERT",
                expertId,
                "删除专家 " + expert.getName() + "，专属资料 " + privateAssets.size() + " 份，来源归档 " + uploads.size() + " 份"
        );
        deleteStoredFilesAfterCommit(storageKeys);
        return ResponseEntity.noContent().build();
    }

    private void deleteStoredFilesAfterCommit(List<String> storageKeys) {
        List<String> controlledKeys = storageKeys.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(key -> !key.isEmpty())
                .distinct()
                .toList();
        if (controlledKeys.isEmpty()) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("文件删除必须注册在数据库事务提交之后");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (String storageKey : controlledKeys) {
                    try {
                        fileStorageService.delete(storageKey);
                    } catch (IllegalArgumentException ignored) {
                        // 非法或越界路径不会被删除；残留记录交由运维审计处理。
                    }
                }
            }
        });
    }

    private void replaceExpertChildren(ExpertProfile expert, List<SkillRequest> skills, List<String> categories) {
        KnowledgeBase privateBase = ensureExpertPrivateKnowledgeBase(expert);
        String expertId = expert.getId();
        expertSkillRepository.deleteByExpertId(expertId);
        expertKnowledgeRouteRepository.deleteByExpertId(expertId);
        skills.forEach(skill -> expertSkillRepository.save(ExpertSkill.create(
                skill.id(),
                expertId,
                skill.name(),
                skill.stage(),
                skill.description()
        )));
        java.util.stream.Stream.concat(categories.stream(), java.util.stream.Stream.of(privateBase.getCategory()))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .forEach(category -> expertKnowledgeRouteRepository.save(ExpertKnowledgeRoute.create(expertId, category)));
    }

    private KnowledgeBase ensureExpertPrivateKnowledgeBase(ExpertProfile expert) {
        return knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType(expert.getId(), KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElseGet(() -> knowledgeBaseRepository.saveAndFlush(KnowledgeBase.createExpertPrivate(
                        KnowledgeBase.expertPrivateCategory(expert.getName(), expert.getId()),
                        limit(expert.getName() + "的 Skill 知识资料，仅供该专家检索使用。", 500),
                        expert.getName(),
                        expert.getId()
                )));
    }

    private ErrorResponse validateExpertKnowledgeCategories(String expertId, List<String> categories) {
        for (String rawCategory : categories) {
            String category = rawCategory.trim();
            KnowledgeBase base = knowledgeBaseRepository.findByCategory(category).orElse(null);
            if (base == null) {
                return new ErrorResponse("KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在：" + category);
            }
            if (!base.isCourseShared() && !base.isOwnedByExpert(expertId)) {
                return new ErrorResponse(
                        "EXPERT_PRIVATE_KNOWLEDGE_FORBIDDEN",
                        "不能把其他专家的专属知识库绑定到当前专家：" + category
                );
            }
        }
        return null;
    }

    private boolean isExpertPrivateAsset(KnowledgeAsset asset) {
        return knowledgeBaseRepository.findById(asset.getKnowledgeBaseId())
                .map(base -> !base.isCourseShared())
                .orElse(false);
    }

    private KnowledgeBaseResponse toKnowledgeBaseResponse(KnowledgeBase base) {
        return new KnowledgeBaseResponse(
                base.getId(),
                base.getCategory(),
                base.getDescription(),
                base.getUsedBy(),
                base.isActive(),
                base.getScopeType().name(),
                base.getOwnerExpertId(),
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
                asset.hasFile(),
                asset.getOriginalName(),
                asset.getMimeType(),
                asset.getFileSizeBytes(),
                asset.getSha256(),
                asset.getExtractionStatus(),
                asset.getExtractionMessage(),
                asset.hasFile() ? "/api/knowledge/knowledge-assets/" + asset.getId() + "/file" : null,
                asset.getLexiangSyncStatus().name(),
                includeSensitiveContent ? asset.getLexiangEntryId() : null,
                includeSensitiveContent ? asset.getLexiangSyncError() : null,
                asset.getLexiangSyncedAt(),
                asset.getCreatedAt()
        );
    }

    private static boolean hasLength(String value, int maxLength) {
        return value != null && !value.isBlank() && value.trim().length() <= maxLength;
    }

    private static String buildExtractedPreview(String contentText) {
        String normalized = contentText.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 300 ? normalized : normalized.substring(0, 300) + "…";
    }

    private static String formatFileSize(long size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return String.format(Locale.ROOT, "%.1f KB", size / 1024.0);
        return String.format(Locale.ROOT, "%.1f MB", size / (1024.0 * 1024.0));
    }

    private static String displayFileType(String name) {
        int separator = name.lastIndexOf('.');
        if (separator < 0 || separator == name.length() - 1) return "文件";
        return name.substring(separator + 1).toUpperCase(Locale.ROOT);
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
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
            String scopeType,
            String ownerExpertId,
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
            boolean fileAvailable,
            String originalName,
            String mimeType,
            Long fileSizeBytes,
            String sha256,
            String extractionStatus,
            String extractionMessage,
            String downloadUrl,
            String lexiangSyncStatus,
            String lexiangEntryId,
            String lexiangSyncError,
            Instant lexiangSyncedAt,
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
