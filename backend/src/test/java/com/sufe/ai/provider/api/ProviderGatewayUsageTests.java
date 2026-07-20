package com.sufe.ai.provider.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.lexiang.LexiangAiQaClient;
import com.sufe.ai.provider.lexiang.LexiangQaResult;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import com.sufe.ai.usage.domain.AiUsageRecord;
import com.sufe.ai.usage.repository.AiUsageRecordRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "sufe.providers.workbuddy.enabled=true",
        "sufe.providers.workbuddy.jobs-root=target/workbuddy-usage-tests",
        "sufe.providers.lexiang.enabled=true",
        "sufe.providers.lexiang.app-key=test-app-key",
        "sufe.providers.lexiang.app-secret=test-app-secret"
})
@AutoConfigureMockMvc
@Transactional
class ProviderGatewayUsageTests {

    private static final String ACCOUNT = "usage-provider@test.local";
    private static final String PASSWORD = "correct-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AiUsageRecordRepository usageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private WorkBuddyClient workBuddyClient;

    @MockitoBean
    private LexiangAiQaClient lexiangAiQaClient;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-PROVIDER-USAGE",
                ACCOUNT,
                passwordEncoder.encode(PASSWORD),
                UserRole.STUDENT,
                "供应商用量测试用户",
                "学生",
                100
        ));
    }

    @Test
    void persistsOnlyExplicitVerifiedUsageAndDeduplicatesProviderRequest() throws Exception {
        VerifiedProviderUsage workBuddyUsage = new VerifiedProviderUsage(
                "wb-request-001", "wb-confirmed-model", 120, 30
        );
        when(workBuddyClient.submit(anyString(), any()))
                .thenReturn(new WorkBuddyClient.RunSubmission("run-usage-001", Optional.of(workBuddyUsage)));
        when(workBuddyClient.getRun("run-usage-001"))
                .thenReturn(new WorkBuddyClient.RunStatus(
                        "run-usage-001",
                        new ObjectMapper().createObjectNode(),
                        Optional.of(workBuddyUsage)
                ));
        when(lexiangAiQaClient.ask(any()))
                .thenReturn(new LexiangQaResult(
                        "已生成 PPT 内容",
                        "lexiang-session-001",
                        List.of(),
                        Optional.of(new VerifiedProviderUsage(
                                "lexiang-request-001", "lexiang-confirmed-model", 200, 80
                        ))
                ));

        Cookie session = login();
        mockMvc.perform(post("/api/provider/workbuddy/runs")
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("{\"text\":\"生成视频\"}"))
                .andExpect(status().isAccepted());
        mockMvc.perform(get("/api/provider/workbuddy/runs/run-usage-001").cookie(session))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/provider/lexiang/qa")
                        .with(csrf())
                        .cookie(session)
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
                .andExpect(status().isOk());

        List<AiUsageRecord> records = usageRepository.findAllByOrderByRecordedAtDesc();
        assertThat(records).hasSize(2);
        assertThat(records).extracting(AiUsageRecord::getProvider)
                .containsExactlyInAnyOrder(GenerationProvider.WORKBUDDY, GenerationProvider.LEXIANG);
        assertThat(records).filteredOn(record -> record.getProvider() == GenerationProvider.WORKBUDDY)
                .singleElement()
                .satisfies(record -> {
                    assertThat(record.getRequestId()).isEqualTo("wb-request-001");
                    assertThat(record.getInputTokens()).isEqualTo(120);
                    assertThat(record.getOutputTokens()).isEqualTo(30);
                });
    }

    @Test
    void doesNotPersistUsageWhenProviderDoesNotReportIt() throws Exception {
        when(lexiangAiQaClient.ask(any()))
                .thenReturn(new LexiangQaResult("生成内容", "session-without-usage", List.of()));

        mockMvc.perform(post("/api/provider/lexiang/qa")
                        .with(csrf())
                        .cookie(login())
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
                .andExpect(status().isOk());

        assertThat(usageRepository.count()).isZero();
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"" + ACCOUNT + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
