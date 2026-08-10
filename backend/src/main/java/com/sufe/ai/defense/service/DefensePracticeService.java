package com.sufe.ai.defense.service;

import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.defense.domain.DefensePracticeRecord;
import com.sufe.ai.defense.repository.DefensePracticeRepository;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DefensePracticeService {

    private final UserAccountRepository userAccountRepository;
    private final StudentIdeaRepository ideaRepository;
    private final DefensePracticeRepository practiceRepository;

    public DefensePracticeService(
            UserAccountRepository userAccountRepository,
            StudentIdeaRepository ideaRepository,
            DefensePracticeRepository practiceRepository
    ) {
        this.userAccountRepository = userAccountRepository;
        this.ideaRepository = ideaRepository;
        this.practiceRepository = practiceRepository;
    }

    @Transactional(readOnly = true)
    public List<DefensePracticeRecord> listOwned(String accountName) {
        return practiceRepository.findAllByUserIdOrderByCreatedAtDesc(resolveUserId(accountName));
    }

    @Transactional
    public DefensePracticeRecord save(
            String accountName,
            String clientPracticeId,
            String ideaId,
            String contentJson,
            String visibility
    ) {
        String userId = resolveUserId(accountName);
        if (ideaRepository.findByIdAndUserId(ideaId, userId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "创意不存在");
        }
        DefensePracticeRecord practice = practiceRepository
                .findByUserIdAndClientPracticeId(userId, clientPracticeId)
                .orElse(null);
        if (practice == null) {
            return practiceRepository.save(DefensePracticeRecord.create(
                    userId,
                    ideaId,
                    clientPracticeId,
                    contentJson,
                    visibility
            ));
        }
        if (!practice.getIdeaId().equals(ideaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "同一答辩记录不能绑定到不同创意");
        }
        practice.update(contentJson, visibility);
        return practice;
    }

    private String resolveUserId(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"))
                .getId();
    }
}
