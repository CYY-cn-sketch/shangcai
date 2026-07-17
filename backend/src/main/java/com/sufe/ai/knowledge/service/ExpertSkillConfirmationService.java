package com.sufe.ai.knowledge.service;

import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkill;
import com.sufe.ai.knowledge.domain.ExpertSkillFileRole;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadFile;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadFileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ExpertSkillConfirmationService {

    private static final Pattern ACCENT_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private final ExpertSkillUploadRepository uploadRepository;
    private final ExpertSkillUploadFileRepository uploadFileRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository routeRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeAssetRepository knowledgeAssetRepository;
    private final FileStorageService fileStorageService;
    private final AuditLogService auditLogService;

    public ExpertSkillConfirmationService(
            ExpertSkillUploadRepository uploadRepository,
            ExpertSkillUploadFileRepository uploadFileRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository routeRepository,
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeAssetRepository knowledgeAssetRepository,
            FileStorageService fileStorageService,
            AuditLogService auditLogService
    ) {
        this.uploadRepository = uploadRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.routeRepository = routeRepository;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.knowledgeAssetRepository = knowledgeAssetRepository;
        this.fileStorageService = fileStorageService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public ConfirmationResult confirm(String uploadId, ConfirmationCommand command, String actorAccount) {
        ExpertSkillUploadRecord upload = uploadRepository.findByIdForUpdate(uploadId)
                .orElseThrow(() -> failure(ExpertSkillConfirmationException.Kind.NOT_FOUND,
                        "EXPERT_SKILL_UPLOAD_NOT_FOUND", "Skill 上传记录不存在"));
        if (upload.getStatus() == ExpertSkillUploadStatus.ENABLED) {
            ExpertProfile existing = expertProfileRepository.findById(upload.getExpertId())
                    .orElseThrow(() -> failure(ExpertSkillConfirmationException.Kind.CONFLICT,
                            "EXPERT_SKILL_UPLOAD_INCONSISTENT", "已确认的专家记录不存在"));
            return currentResult(upload, existing);
        }

        String name = requireText(command.name(), "专家名称");
        String role = requireText(command.role(), "专家定位");
        String scenario = requireText(command.scenario(), "适用场景");
        String accent = requireText(command.accent(), "主题颜色");
        String skillName = requireText(command.skillName(), "Skill 名称");
        String skillDescription = requireText(command.skillDescription(), "能力说明");
        String systemPrompt = requireText(command.systemPrompt(), "系统提示词");
        String userPrompt = requireText(command.userPrompt(), "用户输入组装规则");
        if (!ACCENT_PATTERN.matcher(accent).matches()) {
            throw failure(ExpertSkillConfirmationException.Kind.INVALID, "INVALID_EXPERT_ACCENT", "主题颜色必须是六位十六进制颜色");
        }
        if (expertProfileRepository.findByName(name).isPresent()) {
            throw failure(ExpertSkillConfirmationException.Kind.CONFLICT, "EXPERT_EXISTS", "专家名称已存在，请修改后再确认");
        }

        List<ExpertSkillUploadFile> uploadFiles = uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId);
        Map<String, ExpertSkillUploadFile> uploadFilesById = new HashMap<>();
        uploadFiles.forEach(file -> uploadFilesById.put(file.getId(), file));
        List<String> selectedIds = new ArrayList<>(new LinkedHashSet<>(command.importFileIds() == null ? List.of() : command.importFileIds()));
        List<ExpertSkillUploadFile> selectedFiles = selectedIds.stream().map(fileId -> {
            ExpertSkillUploadFile file = uploadFilesById.get(fileId);
            if (file == null) {
                throw failure(ExpertSkillConfirmationException.Kind.INVALID, "SKILL_FILE_NOT_FOUND", "待导入文件不属于当前 Skill：" + fileId);
            }
            if (file.getFileRole() != ExpertSkillFileRole.KNOWLEDGE_CANDIDATE) {
                throw failure(ExpertSkillConfirmationException.Kind.INVALID, "SKILL_FILE_NOT_IMPORTABLE", "配置或提示词文件不能导入知识库：" + file.getRelativePath());
            }
            if (file.getImportedAssetId() != null) {
                throw failure(ExpertSkillConfirmationException.Kind.CONFLICT, "SKILL_FILE_ALREADY_IMPORTED", "文件已经导入知识库：" + file.getRelativePath());
            }
            return file;
        }).toList();

        List<String> copiedStorageKeys = new ArrayList<>();
        try {
            KnowledgeBase knowledgeBase = resolveKnowledgeBase(command.knowledge(), selectedFiles.isEmpty());
            String expertId = "skill-" + UUID.randomUUID();
            ExpertProfile expert = ExpertProfile.create(expertId, name, role, scenario, accent);
            String composedSystemPrompt = composeSystemPrompt(
                    systemPrompt, command.knowledgeRule(), command.outputFormat(), command.boundaries()
            );
            if (composedSystemPrompt.length() > 20_000) {
                throw failure(ExpertSkillConfirmationException.Kind.INVALID,
                        "EXPERT_SYSTEM_PROMPT_TOO_LONG", "组合后的专家系统提示词不能超过 20000 个字符");
            }
            expert.update(
                    name,
                    role,
                    scenario,
                    accent,
                    upload.getMainFilePath(),
                    upload.getSourceContent(),
                    upload.getUploadedBy(),
                    composedSystemPrompt,
                    userPrompt,
                    command.active()
            );
            expertProfileRepository.saveAndFlush(expert);
            expertSkillRepository.saveAndFlush(ExpertSkill.create(
                    upload.getId() + "-skill",
                    expert.getId(),
                    skillName,
                    "已确认上传",
                    skillDescription
            ));

            if (knowledgeBase != null) {
                routeRepository.saveAndFlush(ExpertKnowledgeRoute.create(expert.getId(), knowledgeBase.getCategory()));
            }

            List<KnowledgeAsset> importedAssets = new ArrayList<>();
            if (!selectedFiles.isEmpty()) {
                if (knowledgeBase == null) {
                    throw failure(ExpertSkillConfirmationException.Kind.INVALID,
                            "KNOWLEDGE_BASE_REQUIRED", "导入知识资料前必须选择或新建知识库");
                }
                for (ExpertSkillUploadFile source : selectedFiles) {
                    FileStorageService.StoredFile copied = copyKnowledgeFile(source);
                    copiedStorageKeys.add(copied.storageKey());
                    KnowledgeAsset asset = KnowledgeAsset.create(
                            knowledgeBase.getId(),
                            truncate(fileName(source.getRelativePath()), 200),
                            sizeLabel(copied.size()),
                            fileType(copied.mimeType()),
                            truncate("从专家 Skill 导入：" + source.getRelativePath(), 1000),
                            truncateOptional(source.getContentText(), 20_000),
                            actorAccount
                    );
                    asset.attachFile(copied.storageKey(), copied.originalName(), copied.mimeType(), copied.size(), copied.sha256());
                    if (!knowledgeBase.isActive()) asset.setEnabled(false);
                    knowledgeAssetRepository.saveAndFlush(asset);
                    source.markImported(asset.getId());
                    importedAssets.add(asset);
                }
                uploadFileRepository.saveAllAndFlush(selectedFiles);
                auditLogService.record(
                        actorAccount,
                        "EXPERT_SKILL_KNOWLEDGE_IMPORTED",
                        "KNOWLEDGE_BASE",
                        knowledgeBase.getId(),
                        "从专家 Skill 导入 " + importedAssets.size() + " 个知识资料文件到“" + knowledgeBase.getCategory() + "”"
                );
            }

            upload.enable(expert.getId(), actorAccount);
            uploadRepository.saveAndFlush(upload);
            auditLogService.record(
                    actorAccount,
                    "EXPERT_SKILL_CONFIRMED",
                    "EXPERT_SKILL_UPLOAD",
                    upload.getId(),
                    "确认专家 Skill 配置：" + expert.getName()
            );
            auditLogService.record(
                    actorAccount,
                    command.active() ? "EXPERT_SKILL_ENABLED" : "EXPERT_SKILL_SAVED_INACTIVE",
                    "EXPERT_PROFILE",
                    expert.getId(),
                    (command.active() ? "确认并启用专家 Skill：" : "确认并保存未启用专家 Skill：") + expert.getName()
            );
            return new ConfirmationResult(upload, expert, knowledgeBase, uploadFiles, importedAssets);
        } catch (DataIntegrityViolationException exception) {
            copiedStorageKeys.forEach(fileStorageService::delete);
            throw failure(ExpertSkillConfirmationException.Kind.CONFLICT, "EXPERT_SKILL_CONFIRMATION_CONFLICT", "专家或知识库名称已存在，请修改后重试");
        } catch (ExpertSkillConfirmationException exception) {
            copiedStorageKeys.forEach(fileStorageService::delete);
            throw exception;
        } catch (RuntimeException exception) {
            copiedStorageKeys.forEach(fileStorageService::delete);
            throw exception;
        }
    }

    private ConfirmationResult currentResult(ExpertSkillUploadRecord upload, ExpertProfile expert) {
        List<ExpertSkillUploadFile> files = uploadFileRepository.findByUploadIdOrderByRelativePathAsc(upload.getId());
        List<String> assetIds = files.stream().map(ExpertSkillUploadFile::getImportedAssetId).filter(id -> id != null).toList();
        List<KnowledgeAsset> assets = knowledgeAssetRepository.findAllById(assetIds);
        KnowledgeBase base = routeRepository.findByExpertId(expert.getId()).stream().findFirst()
                .flatMap(route -> knowledgeBaseRepository.findByCategory(route.getCategory()))
                .orElse(null);
        return new ConfirmationResult(upload, expert, base, files, assets);
    }

    private KnowledgeBase resolveKnowledgeBase(KnowledgeSelection selection, boolean noFilesSelected) {
        if (selection == null || selection.mode() == null) {
            throw failure(ExpertSkillConfirmationException.Kind.INVALID, "KNOWLEDGE_SELECTION_REQUIRED", "请选择知识库配置方式");
        }
        return switch (selection.mode()) {
            case NONE -> {
                if (!noFilesSelected) {
                    throw failure(ExpertSkillConfirmationException.Kind.INVALID, "KNOWLEDGE_BASE_REQUIRED", "导入知识资料前必须选择或新建知识库");
                }
                yield null;
            }
            case EXISTING -> knowledgeBaseRepository.findById(requireText(selection.knowledgeBaseId(), "已有知识库"))
                    .orElseThrow(() -> failure(ExpertSkillConfirmationException.Kind.INVALID,
                            "KNOWLEDGE_BASE_NOT_FOUND", "选择的知识库不存在"));
            case CREATE -> {
                NewKnowledgeBase input = selection.newKnowledgeBase();
                if (input == null) {
                    throw failure(ExpertSkillConfirmationException.Kind.INVALID, "NEW_KNOWLEDGE_BASE_REQUIRED", "请填写新知识库信息");
                }
                KnowledgeBase base = KnowledgeBase.create(
                        requireText(input.category(), "知识库名称"),
                        requireText(input.description(), "知识库说明"),
                        requireText(input.usedBy(), "使用范围")
                );
                if (!input.active()) base.update(base.getCategory(), base.getDescription(), base.getUsedBy(), false);
                yield knowledgeBaseRepository.saveAndFlush(base);
            }
        };
    }

    private FileStorageService.StoredFile copyKnowledgeFile(ExpertSkillUploadFile source) {
        try {
            return fileStorageService.copySkillFileToKnowledge(source.getStorageKey(), fileName(source.getRelativePath()));
        } catch (IOException | IllegalStateException exception) {
            throw failure(ExpertSkillConfirmationException.Kind.STORAGE,
                    "KNOWLEDGE_FILE_STORE_FAILED", "知识资料文件复制失败：" + source.getRelativePath());
        }
    }

    private static String composeSystemPrompt(String systemPrompt, String knowledgeRule, String outputFormat, String boundaries) {
        StringBuilder result = new StringBuilder(systemPrompt.trim());
        appendSection(result, "知识库调用规则", knowledgeRule);
        appendSection(result, "输出格式", outputFormat);
        appendSection(result, "禁止事项和能力边界", boundaries);
        return result.toString();
    }

    private static void appendSection(StringBuilder target, String title, String content) {
        if (content != null && !content.isBlank()) target.append("\n\n## ").append(title).append('\n').append(content.trim());
    }

    private static String requireText(String value, String label) {
        if (value == null || value.isBlank()) {
            throw failure(ExpertSkillConfirmationException.Kind.INVALID, "INVALID_EXPERT_SKILL_CONFIRMATION", label + "不能为空");
        }
        return value.trim();
    }

    private static String fileName(String path) {
        return path.substring(path.lastIndexOf('/') + 1);
    }

    private static String sizeLabel(long size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return String.format("%.1f KB", size / 1024.0);
        return String.format("%.1f MB", size / 1024.0 / 1024.0);
    }

    private static String fileType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) return "文件";
        if (mimeType.startsWith("text/")) return "文本";
        if (mimeType.startsWith("image/")) return "图片";
        if (mimeType.contains("pdf")) return "PDF";
        if (mimeType.contains("word")) return "Word";
        if (mimeType.contains("sheet") || mimeType.contains("excel")) return "表格";
        if (mimeType.contains("presentation") || mimeType.contains("powerpoint")) return "PPT";
        return "文件";
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private static String truncateOptional(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        return truncate(value.trim(), maxLength);
    }

    private static ExpertSkillConfirmationException failure(
            ExpertSkillConfirmationException.Kind kind,
            String code,
            String message
    ) {
        return new ExpertSkillConfirmationException(kind, code, message);
    }

    public enum KnowledgeMode {
        EXISTING,
        CREATE,
        NONE
    }

    public record NewKnowledgeBase(String category, String description, String usedBy, boolean active) {
    }

    public record KnowledgeSelection(KnowledgeMode mode, String knowledgeBaseId, NewKnowledgeBase newKnowledgeBase) {
    }

    public record ConfirmationCommand(
            String name,
            String role,
            String scenario,
            String accent,
            String skillName,
            String skillDescription,
            String systemPrompt,
            String userPrompt,
            String knowledgeRule,
            String outputFormat,
            String boundaries,
            KnowledgeSelection knowledge,
            List<String> importFileIds,
            boolean active
    ) {
    }

    public record ConfirmationResult(
            ExpertSkillUploadRecord upload,
            ExpertProfile expert,
            KnowledgeBase knowledgeBase,
            List<ExpertSkillUploadFile> uploadFiles,
            List<KnowledgeAsset> importedAssets
    ) {
    }
}
