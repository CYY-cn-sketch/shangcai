package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(properties = "sufe.bootstrap.starter-content-enabled=true")
class StarterContentInitializerTests {

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private KnowledgeAssetRepository knowledgeAssetRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSkillRepository expertSkillRepository;

    @Autowired
    private ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Test
    void persistsStarterKnowledgeFilesAndPromptAlignedExperts() {
        assertThat(knowledgeBaseRepository.findByCategory("创业方法")).isPresent();

        var brainstormAsset = knowledgeAssetRepository.findFirstByNameOrderByCreatedAtAsc("创意头脑风暴方法与创意方向卡.md").orElseThrow();
        var positioningAsset = knowledgeAssetRepository.findFirstByNameOrderByCreatedAtAsc("项目定位与价值主张工作表.md").orElseThrow();
        assertThat(brainstormAsset.hasFile()).isTrue();
        assertThat(positioningAsset.hasFile()).isTrue();
        assertThat(fileStorageService.load(brainstormAsset.getStorageKey()).exists()).isTrue();
        assertThat(fileStorageService.load(positioningAsset.getStorageKey()).exists()).isTrue();

        var brainstorm = expertProfileRepository.findById("brainstorm").orElseThrow();
        var positioning = expertProfileRepository.findById("positioning").orElseThrow();
        assertThat(brainstorm.getSystemPrompt()).contains("创意方向卡");
        assertThat(brainstorm.getUserPrompt()).contains("knowledge_context");
        assertThat(positioning.getSystemPrompt()).contains("MVP");
        assertThat(positioning.getUserPrompt()).contains("creative_direction_card");
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("brainstorm")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("positioning")).hasSize(3);
        assertThat(expertKnowledgeRouteRepository.findByExpertId("brainstorm"))
                .extracting("category")
                .containsExactlyInAnyOrder("创业方法", "创业案例");
    }
}
