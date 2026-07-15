package com.sufe.ai.provider.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import com.sufe.ai.provider.workbuddy.repository.WorkBuddyRunRepository;
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

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "sufe.providers.workbuddy.enabled=true",
        "sufe.providers.workbuddy.jobs-root=target/workbuddy-gateway-tests"
})
@AutoConfigureMockMvc
@Transactional
class ProviderGatewayOwnershipTests {

    private static final String PASSWORD = "correct-password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private WorkBuddyRunRepository workBuddyRunRepository;

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
                "任务所有者",
                "学生",
                100
        ));
        userAccountRepository.save(UserAccount.create(
                "U-WORKBUDDY-OTHER",
                "other@test.local",
                passwordEncoder.encode(PASSWORD),
                UserRole.STUDENT,
                "其他学生",
                "学生",
                100
        ));
    }

    @Test
    void isolatesTaskDirectoryAndRejectsOtherUsersRunStatusQuery() throws Exception {
        when(workBuddyClient.submit(anyString(), any()))
                .thenReturn(new WorkBuddyClient.RunSubmission("run-owned-001"));
        when(workBuddyClient.getRun("run-owned-001"))
                .thenReturn(new WorkBuddyClient.RunStatus("run-owned-001", new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode()));

        Cookie ownerSession = login("owner@test.local");
        mockMvc.perform(post("/api/provider/workbuddy/runs")
                        .with(csrf())
                        .cookie(ownerSession)
                        .contentType("application/json")
                        .content("{\"text\":\"生成宣传视频\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.runId").value("run-owned-001"));

        Cookie otherSession = login("other@test.local");
        mockMvc.perform(get("/api/provider/workbuddy/runs/run-owned-001")
                        .cookie(otherSession))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WORKBUDDY_RUN_NOT_FOUND"));
        verify(workBuddyClient, never()).getRun(anyString());

        mockMvc.perform(get("/api/provider/workbuddy/runs/run-owned-001/result")
                        .cookie(otherSession))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("WORKBUDDY_RESULT_NOT_FOUND"));

        mockMvc.perform(get("/api/provider/workbuddy/runs/run-owned-001")
                        .cookie(ownerSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value("run-owned-001"));
        verify(workBuddyClient).getRun("run-owned-001");

        Path resultPath = Path.of("target/workbuddy-gateway-tests")
                .toAbsolutePath()
                .normalize()
                .resolve(workBuddyRunRepository.findByRunIdAndUserId("run-owned-001", "U-WORKBUDDY-OWNER")
                        .orElseThrow()
                        .getOutputPath());
        Files.write(resultPath, new byte[2048]);

        mockMvc.perform(get("/api/provider/workbuddy/runs/run-owned-001/result")
                        .cookie(ownerSession))
                .andExpect(status().isOk())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(content().bytes(new byte[2048]));
    }

    private Cookie login(String account) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"" + account + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
