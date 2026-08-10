package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.LexiangPullRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LexiangPullRunRepository extends JpaRepository<LexiangPullRun, String> {
    Optional<LexiangPullRun> findFirstByOrderByStartedAtDesc();
}
