package com.sufe.ai.audit.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.audit.domain.AuditLog;
import com.sufe.ai.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserAccountRepository userAccountRepository;

    public AuditLogService(AuditLogRepository auditLogRepository, UserAccountRepository userAccountRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public void record(String actorAccount, String action, String resourceType, String resourceId, String summary) {
        UserAccount actor = userAccountRepository.findByAccountIgnoreCase(actorAccount)
                .orElseThrow(() -> new IllegalStateException("审计操作人不存在"));
        auditLogRepository.save(AuditLog.create(
                actor.getId(),
                actor.getAccount(),
                actor.getDisplayName(),
                actor.getRole().name(),
                action,
                resourceType,
                resourceId,
                summary
        ));
    }
}
