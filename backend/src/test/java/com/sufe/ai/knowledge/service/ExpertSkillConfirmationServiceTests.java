package com.sufe.ai.knowledge.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class ExpertSkillConfirmationServiceTests {

    private static final String ACTOR_ACCOUNT = "skill-service-test@test.local";

    @Autowired
    private ExpertSkillConfirmationService service;

    @Autowired
    private ExpertSkillUploadRepository uploadRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-SKILL-SERVICE-TEST",
                ACTOR_ACCOUNT,
                "test-password-hash",
                UserRole.ADMIN,
                "Skill 服务测试员",
                "平台管理员",
                100
        ));
    }

    @Test
    void keepsReadableCategoryForShortExpertName() {
        ExpertSkillConfirmationService.ConfirmationResult result = confirm("现金流专家");

        assertThat(result.knowledgeBase().getCategory()).isEqualTo("现金流专家专属知识库");
    }

    @Test
    void addsFullExpertIdWhenLongExpertNamesShareTheSamePrefix() {
        String sharedPrefix = "超".repeat(92);

        ExpertSkillConfirmationService.ConfirmationResult first = confirm(sharedPrefix + "甲");
        ExpertSkillConfirmationService.ConfirmationResult second = confirm(sharedPrefix + "乙");

        String firstCategory = first.knowledgeBase().getCategory();
        String secondCategory = second.knowledgeBase().getCategory();
        assertThat(firstCategory).isNotEqualTo(secondCategory);
        assertLongCategory(firstCategory, first.expert().getId());
        assertLongCategory(secondCategory, second.expert().getId());
    }

    private ExpertSkillConfirmationService.ConfirmationResult confirm(String expertName) {
        ExpertSkillUploadRecord upload = uploadRepository.saveAndFlush(ExpertSkillUploadRecord.parsed(
                ACTOR_ACCOUNT,
                new ExpertSkillUploadRecord.ParsedSkill(
                        "skill-" + UUID.randomUUID(),
                        "skill/SKILL.md",
                        1,
                        "# " + expertName,
                        expertName,
                        "验证专家知识库命名。",
                        "专家创建测试",
                        "#0f7b73",
                        "只执行命名测试。",
                        "组合当前测试输入。",
                        "命名检查",
                        "验证专属知识库命名。",
                        null,
                        null,
                        null
                )
        ));
        return service.confirm(
                upload.getId(),
                new ExpertSkillConfirmationService.ConfirmationCommand(
                        null,
                        expertName,
                        "验证专家知识库命名。",
                        "专家创建测试",
                        "#0f7b73",
                        "命名检查",
                        "验证专属知识库命名。",
                        "只执行命名测试。",
                        "组合当前测试输入。",
                        null,
                        null,
                        null,
                        new ExpertSkillConfirmationService.KnowledgeSelection(
                                ExpertSkillConfirmationService.KnowledgeMode.NONE,
                                null,
                                null
                        ),
                        List.of(),
                        true
                ),
                ACTOR_ACCOUNT
        );
    }

    private static void assertLongCategory(String category, String expertId) {
        assertThat(category.codePointCount(0, category.length())).isLessThanOrEqualTo(100);
        assertThat(category).endsWith("专属知识库-" + expertId);
    }
}
