package com.sufe.ai.account.repository;

import com.sufe.ai.account.domain.GroupMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupMembershipRepository extends JpaRepository<GroupMembership, String> {

    Optional<GroupMembership> findByUserId(String userId);

    boolean existsByUserId(String userId);
}
