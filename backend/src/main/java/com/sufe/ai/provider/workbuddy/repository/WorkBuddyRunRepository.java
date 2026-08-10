package com.sufe.ai.provider.workbuddy.repository;

import com.sufe.ai.provider.workbuddy.domain.WorkBuddyRunRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkBuddyRunRepository extends JpaRepository<WorkBuddyRunRecord, String> {

    Optional<WorkBuddyRunRecord> findByRunIdAndUserId(String runId, String userId);
}
