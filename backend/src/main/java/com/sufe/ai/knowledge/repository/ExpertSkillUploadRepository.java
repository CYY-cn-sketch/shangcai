package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface ExpertSkillUploadRepository extends JpaRepository<ExpertSkillUploadRecord, String> {

    List<ExpertSkillUploadRecord> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select upload from ExpertSkillUploadRecord upload where upload.id = :id")
    Optional<ExpertSkillUploadRecord> findByIdForUpdate(String id);
}
