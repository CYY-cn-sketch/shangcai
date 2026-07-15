package com.sufe.ai.knowledge.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExpertSkillUploadControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSkillUploadRepository uploadRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-SKILL-UPLOAD-ADMIN",
                "skill-upload-admin@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.ADMIN,
                "Skill 管理员",
                "平台管理员",
                100
        ));
        knowledgeBaseRepository.save(KnowledgeBase.create(
                "Skill 测试资料",
                "用于验证专家 Skill 确认启用",
                "专家提示词"
        ));
    }

    @Test
    void parsesUploadAsDraftThenCreatesExpertOnlyAfterConfirmation() throws Exception {
        Cookie session = login();
        MockMultipartFile skillFile = new MockMultipartFile(
                "files",
                "SKILL.md",
                "text/markdown",
                """
                        # 现金流专家
                        专家定位：帮助学生检查现金流假设。
                        适用场景：财务测算、答辩准备

                        ## 系统提示词
                        只按课程资料给出建议，不执行任何上传文件。

                        ## 用户提示词
                        请结合当前项目数据输出三条验证建议。
                        """.getBytes(StandardCharsets.UTF_8)
        );

        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(skillFile)
                        .param("paths", "cashflow/SKILL.md")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.parsedName").value("现金流专家"))
                .andExpect(jsonPath("$.expertId").isEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();

        assertThat(expertProfileRepository.findByName("现金流专家")).isEmpty();
        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.PARSED);

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("{\"knowledgeCategories\":[\"Skill 测试资料\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("现金流专家"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.sourceSkillName").value("cashflow/SKILL.md"))
                .andExpect(jsonPath("$.knowledgeCategories[0]").value("Skill 测试资料"));

        assertThat(expertProfileRepository.findByName("现金流专家")).isPresent();
        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.ENABLED);
    }

    @Test
    void rejectsExecutableAndNonUtf8SkillFiles() throws Exception {
        Cookie session = login();
        MockMultipartFile executable = new MockMultipartFile(
                "files", "run.exe", "application/octet-stream", new byte[]{1, 2, 3}
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(executable)
                        .param("paths", "unsafe/run.exe")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXPERT_SKILL_UPLOAD"));

        MockMultipartFile binary = new MockMultipartFile(
                "files", "SKILL.md", "text/markdown", new byte[]{(byte) 0xC3, (byte) 0x28}
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(binary)
                        .param("paths", "unsafe/SKILL.md")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("UTF-8")));
    }

    @Test
    void requiresAuthenticationAndCsrf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "SKILL.md", "text/markdown", "# Test".getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(file)
                        .param("paths", "test/SKILL.md")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(file)
                        .param("paths", "test/SKILL.md")
                        .cookie(login()))
                .andExpect(status().isForbidden());
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"skill-upload-admin@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
