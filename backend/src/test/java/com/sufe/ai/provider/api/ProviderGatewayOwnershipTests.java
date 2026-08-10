package com.sufe.ai.provider.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = "sufe.providers.workbuddy.enabled=true")
@AutoConfigureMockMvc
@Transactional
class ProviderGatewayOwnershipTests {

    private static final String PASSWORD = "correct-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private WorkBuddyClient workBuddyClient;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-WORKBUDDY-OWNER",
                "owner@test.local",
                passwordEncoder.encode(PASSWORD),
                UserRole.STUDENT,
                "WorkBuddy owner",
                "student",
                100
        ));
    }

    @Test
    void directGatewayNeverCallsWorkBuddyEvenWhenProviderIsEnabled() throws Exception {
        Cookie session = login();

        mockMvc.perform(post("/api/provider/workbuddy/runs")
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("{\"text\":\"render video\"}"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("WORKBUDDY_DIRECT_GATEWAY_REMOVED"));

        mockMvc.perform(get("/api/provider/workbuddy/runs/run-001").cookie(session))
                .andExpect(status().isGone());
        mockMvc.perform(get("/api/provider/workbuddy/runs/run-001/result").cookie(session))
                .andExpect(status().isGone());

        verifyNoInteractions(workBuddyClient);
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"owner@test.local\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
