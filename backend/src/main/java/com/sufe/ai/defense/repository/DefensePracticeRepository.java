package com.sufe.ai.defense.repository;

import com.sufe.ai.defense.domain.DefensePracticeRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DefensePracticeRepository extends JpaRepository<DefensePracticeRecord, String> {

    List<DefensePracticeRecord> findAllByUserIdOrderByCreatedAtDesc(String userId);

    Optional<DefensePracticeRecord> findByUserIdAndClientPracticeId(String userId, String clientPracticeId);
}
