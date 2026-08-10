package com.sufe.ai.provider.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.lexiang.LexiangAiQaClient;
import com.sufe.ai.provider.lexiang.LexiangQaResult;
import com.sufe.ai.provider.deepseek.DeepSeekChatResult;
import com.sufe.ai.provider.deepseek.DeepSeekExpertChatService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "sufe.providers.workbuddy.enabled=true",
        "sufe.providers.workbuddy.jobs-root=target/workbuddy-usage-tests",
        "sufe.providers.lexiang.enabled=true",
        "sufe.providers.lexiang.app-key=test-app-key",
        "sufe.providers.lexiang.app-secret=test-app-secret",
        "sufe.providers.deepseek.enabled=true",
        "sufe.providers.deepseek.api-key=test-api-key"
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

    @MockitoBean
    private DeepSeekExpertChatService deepSeekExpertChatService;

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
        when(lexiangAiQaClient.ask(any()))
                .thenReturn(new LexiangQaResult(
                        "已生成 PPT 内容",
                        "lexiang-session-001",
                        List.of(),
                        Optional.of(new VerifiedProviderUsage(
                                "lexiang-request-001", "lexiang-confirmed-model", 200, 80
                        ))
                ));
        when(deepSeekExpertChatService.chat(anyString(), anyString(), anyString(), anyString(), any(), any(), any()))
                .thenReturn(new DeepSeekChatResult(
                        "专家分析内容",
                        "deepseek-v4-flash",
                        Optional.of(new VerifiedProviderUsage(
                                "deepseek-request-001", "deepseek-v4-flash", 160, 60
                        ))
                ));

        Cookie session = login();
        mockMvc.perform(post("/api/provider/workbuddy/runs")
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("{\"text\":\"生成视频\"}"))
                .andExpect(status().isGone());
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
        mockMvc.perform(post("/api/provider/deepseek/chat")
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("""
                                {
                                  "ideaId": "idea-001",
                                  "expertId": "positioning",
                                  "clientMessageId": "message-001"
                                }
                                """))
                .andExpect(status().isOk());

        List<AiUsageRecord> records = recordsForTestUser();
        assertThat(records).hasSize(2);
        assertThat(records).extracting(AiUsageRecord::getProvider)
                .containsExactlyInAnyOrder(
                        GenerationProvider.LEXIANG,
                        GenerationProvider.DEEPSEEK
                );
        assertThat(records).filteredOn(record -> record.getProvider() == GenerationProvider.DEEPSEEK)
                .singleElement()
                .satisfies(record -> {
                    assertThat(record.getRequestId()).isEqualTo("deepseek-request-001");
                    assertThat(record.getInputTokens()).isEqualTo(160);
                    assertThat(record.getOutputTokens()).isEqualTo(60);
                });
        assertThat(records).filteredOn(record -> record.getProvider() == GenerationProvider.LEXIANG)
                .singleElement()
                .satisfies(record -> {
                    assertThat(record.getRequestId()).isEqualTo("lexiang-request-001");
                    assertThat(record.getInputTokens()).isEqualTo(200);
                    assertThat(record.getOutputTokens()).isEqualTo(80);
                });
    }

    @Test
    void persistsSuccessfulSupplierCallWithZeroTokensWhenProviderDoesNotReportUsage() throws Exception {
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

        assertThat(recordsForTestUser())
                .singleElement()
                .satisfies(record -> {
                    assertThat(record.getProvider()).isEqualTo(GenerationProvider.LEXIANG);
                    assertThat(record.getOperation()).isEqualTo("PPT_KNOWLEDGE_GENERATION");
                    assertThat(record.getInputTokens()).isZero();
                    assertThat(record.getOutputTokens()).isZero();
                });
    }

    private List<AiUsageRecord> recordsForTestUser() {
        return usageRepository.findAllByOrderByRecordedAtDesc().stream()
                .filter(record -> "U-PROVIDER-USAGE".equals(record.getUserId()))
                .toList();
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
