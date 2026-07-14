package com.sufe.ai.account.service;

import com.sufe.ai.account.config.BootstrapProperties;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Profile({"local", "mysql-local"})
public class DemoDataInitializer implements ApplicationRunner {

    private final BootstrapProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final UserAccountRepository userAccountRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final GroupMembershipRepository groupMembershipRepository;

    public DemoDataInitializer(
            BootstrapProperties properties,
            PasswordEncoder passwordEncoder,
            UserAccountRepository userAccountRepository,
            ProjectGroupRepository projectGroupRepository,
            GroupMembershipRepository groupMembershipRepository
    ) {
        this.properties = properties;
        this.passwordEncoder = passwordEncoder;
        this.userAccountRepository = userAccountRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.groupMembershipRepository = groupMembershipRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.demoDataEnabled()) {
            return;
        }
        if (properties.demoPassword() == null || properties.demoPassword().isBlank()) {
            throw new IllegalStateException("本地演示数据已启用，但 SUFE_DEMO_PASSWORD 未配置");
        }

        seedGroups();
        String passwordHash = passwordEncoder.encode(properties.demoPassword());
        seedUser("A-STU-001", "student@sufe.demo", passwordHash, UserRole.STUDENT, "陈思源", "商学院创业实践课学生", 260, "G-03");
        seedUser("A-STU-002", "student2@sufe.demo", passwordHash, UserRole.STUDENT, "李若涵", "商学院创业实践课学生", 220, "G-04");
        seedUser("A-STU-003", "student3@sufe.demo", passwordHash, UserRole.STUDENT, "王梓萱", "商学院创业实践课学生", 240, "G-11");
        seedUser("A-STU-004", "student4@sufe.demo", passwordHash, UserRole.STUDENT, "赵一诺", "商学院创业实践课学生", 240, "G-11");
        seedUser("A-STU-005", "student5@sufe.demo", passwordHash, UserRole.STUDENT, "林嘉诚", "商学院创业实践课学生", 220, "G-11");
        seedUser("A-STU-006", "student6@sufe.demo", passwordHash, UserRole.STUDENT, "黄雨桐", "商学院创业实践课学生", 220, "G-11");
        seedUser("A-TEA-001", "teacher@sufe.demo", passwordHash, UserRole.TEACHER, "周老师", "创业实践课程教师", 520, null);
        seedUser("A-ADM-001", "admin@sufe.demo", passwordHash, UserRole.ADMIN, "平台管理员", "教学平台运营管理员", 1500, null);
    }

    private void seedGroups() {
        List<String[]> groups = List.of(
                new String[]{"G-01", "第 1 组", "校园二手循环平台"},
                new String[]{"G-02", "第 2 组", "智能简历诊所"},
                new String[]{"G-03", "第 3 组", "AI 就业教练"},
                new String[]{"G-04", "第 4 组", "商科案例共创库"},
                new String[]{"G-05", "第 5 组", "银发陪诊助手"},
                new String[]{"G-06", "第 6 组", "低碳积分校园平台"},
                new String[]{"G-07", "第 7 组", "实习岗位雷达"},
                new String[]{"G-08", "第 8 组", "校园餐饮排队预测"},
                new String[]{"G-09", "第 9 组", "创业案例智能检索"},
                new String[]{"G-10", "第 10 组", "商学院活动助手"},
                new String[]{"G-11", "第 11 组", "校园创业资源导航"}
        );
        groups.forEach(group -> projectGroupRepository.findById(group[0])
                .orElseGet(() -> projectGroupRepository.save(ProjectGroup.create(group[0], group[1], group[2]))));
    }

    private void seedUser(
            String id,
            String account,
            String passwordHash,
            UserRole role,
            String displayName,
            String title,
            int quota,
            String groupId
    ) {
        UserAccount user = userAccountRepository.findByAccountIgnoreCase(account)
                .orElseGet(() -> userAccountRepository.save(UserAccount.create(id, account, passwordHash, role, displayName, title, quota)));
        if (groupId != null && !groupMembershipRepository.existsByUserId(user.getId())) {
            groupMembershipRepository.save(GroupMembership.create("M-" + user.getId(), user.getId(), groupId));
        }
    }
}
