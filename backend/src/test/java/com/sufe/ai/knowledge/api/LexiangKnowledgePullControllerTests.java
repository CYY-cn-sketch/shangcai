package com.sufe.ai.knowledge.api;

import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LexiangKnowledgePullControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private KnowledgeBaseRepository baseRepository;

    @Autowired
    private ExpertProfileRepository expertRepository;

    @Test
    @WithMockUser(username = "teacher@test.local", roles = "TEACHER")
    void teacherConfiguresOnlyCourseSharedMappingsAndCanReadThem() throws Exception {
        KnowledgeBase courseBase = baseRepository.saveAndFlush(
                KnowledgeBase.create("同步课程库", "课程共享资料", "全部专家")
        );
        expertRepository.saveAndFlush(ExpertProfile.create(
                "expert-test", "测试专家", "测试角色", "测试场景", "#0f7b73"
        ));
        KnowledgeBase expertBase = baseRepository.saveAndFlush(
                KnowledgeBase.createExpertPrivate("专家专属库", "Skill 资料", "专家", "expert-test")
        );

        mockMvc.perform(put("/api/knowledge/lexiang/mappings")
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "baseId": "%s",
                                  "spaceId": "space_course_1",
                                  "parentEntryId": "folder_course_1",
                                  "enabled": true
                                }
                                """.formatted(courseBase.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseId").value(courseBase.getId()))
                .andExpect(jsonPath("$.spaceId").value("space_course_1"))
                .andExpect(jsonPath("$.parentEntryId").value("folder_course_1"))
                .andExpect(jsonPath("$.enabled").value(true));

        mockMvc.perform(get("/api/knowledge/lexiang/mappings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].baseId").value(courseBase.getId()));

        mockMvc.perform(put("/api/knowledge/lexiang/mappings")
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "baseId": "%s",
                                  "spaceId": "space_expert_1",
                                  "parentEntryId": "folder_expert_1",
                                  "enabled": true
                                }
                                """.formatted(expertBase.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("LEXIANG_MAPPING_SCOPE_FORBIDDEN"));
    }

    @Test
    @WithMockUser(username = "admin@test.local", roles = "ADMIN")
    void disabledVendorReturnsNotConfiguredWithoutCallingLexiang() throws Exception {
        mockMvc.perform(post("/api/knowledge/lexiang/pull").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false))
                .andExpect(jsonPath("$.status").value("NOT_CONFIGURED"));
    }

    @Test
    @WithMockUser(username = "student@test.local", roles = "STUDENT")
    void studentCannotManageLexiangMappings() throws Exception {
        mockMvc.perform(get("/api/knowledge/lexiang/mappings"))
                .andExpect(status().isForbidden());
    }
}
