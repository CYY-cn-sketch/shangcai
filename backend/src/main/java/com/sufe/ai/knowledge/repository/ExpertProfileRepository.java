package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.ExpertProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExpertProfileRepository extends JpaRepository<ExpertProfile, String> {

    Optional<ExpertProfile> findByName(String name);
}
