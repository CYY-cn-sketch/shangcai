package com.sufe.ai.account.repository;

import com.sufe.ai.account.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, String> {

    Optional<UserAccount> findByAccountIgnoreCase(String account);
}
