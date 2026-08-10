package com.sufe.ai.account.repository;

import com.sufe.ai.account.domain.AccountPermissionDenial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountPermissionDenialRepository extends JpaRepository<AccountPermissionDenial, String> {

    List<AccountPermissionDenial> findByUserIdOrderByPermissionKey(String userId);

    void deleteByUserId(String userId);
}
