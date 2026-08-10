package com.sufe.ai.workspace.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.workspace.domain.ExpertHandoff;
import com.sufe.ai.workspace.repository.ExpertHandoffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExpertHandoffService {

    private static final String BRAINSTORM = "brainstorm";
    private static final String POSITIONING = "positioning";
    private static final String ALL_EXPERTS = "ALL";

    private final UserAccountRepository userAccountRepository;
    private final ArtifactRecordRepository artifactRepository;
    private final ExpertHandoffRepository handoffRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public ExpertHandoffService(
            UserAccountRepository userAccountRepository,
            ArtifactRecordRepository artifactRepository,
            ExpertHandoffRepository handoffRepository,
            AuditLogService auditLogService,
            ObjectMapper objectMapper
    ) {
        this.userAccountRepository = userAccountRepository;
        this.artifactRepository = artifactRepository;
        this.handoffRepository = handoffRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ExpertHandoff> list(String accountName, String ideaId, String targetExpertId) {
        String userId = resolveUser(accountName).getId();
        return handoffRepository.findAllByUserIdOrderByConfirmedAtDesc(userId).stream()
                .filter(handoff -> ideaId == null || ideaId.equals(handoff.getIdeaId()))
                .filter(handoff -> targetExpertId == null || targetExpertId.equals(handoff.getTargetExpertId()))
                .toList();
    }

    @Transactional
    public ConfirmResult confirm(String accountName, String artifactId, String targetExpertId) {
        UserAccount user = resolveUser(accountName);
        String normalizedTarget = requireSupportedTarget(targetExpertId);
        ArtifactRecord artifact = artifactRepository.findOwnedByIdForUpdate(artifactId, user.getId())
                .orElseThrow(() -> new WorkspaceResourceNotFoundException("交接来源成果不存在"));
        JsonNode payload = readAndValidatePayload(artifact, normalizedTarget);
        String sourceExpertId = ALL_EXPERTS.equals(normalizedTarget)
                ? sourceExpertFor(artifact.getArtifactType())
                : BRAINSTORM;
        ExpertHandoff existing = handoffRepository
                .findByUserIdAndSourceArtifactIdAndTargetExpertId(user.getId(), artifactId, normalizedTarget)
                .orElse(null);
        if (existing != null) {
            if (existing.refresh(sourceExpertId, payload.toString())) {
                auditLogService.record(
                        accountName,
                        "更新专家交接",
                        "专家交接",
                        existing.getId(),
                        "成果内容已刷新，更新确认后的交接快照：" + artifact.getTitle()
                );
            }
            return new ConfirmResult(existing, false);
        }
        ExpertHandoff saved = handoffRepository.save(ExpertHandoff.confirm(
                user.getId(),
                artifact.getIdeaId(),
                artifact.getId(),
                sourceExpertId,
                normalizedTarget,
                payload.toString()
        ));
        auditLogService.record(
                accountName,
                "确认专家交接",
                "专家交接",
                saved.getId(),
                ALL_EXPERTS.equals(normalizedTarget)
                        ? "确认“%s”为当前正式阶段成果，供同一创意下其他专家只读引用".formatted(artifact.getTitle())
                        : "确认头脑风暴成果并交给项目定位专家"
        );
        return new ConfirmResult(saved, true);
    }

    private JsonNode readAndValidatePayload(ArtifactRecord artifact, String targetExpertId) {
        if (ALL_EXPERTS.equals(targetExpertId)) {
            return buildConfirmedArtifactPayload(artifact);
        }
        if (!"BRAINSTORM".equals(artifact.getArtifactType())) {
            throw new ExpertHandoffValidationException("只有头脑风暴阶段成果可以交给项目定位专家");
        }
        try {
            JsonNode root = objectMapper.readTree(artifact.getContentJson());
            JsonNode handoff = root.path("handoff");
            boolean valid = handoff.isObject()
                    && "BRAINSTORM_TO_POSITIONING".equals(handoff.path("kind").asText())
                    && BRAINSTORM.equals(handoff.path("sourceExpertId").asText())
                    && targetExpertId.equals(handoff.path("targetExpertId").asText())
                    && artifact.getIdeaId().equals(handoff.path("ideaId").asText())
                    && handoff.path("ideaDirections").isArray();
            if (!valid) {
                throw new ExpertHandoffValidationException("头脑风暴成果缺少可交接的结构化内容");
            }
            return handoff.deepCopy();
        } catch (JsonProcessingException exception) {
            throw new ExpertHandoffValidationException("头脑风暴成果内容无法解析");
        }
    }

    private ObjectNode buildConfirmedArtifactPayload(ArtifactRecord artifact) {
        try {
            JsonNode content = objectMapper.readTree(artifact.getContentJson());
            JsonNode blocks = content.isArray() ? content : content.path("blocks");
            if (!blocks.isArray() || blocks.isEmpty()) {
                throw new ExpertHandoffValidationException("当前成果缺少可共享的结构化内容");
            }
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("kind", "CONFIRMED_STAGE_ARTIFACT");
            payload.put("schemaVersion", 1);
            payload.put("sourceExpertId", sourceExpertFor(artifact.getArtifactType()));
            if (artifact.getSourceMessageId() != null) payload.put("sourceMessageId", artifact.getSourceMessageId());
            payload.put("ideaId", artifact.getIdeaId());
            payload.put("artifactType", artifact.getArtifactType());
            payload.put("title", artifact.getTitle());
            payload.put("summary", artifact.getSummary());
            payload.set("content", content.deepCopy());
            return payload;
        } catch (JsonProcessingException exception) {
            throw new ExpertHandoffValidationException("阶段成果内容无法解析");
        }
    }

    private static String sourceExpertFor(String artifactType) {
        return switch (artifactType) {
            case "BRAINSTORM" -> "brainstorm";
            case "POSITIONING" -> "positioning";
            case "MARKET" -> "market";
            case "BP" -> "business";
            case "PPT" -> "pitch";
            case "SCRIPT" -> "script";
            case "DEFENSE" -> "defense";
            case "MEDIA" -> "media";
            default -> throw new ExpertHandoffValidationException("当前成果类型不能确认为阶段成果");
        };
    }

    private static String requireSupportedTarget(String targetExpertId) {
        if (!POSITIONING.equals(targetExpertId) && !ALL_EXPERTS.equals(targetExpertId)) {
            throw new ExpertHandoffValidationException("不支持的阶段成果共享范围");
        }
        return targetExpertId;
    }

    private UserAccount resolveUser(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"));
    }

    public record ConfirmResult(ExpertHandoff handoff, boolean created) {
    }
}
