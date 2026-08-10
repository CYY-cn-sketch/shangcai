package com.sufe.ai.knowledge.api;

import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadFile;
import com.sufe.ai.knowledge.domain.ExpertSkillFileRole;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadFileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.service.ExpertSkillConfirmationException;
import com.sufe.ai.knowledge.service.ExpertSkillConfirmationService;
import com.sufe.ai.knowledge.service.ExpertSkillUploadParser;
import com.sufe.ai.storage.FileStorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge/expert-skill-uploads")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class ExpertSkillUploadController {

    private static final int MAX_SOURCE_PREVIEW_CHARACTERS = 50_000;

    private final ExpertSkillUploadParser parser;
    private final ExpertSkillUploadRepository uploadRepository;
    private final ExpertSkillUploadFileRepository uploadFileRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;
    private final FileStorageService fileStorageService;
    private final ExpertSkillConfirmationService confirmationService;
    private final AuditLogService auditLogService;

    public ExpertSkillUploadController(
            ExpertSkillUploadParser parser,
            ExpertSkillUploadRepository uploadRepository,
            ExpertSkillUploadFileRepository uploadFileRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository,
            FileStorageService fileStorageService,
            ExpertSkillConfirmationService confirmationService,
            AuditLogService auditLogService
    ) {
        this.parser = parser;
        this.uploadRepository = uploadRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.expertKnowledgeRouteRepository = expertKnowledgeRouteRepository;
        this.fileStorageService = fileStorageService;
        this.confirmationService = confirmationService;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<UploadResponse> listUploads() {
        return uploadRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toUploadResponse).toList();
    }

    @GetMapping("/experts/{expertId}/files")
    public ResponseEntity<?> listExpertSourceFiles(@PathVariable String expertId) {
        ExpertProfile expert = expertProfileRepository.findById(expertId).orElse(null);
        if (expert == null) return notFound("EXPERT_NOT_FOUND", "专家不存在");

        Optional<ExpertSkillUploadRecord> currentUpload = uploadRepository
                .findFirstByExpertIdAndStatusOrderByConfirmedAtDesc(expertId, ExpertSkillUploadStatus.ENABLED);
        if (currentUpload.isPresent()) {
            ExpertSkillUploadRecord upload = currentUpload.orElseThrow();
            List<ExpertSkillSourceFileResponse> files = uploadFileRepository
                    .findByUploadIdOrderByRelativePathAsc(upload.getId())
                    .stream()
                    .map(this::toSourceFileResponse)
                    .toList();
            return ResponseEntity.ok(new ExpertSkillSourceResponse(
                    "UPLOADED",
                    upload.getFolderName(),
                    upload.getMainFilePath(),
                    upload.getUploadedBy(),
                    upload.getConfirmedAt(),
                    files
            ));
        }

        List<ExpertSkillSourceFileResponse> files = starterOrLegacySourceFiles(expert);
        return ResponseEntity.ok(new ExpertSkillSourceResponse(
                expert.getSourceSkillName() != null && expert.getSourceSkillName().startsWith("starter-content/")
                        ? "STARTER"
                        : "PROFILE",
                sourceFolderName(expert.getSourceSkillName(), expert.getName()),
                expert.getSourceSkillName(),
                expert.getSourceSkillUploadedBy(),
                null,
                files
        ));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> upload(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("paths") List<String> paths,
            Authentication authentication
    ) {
        ExpertSkillUploadParser.ParsedUpload parsed;
        try {
            parsed = parser.parse(files, paths);
        } catch (IllegalArgumentException exception) {
            return badRequest("INVALID_EXPERT_SKILL_UPLOAD", exception.getMessage());
        }
        return saveParsedUpload(parsed, authentication, "文件夹");
    }

    @PostMapping(path = "/archive", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> uploadArchive(
            @RequestParam("archive") MultipartFile archive,
            Authentication authentication
    ) {
        ExpertSkillUploadParser.ParsedUpload parsed;
        try {
            parsed = parser.parseArchive(archive);
        } catch (IllegalArgumentException exception) {
            return badRequest("INVALID_EXPERT_SKILL_UPLOAD", exception.getMessage());
        }
        return saveParsedUpload(parsed, authentication, "ZIP 压缩包");
    }

    private ResponseEntity<?> saveParsedUpload(
            ExpertSkillUploadParser.ParsedUpload parsed,
            Authentication authentication,
            String sourceLabel
    ) {
        ExpertSkillUploadRecord record = ExpertSkillUploadRecord.parsed(authentication.getName(), parsed.skill());
        List<String> storageKeys = new ArrayList<>();
        List<ExpertSkillUploadFile> fileRecords = new ArrayList<>();
        try {
            for (ExpertSkillUploadParser.ParsedFile file : parsed.files()) {
                FileStorageService.StoredFile stored = fileStorageService.storeSkillFile(
                        record.getId(), file.relativePath(), file.content()
                );
                storageKeys.add(stored.storageKey());
                fileRecords.add(ExpertSkillUploadFile.create(
                        record.getId(),
                        file.relativePath(),
                        file.fileRole(),
                        file.contentText(),
                        stored.storageKey(),
                        stored.mimeType(),
                        stored.size(),
                        stored.sha256()
                ));
            }
        } catch (IllegalArgumentException exception) {
            storageKeys.forEach(fileStorageService::delete);
            return badRequest("INVALID_EXPERT_SKILL_UPLOAD", exception.getMessage());
        } catch (IOException exception) {
            storageKeys.forEach(fileStorageService::delete);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("EXPERT_SKILL_FILE_STORE_FAILED", "Skill 来源文件保存失败"));
        }

        try {
            uploadRepository.saveAndFlush(record);
            uploadFileRepository.saveAllAndFlush(fileRecords);
            auditLogService.record(
                    authentication.getName(),
                    "EXPERT_SKILL_PARSED",
                    "EXPERT_SKILL_UPLOAD",
                    record.getId(),
                    "保存并解析专家 Skill " + sourceLabel + "：" + record.getFolderName() + "（配置中）"
            );
        } catch (RuntimeException exception) {
            storageKeys.forEach(fileStorageService::delete);
            throw exception;
        }
        return ResponseEntity.created(URI.create("/api/knowledge/expert-skill-uploads/" + record.getId()))
                .body(toUploadResponse(record, fileRecords));
    }

    @GetMapping("/{uploadId}/files/{fileId}/content")
    public ResponseEntity<?> downloadSourceFile(@PathVariable String uploadId, @PathVariable String fileId) {
        ExpertSkillUploadFile file = uploadFileRepository.findById(fileId).orElse(null);
        if (file == null || !file.getUploadId().equals(uploadId)) {
            return notFound("EXPERT_SKILL_FILE_NOT_FOUND", "Skill 来源文件不存在");
        }
        Resource resource;
        try {
            resource = fileStorageService.load(file.getStorageKey());
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return notFound("EXPERT_SKILL_FILE_NOT_FOUND", "Skill 来源文件不存在或已失效");
        }
        String fileName = file.getRelativePath().substring(file.getRelativePath().lastIndexOf('/') + 1);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(fileName, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(file.getMimeType()))
                .contentLength(file.getFileSizeBytes())
                .body(resource);
    }

    @DeleteMapping("/{uploadId}")
    @Transactional
    public ResponseEntity<?> discard(@PathVariable String uploadId, Authentication authentication) {
        ExpertSkillUploadRecord upload = uploadRepository.findById(uploadId).orElse(null);
        if (upload == null) return ResponseEntity.noContent().build();
        if (upload.getStatus() != ExpertSkillUploadStatus.PARSED) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ErrorResponse("EXPERT_SKILL_UPLOAD_ALREADY_CONFIRMED", "已确认的专家 Skill 不能作为临时上传删除"));
        }
        List<ExpertSkillUploadFile> files = uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId);
        files.forEach(file -> fileStorageService.delete(file.getStorageKey()));
        uploadFileRepository.deleteAll(files);
        uploadRepository.delete(upload);
        auditLogService.record(
                authentication.getName(),
                "EXPERT_SKILL_UPLOAD_DISCARDED",
                "EXPERT_SKILL_UPLOAD",
                uploadId,
                "取消专家 Skill 配置并清理临时来源文件：" + upload.getFolderName()
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{uploadId}/confirm")
    public ResponseEntity<?> confirm(
            @PathVariable String uploadId,
            @Valid @RequestBody ConfirmRequest request,
            Authentication authentication
    ) {
        ExpertSkillConfirmationService.ConfirmationCommand command = new ExpertSkillConfirmationService.ConfirmationCommand(
                request.targetExpertId(),
                request.name(),
                request.role(),
                request.scenario(),
                request.accent(),
                request.skillName(),
                request.skillDescription(),
                request.systemPrompt(),
                request.userPrompt(),
                request.knowledgeRule(),
                request.outputFormat(),
                request.boundaries(),
                new ExpertSkillConfirmationService.KnowledgeSelection(
                        request.knowledge().mode(),
                        request.knowledge().knowledgeBaseId(),
                        request.knowledge().newKnowledgeBase() == null ? null : new ExpertSkillConfirmationService.NewKnowledgeBase(
                                request.knowledge().newKnowledgeBase().category(),
                                request.knowledge().newKnowledgeBase().description(),
                                request.knowledge().newKnowledgeBase().usedBy(),
                                request.knowledge().newKnowledgeBase().active()
                        )
                ),
                request.importFileIds(),
                request.active()
        );
        try {
            ExpertSkillConfirmationService.ConfirmationResult result = confirmationService.confirm(
                    uploadId, command, authentication.getName()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toConfirmationResponse(result));
        } catch (ExpertSkillConfirmationException exception) {
            HttpStatus status = switch (exception.getKind()) {
                case INVALID -> HttpStatus.BAD_REQUEST;
                case NOT_FOUND -> HttpStatus.NOT_FOUND;
                case CONFLICT -> HttpStatus.CONFLICT;
                case STORAGE -> HttpStatus.INTERNAL_SERVER_ERROR;
            };
            return ResponseEntity.status(status).body(new ErrorResponse(exception.getCode(), exception.getMessage()));
        }
    }

    private ConfirmationResponse toConfirmationResponse(ExpertSkillConfirmationService.ConfirmationResult result) {
        return new ConfirmationResponse(
                toExpertResponse(result.expert()),
                toUploadResponse(result.upload(), result.uploadFiles()),
                result.knowledgeBase() == null ? null : toKnowledgeBaseResponse(result.knowledgeBase()),
                result.importedAssets().stream().map(this::toImportedAssetResponse).toList()
        );
    }

    private UploadResponse toUploadResponse(ExpertSkillUploadRecord record) {
        return toUploadResponse(record, uploadFileRepository.findByUploadIdOrderByRelativePathAsc(record.getId()));
    }

    private UploadResponse toUploadResponse(ExpertSkillUploadRecord record, List<ExpertSkillUploadFile> files) {
        return new UploadResponse(
                record.getId(),
                record.getFolderName(),
                record.getMainFilePath(),
                record.getFileCount(),
                record.getParsedName(),
                record.getParsedRole(),
                record.getParsedScenario(),
                record.getParsedAccent(),
                record.getParsedSkillName(),
                record.getParsedSkillDescription(),
                record.getParsedSystemPrompt(),
                record.getParsedUserPrompt(),
                record.getParsedKnowledgeRule(),
                record.getParsedOutputFormat(),
                record.getParsedBoundaries(),
                record.getStatus().name(),
                record.getExpertId(),
                record.getUploadedBy(),
                record.getConfirmedBy(),
                record.getCreatedAt(),
                record.getConfirmedAt(),
                files.stream().map(this::toFileResponse).toList()
        );
    }

    private FileResponse toFileResponse(ExpertSkillUploadFile file) {
        String preview = file.getFileRole() == ExpertSkillFileRole.SOURCE_CODE
                ? null
                : file.getContentText();
        if (preview != null && preview.length() > 300) preview = preview.substring(0, 300) + "…";
        return new FileResponse(
                file.getId(),
                file.getRelativePath(),
                file.getFileRole().name(),
                preview,
                file.getMimeType(),
                file.getFileSizeBytes(),
                file.getSha256(),
                file.getImportedAssetId(),
                "/api/knowledge/expert-skill-uploads/" + file.getUploadId() + "/files/" + file.getId() + "/content"
        );
    }

    private ExpertSkillSourceFileResponse toSourceFileResponse(ExpertSkillUploadFile file) {
        PreviewText preview = previewText(file.getContentText());
        return new ExpertSkillSourceFileResponse(
                file.getId(),
                file.getRelativePath(),
                file.getFileRole().name(),
                preview.content(),
                preview.truncated(),
                file.getMimeType(),
                file.getFileSizeBytes(),
                file.getSha256(),
                file.getImportedAssetId(),
                "/api/knowledge/expert-skill-uploads/" + file.getUploadId() + "/files/" + file.getId() + "/content"
        );
    }

    private List<ExpertSkillSourceFileResponse> starterOrLegacySourceFiles(ExpertProfile expert) {
        String mainPath = expert.getSourceSkillName();
        String mainContent = expert.getSourceSkillContent();
        if (mainPath == null || mainPath.isBlank() || mainContent == null || mainContent.isBlank()) return List.of();

        List<ExpertSkillSourceFileResponse> files = new ArrayList<>();
        files.add(classpathTextFile(mainPath, ExpertSkillFileRole.PROMPT, mainContent));
        if (mainPath.startsWith("starter-content/") && mainPath.endsWith("/SKILL.md")) {
            String examplePath = mainPath.substring(0, mainPath.length() - "SKILL.md".length()) + "examples/真实使用样例.md";
            ClassPathResource example = new ClassPathResource(examplePath);
            if (example.exists()) {
                try (var input = example.getInputStream()) {
                    byte[] content = input.readAllBytes();
                    files.add(classpathTextFile(
                            examplePath,
                            ExpertSkillFileRole.REFERENCE,
                            new String(content, StandardCharsets.UTF_8)
                    ));
                } catch (IOException exception) {
                    throw new IllegalStateException("无法读取专家 Skill 内置样例：" + examplePath, exception);
                }
            }
        }
        return List.copyOf(files);
    }

    private ExpertSkillSourceFileResponse classpathTextFile(
            String relativePath,
            ExpertSkillFileRole role,
            String contentText
    ) {
        byte[] content = contentText.getBytes(StandardCharsets.UTF_8);
        PreviewText preview = previewText(contentText);
        return new ExpertSkillSourceFileResponse(
                UUID.nameUUIDFromBytes(relativePath.getBytes(StandardCharsets.UTF_8)).toString(),
                relativePath,
                role.name(),
                preview.content(),
                preview.truncated(),
                "text/markdown",
                content.length,
                sha256(content),
                null,
                null
        );
    }

    private static PreviewText previewText(String contentText) {
        if (contentText == null || contentText.isBlank()) return new PreviewText(null, false);
        String normalized = contentText.trim();
        if (normalized.length() <= MAX_SOURCE_PREVIEW_CHARACTERS) return new PreviewText(normalized, false);
        return new PreviewText(normalized.substring(0, MAX_SOURCE_PREVIEW_CHARACTERS), true);
    }

    private static String sourceFolderName(String sourcePath, String fallbackName) {
        if (sourcePath == null || sourcePath.isBlank()) return fallbackName;
        String normalized = sourcePath.replace('\\', '/');
        int separator = normalized.lastIndexOf('/');
        if (separator <= 0) return fallbackName;
        String parent = normalized.substring(0, separator);
        int parentSeparator = parent.lastIndexOf('/');
        return parent.substring(parentSeparator + 1);
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("当前 Java 环境不支持 SHA-256", exception);
        }
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

    private static KnowledgeBaseResponse toKnowledgeBaseResponse(KnowledgeBase base) {
        return new KnowledgeBaseResponse(
                base.getId(),
                base.getCategory(),
                base.getDescription(),
                base.getUsedBy(),
                base.isActive(),
                base.getScopeType().name(),
                base.getOwnerExpertId()
        );
    }

    private ImportedAssetResponse toImportedAssetResponse(KnowledgeAsset asset) {
        String sourceFileId = uploadFileRepository.findByImportedAssetId(asset.getId())
                .map(ExpertSkillUploadFile::getId)
                .orElse(null);
        return new ImportedAssetResponse(asset.getId(), sourceFileId, asset.getName(), asset.getOriginalName(), asset.getSha256());
    }

    private static ResponseEntity<ErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> notFound(String code, String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(code, message));
    }

    public record ConfirmRequest(
            @Size(max = 64) String targetExpertId,
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 500) String role,
            @NotBlank @Size(max = 300) String scenario,
            @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String accent,
            @NotBlank @Size(max = 100) String skillName,
            @NotBlank @Size(max = 500) String skillDescription,
            @NotBlank @Size(max = 20_000) String systemPrompt,
            @NotBlank @Size(max = 20_000) String userPrompt,
            @Size(max = 10_000) String knowledgeRule,
            @Size(max = 10_000) String outputFormat,
            @Size(max = 10_000) String boundaries,
            @NotNull @Valid KnowledgeSelectionRequest knowledge,
            @Size(max = 50) List<@NotBlank String> importFileIds,
            boolean active
    ) {
    }

    public record KnowledgeSelectionRequest(
            @NotNull ExpertSkillConfirmationService.KnowledgeMode mode,
            @Size(max = 36) String knowledgeBaseId,
            @Valid NewKnowledgeBaseRequest newKnowledgeBase
    ) {
    }

    public record NewKnowledgeBaseRequest(
            @Size(max = 100) String category,
            @Size(max = 500) String description,
            @Size(max = 300) String usedBy,
            boolean active
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
            String parsedSkillName,
            String parsedSkillDescription,
            String parsedSystemPrompt,
            String parsedUserPrompt,
            String parsedKnowledgeRule,
            String parsedOutputFormat,
            String parsedBoundaries,
            String status,
            String expertId,
            String uploadedBy,
            String confirmedBy,
            Instant createdAt,
            Instant confirmedAt,
            List<FileResponse> files
    ) {
    }

    public record FileResponse(
            String id,
            String relativePath,
            String fileRole,
            String contentPreview,
            String mimeType,
            long fileSizeBytes,
            String sha256,
            String importedAssetId,
            String downloadUrl
    ) {
    }

    public record ExpertSkillSourceResponse(
            String sourceType,
            String folderName,
            String mainFilePath,
            String uploadedBy,
            Instant updatedAt,
            List<ExpertSkillSourceFileResponse> files
    ) {
    }

    public record ExpertSkillSourceFileResponse(
            String id,
            String relativePath,
            String fileRole,
            String contentText,
            boolean contentTruncated,
            String mimeType,
            long fileSizeBytes,
            String sha256,
            String importedAssetId,
            String downloadUrl
    ) {
    }

    private record PreviewText(String content, boolean truncated) {
    }

    public record ConfirmationResponse(
            ExpertResponse expert,
            UploadResponse upload,
            KnowledgeBaseResponse knowledgeBase,
            List<ImportedAssetResponse> importedAssets
    ) {
    }

    public record KnowledgeBaseResponse(
            String id,
            String category,
            String description,
            String usedBy,
            boolean active,
            String scopeType,
            String ownerExpertId
    ) {
    }

    public record ImportedAssetResponse(String id, String sourceFileId, String name, String originalName, String sha256) {
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
