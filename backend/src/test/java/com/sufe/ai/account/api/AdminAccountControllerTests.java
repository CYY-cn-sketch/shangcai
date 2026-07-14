package com.sufe.ai.account.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminAccountControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository projectGroupRepository;

    @Autowired
    private GroupMembershipRepository groupMembershipRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private ProjectGroup group;

    @BeforeEach
    void setUp() {
        group = projectGroupRepository.save(ProjectGroup.create("G-ADMIN-TEST", "测试组", "测试项目"));
        userAccountRepository.save(UserAccount.create(
                "U-ADMIN-TEST",
                "admin@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.ADMIN,
                "测试管理员",
                "平台管理员",
                100
        ));
    }

    @Test
    void adminCreatesListsUpdatesAndDeletesStudentAccount() throws Exception {
        Cookie sessionCookie = loginAsAdmin();

        String accountJson = mockMvc.perform(post("/api/admin/accounts")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "account": "new-student@test.local",
                                  "password": "new-password",
                                  "role": "STUDENT",
                                  "displayName": "新学生",
                                  "title": "创业实践课学生",
                                  "quotaRemaining": 80,
                                  "groupId": "G-ADMIN-TEST"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.account").value("new-student@test.local"))
                .andExpect(jsonPath("$.groupId").value("G-ADMIN-TEST"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String accountId = objectMapper.readTree(accountJson).path("id").asText();

        mockMvc.perform(get("/api/admin/accounts").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.account == 'new-student@test.local')]").exists());

        mockMvc.perform(patch("/api/admin/accounts/{accountId}", accountId)
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "role": "TEACHER",
                                  "displayName": "新教师",
                                  "title": "课程教师",
                                  "status": "ACTIVE",
                                  "quotaRemaining": 120
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TEACHER"))
                .andExpect(jsonPath("$.groupId").doesNotExist());

        assertThat(groupMembershipRepository.findByUserId(accountId)).isEmpty();

        mockMvc.perform(delete("/api/admin/accounts/{accountId}", accountId)
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        assertThat(userAccountRepository.findById(accountId)).isEmpty();
    }

    @Test
    void studentCannotUseAdminEndpoints() throws Exception {
        UserAccount student = userAccountRepository.save(UserAccount.create(
                "U-STUDENT-TEST",
                "student-admin-api@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "测试学生",
                "创业实践课学生",
                50
        ));
        groupMembershipRepository.save(GroupMembership.create("M-STUDENT-TEST", student.getId(), group.getId()));
        Cookie sessionCookie = login("student-admin-api@test.local");

        mockMvc.perform(get("/api/admin/accounts").cookie(sessionCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCreatesAndDeletesEmptyGroupButCannotDeleteGroupWithMembers() throws Exception {
        Cookie sessionCookie = loginAsAdmin();

        String groupJson = mockMvc.perform(post("/api/admin/groups")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "groupLabel": "第 99 组",
                                  "projectName": "测试项目组"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberCount").value(0))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode groupResponse = objectMapper.readTree(groupJson);
        String groupId = groupResponse.path("id").asText();

        mockMvc.perform(patch("/api/admin/groups/{groupId}", groupId)
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "groupLabel": "第 99 组",
                                  "projectName": "更新后的项目",
                                  "active": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(delete("/api/admin/groups/{groupId}", groupId)
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        UserAccount student = userAccountRepository.save(UserAccount.create(
                "U-GROUP-MEMBER-TEST",
                "group-member@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "小组成员",
                "创业实践课学生",
                50
        ));
        groupMembershipRepository.save(GroupMembership.create("M-GROUP-MEMBER-TEST", student.getId(), group.getId()));

        mockMvc.perform(delete("/api/admin/groups/{groupId}", group.getId())
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GROUP_HAS_MEMBERS"));
    }

    private Cookie loginAsAdmin() throws Exception {
        return login("admin@test.local");
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
