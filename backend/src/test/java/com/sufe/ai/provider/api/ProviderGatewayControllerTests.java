package com.sufe.ai.provider.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.provider.lexiang.LexiangAiQaClient;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verifyNoInteractions;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProviderGatewayControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private WorkBuddyClient workBuddyClient;

    @MockitoBean
    private LexiangAiQaClient lexiangAiQaClient;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-PROVIDER-TEST",
                "provider@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "供应商网关测试用户",
                "创业实践课学生",
                100
        ));
    }

    @Test
    void rejectsProviderGatewayRequestsWhenVendorsAreDisabled() throws Exception {
        Cookie sessionCookie = login();

        mockMvc.perform(post("/api/provider/workbuddy/runs")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("{\"text\":\"生成视频\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("WORKBUDDY_DISABLED"));

        mockMvc.perform(get("/api/provider/workbuddy/runs/run-001")
                        .cookie(sessionCookie))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("WORKBUDDY_DISABLED"));

        mockMvc.perform(post("/api/provider/lexiang/qa")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "projectId": "project-001",
                                  "conversationId": "conversation-001",
                                  "expertId": "pitch",
                                  "query": "生成 PPT 大纲",
                                  "targets": []
                                }
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("LEXIANG_DISABLED"));

        verifyNoInteractions(workBuddyClient, lexiangAiQaClient);
    }

    @Test
    void requiresAuthenticationBeforeProviderGatewayAccess() throws Exception {
        mockMvc.perform(get("/api/provider/workbuddy/runs/run-001"))
                .andExpect(status().isUnauthorized());
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"provider@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
