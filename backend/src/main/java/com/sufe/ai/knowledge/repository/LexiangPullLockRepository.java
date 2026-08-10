package com.sufe.ai.knowledge.repository;

import com.sufe.ai.knowledge.domain.LexiangPullLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface LexiangPullLockRepository extends JpaRepository<LexiangPullLock, String> {

    @Modifying
    @Query(value = "DELETE FROM lexiang_pull_lock WHERE lock_key = :lockKey AND expires_at < :now", nativeQuery = true)
    int deleteExpired(@Param("lockKey") String lockKey, @Param("now") Instant now);

    @Modifying
    @Query(value = "DELETE FROM lexiang_pull_lock WHERE lock_key = :lockKey AND owner_id = :ownerId", nativeQuery = true)
    int deleteOwned(@Param("lockKey") String lockKey, @Param("ownerId") String ownerId);
}
