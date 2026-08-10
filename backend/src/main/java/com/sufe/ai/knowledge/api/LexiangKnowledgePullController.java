package com.sufe.ai.knowledge.api;

import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.LexiangCourseMapping;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.knowledge.repository.LexiangCourseMappingRepository;
import com.sufe.ai.knowledge.service.LexiangKnowledgePullService;
import com.sufe.ai.knowledge.service.LexiangKnowledgePullService.PullSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/knowledge/lexiang")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class LexiangKnowledgePullController {

    private final KnowledgeBaseRepository baseRepository;
    private final KnowledgeAssetRepository assetRepository;
    private final LexiangCourseMappingRepository mappingRepository;
    private final LexiangKnowledgePullService pullService;

    public LexiangKnowledgePullController(
            KnowledgeBaseRepository baseRepository,
            KnowledgeAssetRepository assetRepository,
            LexiangCourseMappingRepository mappingRepository,
            LexiangKnowledgePullService pullService
    ) {
        this.baseRepository = baseRepository;
        this.assetRepository = assetRepository;
        this.mappingRepository = mappingRepository;
        this.pullService = pullService;
    }

    @GetMapping("/mappings")
    public List<MappingResponse> listMappings() {
        return mappingRepository.findAllByOrderByKnowledgeBaseIdAsc().stream()
                .map(MappingResponse::from)
                .toList();
    }

    @PutMapping("/mappings")
    public ResponseEntity<?> putMapping(@Valid @RequestBody PutMappingRequest request) {
        KnowledgeBase base = baseRepository.findById(request.baseId()).orElse(null);
        if (base == null) {
            return error(HttpStatus.NOT_FOUND, "KNOWLEDGE_BASE_NOT_FOUND", "知识库目录不存在");
        }
        if (!base.isCourseShared()) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "LEXIANG_MAPPING_SCOPE_FORBIDDEN",
                    "仅课程共享知识库可以配置乐享目录映射"
            );
        }

        LexiangCourseMapping mapping = mappingRepository.findByKnowledgeBaseId(base.getId()).orElse(null);
        boolean coordinatesChanged = mapping != null
                && (!mapping.getSpaceId().equals(request.spaceId().trim())
                || !mapping.getParentEntryId().equals(request.parentEntryId().trim()));
        if (coordinatesChanged && assetRepository.existsByKnowledgeBaseIdAndLexiangEntryIdIsNotNull(base.getId())) {
            return error(
                    HttpStatus.CONFLICT,
                    "LEXIANG_MAPPING_HAS_SYNCED_ASSETS",
                    "该知识库已有乐享节点，不能直接改绑远端目录；可先停用映射并处理现有节点"
            );
        }

        if (mapping == null) {
            mapping = LexiangCourseMapping.create(
                    base.getId(),
                    request.spaceId(),
                    request.parentEntryId(),
                    request.enabled()
            );
        } else {
            mapping.update(request.spaceId(), request.parentEntryId(), request.enabled());
        }
        try {
            return ResponseEntity.ok(MappingResponse.from(mappingRepository.saveAndFlush(mapping)));
        } catch (DataIntegrityViolationException exception) {
            return error(
                    HttpStatus.CONFLICT,
                    "LEXIANG_MAPPING_EXISTS",
                    "该知识库或乐享远端目录已存在映射"
            );
        }
    }

    @PostMapping("/pull")
    public PullSummary pull(Authentication authentication) {
        String actor = authentication == null ? "system" : authentication.getName();
        return pullService.pullAll(actor);
    }

    @GetMapping("/pull-runs/latest")
    public PullSummary latestPullRun() {
        return pullService.latestOrInitial();
    }

    private static ResponseEntity<ErrorResponse> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message));
    }

    public record PutMappingRequest(
            @NotBlank @Size(max = 36) String baseId,
            @NotBlank @Size(max = 64) String spaceId,
            @NotBlank @Size(max = 128) String parentEntryId,
            boolean enabled
    ) {}

    public record MappingResponse(
            String id,
            String baseId,
            String spaceId,
            String parentEntryId,
            boolean enabled,
            Instant updatedAt
    ) {
        static MappingResponse from(LexiangCourseMapping mapping) {
            return new MappingResponse(
                    mapping.getId(),
                    mapping.getKnowledgeBaseId(),
                    mapping.getSpaceId(),
                    mapping.getParentEntryId(),
                    mapping.isEnabled(),
                    mapping.getUpdatedAt()
            );
        }
    }

    public record ErrorResponse(String code, String message) {}
}
