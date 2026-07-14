package com.sufe.ai.auth.api;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import jakarta.servlet.http.Cookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository projectGroupRepository;

    @Autowired
    private GroupMembershipRepository groupMembershipRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        ProjectGroup group = projectGroupRepository.save(ProjectGroup.create("G-TEST", "测试组", "测试项目"));
        UserAccount student = userAccountRepository.save(UserAccount.create(
                "U-TEST-STUDENT",
                "student@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "测试学生",
                "创业实践课学生",
                100
        ));
        groupMembershipRepository.save(GroupMembership.create("M-TEST", student.getId(), group.getId()));
    }

    @Test
    void logsInAndReturnsDatabaseBackedSession() throws Exception {
        Cookie sessionCookie = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"student@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("student"))
                .andExpect(jsonPath("$.groupId").value("G-TEST"))
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");

        mockMvc.perform(get("/api/auth/me").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.account").value("student@test.local"))
                .andExpect(jsonPath("$.name").value("测试学生"));
    }

    @Test
    void rejectsWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"student@test.local\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void requiresAuthenticationAndRoleAuthorization() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        Cookie sessionCookie = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"student@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");

        mockMvc.perform(get("/api/admin/not-created-yet").cookie(sessionCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsStateChangingRequestWithoutCsrfToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"account\":\"student@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidatesSessionOnLogout() throws Exception {
        Cookie sessionCookie = login();

        mockMvc.perform(post("/api/auth/logout")
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").cookie(sessionCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updatesDisplayNameAndPassword() throws Exception {
        Cookie sessionCookie = login();

        mockMvc.perform(patch("/api/auth/me")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "displayName": "更新后的学生",
                                  "currentPassword": "correct-password",
                                  "newPassword": "new-password"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("更新后的学生"))
                .andExpect(jsonPath("$.account").value("student@test.local"));

        UserAccount updatedUser = userAccountRepository.findByAccountIgnoreCase("student@test.local").orElseThrow();
        assertEquals("更新后的学生", updatedUser.getDisplayName());
        assertTrue(passwordEncoder.matches("new-password", updatedUser.getPasswordHash()));
        assertFalse(passwordEncoder.matches("correct-password", updatedUser.getPasswordHash()));
    }

    @Test
    void rejectsInvalidCurrentPasswordWithoutUpdatingProfile() throws Exception {
        Cookie sessionCookie = login();

        mockMvc.perform(patch("/api/auth/me")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "displayName": "不应保存的姓名",
                                  "currentPassword": "wrong-password",
                                  "newPassword": "new-password"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"))
                .andExpect(jsonPath("$.message").value("原密码不正确"));

        UserAccount unchangedUser = userAccountRepository.findByAccountIgnoreCase("student@test.local").orElseThrow();
        assertEquals("测试学生", unchangedUser.getDisplayName());
        assertTrue(passwordEncoder.matches("correct-password", unchangedUser.getPasswordHash()));
    }

    @Test
    void rejectsNewPasswordShorterThanEightCharacters() throws Exception {
        Cookie sessionCookie = login();

        mockMvc.perform(patch("/api/auth/me")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "displayName": "不应保存的姓名",
                                  "currentPassword": "correct-password",
                                  "newPassword": "short"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NEW_PASSWORD_TOO_SHORT"))
                .andExpect(jsonPath("$.message").value("新密码至少需要 8 位"));

        UserAccount unchangedUser = userAccountRepository.findByAccountIgnoreCase("student@test.local").orElseThrow();
        assertEquals("测试学生", unchangedUser.getDisplayName());
        assertTrue(passwordEncoder.matches("correct-password", unchangedUser.getPasswordHash()));
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"student@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
