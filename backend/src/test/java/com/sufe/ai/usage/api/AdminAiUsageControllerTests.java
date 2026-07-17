package com.sufe.ai.usage.api;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.usage.service.AiUsageService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminAiUsageControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository projectGroupRepository;

    @Autowired
    private GroupMembershipRepository membershipRepository;

    @Autowired
    private AiUsageService usageService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UserAccount firstStudent;
    private UserAccount secondStudent;

    @BeforeEach
    void setUp() {
        ProjectGroup group = projectGroupRepository.save(ProjectGroup.create("G-USAGE-TEST", "第 1 组", "校园低碳项目"));
        userAccountRepository.save(UserAccount.create(
                "U-USAGE-ADMIN",
                "usage-admin@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.ADMIN,
                "用量管理员",
                "平台管理员",
                100
        ));
        firstStudent = userAccountRepository.save(UserAccount.create(
                "U-USAGE-STUDENT-1",
                "usage-student-1@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "张同学",
                "创业实践课学生",
                100
        ));
        secondStudent = userAccountRepository.save(UserAccount.create(
                "U-USAGE-STUDENT-2",
                "usage-student-2@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "李同学",
                "创业实践课学生",
                100
        ));
        membershipRepository.save(GroupMembership.create("M-USAGE-1", firstStudent.getId(), group.getId()));
        membershipRepository.save(GroupMembership.create("M-USAGE-2", secondStudent.getId(), group.getId()));

        usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                firstStudent.getId(), GenerationProvider.LEXIANG, "confirmed-model", "EXPERT_CHAT", "usage-request-1", 120, 30
        ));
        usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                secondStudent.getId(), GenerationProvider.WORKBUDDY, null, "VIDEO", "usage-request-2", 200, 80
        ));
    }

    @Test
    void adminReadsUsageByUserAndGroup() throws Exception {
        Cookie adminSession = login("usage-admin@test.local");

        mockMvc.perform(get("/api/admin/ai-usage")
                        .param("range", "LAST_30_DAYS")
                        .cookie(adminSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.callCount").value(2))
                .andExpect(jsonPath("$.summary.inputTokens").value(320))
                .andExpect(jsonPath("$.summary.outputTokens").value(110))
                .andExpect(jsonPath("$.summary.totalTokens").value(430))
                .andExpect(jsonPath("$.summary.activeUserCount").value(2))
                .andExpect(jsonPath("$.summary.activeGroupCount").value(1))
                .andExpect(jsonPath("$.users[0].displayName").value("李同学"))
                .andExpect(jsonPath("$.groups[0].groupLabel").value("第 1 组"))
                .andExpect(jsonPath("$.groups[0].memberCount").value(2))
                .andExpect(jsonPath("$.groups[0].totalTokens").value(430));
    }

    @Test
    void studentCannotReadUsageReport() throws Exception {
        Cookie studentSession = login(firstStudent.getAccount());

        mockMvc.perform(get("/api/admin/ai-usage").cookie(studentSession))
                .andExpect(status().isForbidden());
    }

    private Cookie login(String account) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"" + account + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
