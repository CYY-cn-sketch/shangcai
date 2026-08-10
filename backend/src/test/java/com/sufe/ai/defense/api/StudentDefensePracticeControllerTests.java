package com.sufe.ai.defense.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.defense.repository.DefensePracticeRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentDefensePracticeControllerTests {

    private static final String STUDENT_ACCOUNT = "defense-student@test.local";
    private static final String STUDENT_ID = "U-DEFENSE-STUDENT";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentIdeaRepository ideaRepository;

    @Autowired
    private DefensePracticeRepository practiceRepository;

    private String ideaId;
    private String otherIdeaId;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                STUDENT_ID,
                STUDENT_ACCOUNT,
                "unused-password-hash",
                UserRole.STUDENT,
                "答辩学生",
                "创业实践课学生",
                100
        ));
        userAccountRepository.save(UserAccount.create(
                "U-DEFENSE-OTHER",
                "defense-other@test.local",
                "unused-password-hash",
                UserRole.STUDENT,
                "其他学生",
                "创业实践课学生",
                100
        ));
        ideaId = ideaRepository.save(StudentIdea.create(
                STUDENT_ID,
                "答辩项目",
                "用于验证答辩记录持久化",
                "答辩准备"
        )).getId();
        otherIdeaId = ideaRepository.save(StudentIdea.create(
                "U-DEFENSE-OTHER",
                "其他项目",
                "不属于当前学生",
                "答辩准备"
        )).getId();
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void upsertsAndListsOwnedDefensePractice() throws Exception {
        mockMvc.perform(put("/api/student/defense-practices/D-12345")
                        .with(csrf())
                        .contentType("application/json")
                        .content(requestBody(ideaId, "self", "第一版回答")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("D-12345"))
                .andExpect(jsonPath("$.visibility").value("self"))
                .andExpect(jsonPath("$.content.transcript[0].content").value("第一版回答"));

        mockMvc.perform(put("/api/student/defense-practices/D-12345")
                        .with(csrf())
                        .contentType("application/json")
                        .content(requestBody(ideaId, "teacher", "更新后的回答")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("teacher"));

        mockMvc.perform(get("/api/student/defense-practices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("D-12345"))
                .andExpect(jsonPath("$[0].content.transcript[0].content").value("更新后的回答"));

        assertThat(practiceRepository.findAll()).hasSize(1);
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void rejectsPracticeForAnotherStudentsIdea() throws Exception {
        mockMvc.perform(put("/api/student/defense-practices/D-OTHER")
                        .with(csrf())
                        .contentType("application/json")
                        .content(requestBody(otherIdeaId, "self", "越权回答")))
                .andExpect(status().isNotFound());
    }

    private static String requestBody(String ideaId, String visibility, String answer) {
        return """
                {
                  "ideaId": "%s",
                  "visibility": "%s",
                  "content": {
                    "id": "D-12345",
                    "ideaId": "%s",
                    "basis": "BP + PPT + 路演稿",
                    "scripts": {"1分钟": "稿件", "3分钟": "稿件", "5分钟": "稿件"},
                    "questions": ["问题"],
                    "answerSuggestions": ["建议"],
                    "expressionTips": ["提示"],
                    "transcript": [{"id": "DT-1", "sender": "student", "content": "%s", "createdAt": "10:00"}],
                    "evaluation": [],
                    "visibility": "%s",
                    "createdAt": "2026-07-15 10:00"
                  }
                }
                """.formatted(ideaId, visibility, ideaId, answer, visibility);
    }
}
