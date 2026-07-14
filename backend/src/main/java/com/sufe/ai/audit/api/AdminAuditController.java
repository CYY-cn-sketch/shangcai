package com.sufe.ai.audit.api;

import com.sufe.ai.audit.domain.AuditLog;
import com.sufe.ai.audit.repository.AuditLogRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditController {

    private final AuditLogRepository auditLogRepository;

    public AdminAuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<AuditLogResponse> list(@RequestParam(defaultValue = "100") @Min(1) @Max(200) int limit) {
        return auditLogRepository.findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(AuditLogResponse::from)
                .toList();
    }

    public record AuditLogResponse(
            String id,
            String actorAccount,
            String actorDisplayName,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String summary,
            Instant createdAt
    ) {
        private static AuditLogResponse from(AuditLog log) {
            return new AuditLogResponse(
                    log.getId(),
                    log.getActorAccount(),
                    log.getActorDisplayName(),
                    log.getActorRole(),
                    log.getAction(),
                    log.getResourceType(),
                    log.getResourceId(),
                    log.getSummary(),
                    log.getCreatedAt()
            );
        }
    }
}
