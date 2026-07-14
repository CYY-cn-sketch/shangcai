package com.sufe.ai.account.service;

import com.sufe.ai.account.config.BootstrapProperties;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DemoDataInitializerTests {

    @Test
    void preservesProfileAndPasswordForExistingDemoAccounts() {
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
        ProjectGroupRepository projectGroupRepository = mock(ProjectGroupRepository.class);
        GroupMembershipRepository groupMembershipRepository = mock(GroupMembershipRepository.class);
        StudentIdeaRepository studentIdeaRepository = mock(StudentIdeaRepository.class);
        ArtifactRecordRepository artifactRecordRepository = mock(ArtifactRecordRepository.class);
        ArtifactSubmissionRepository artifactSubmissionRepository = mock(ArtifactSubmissionRepository.class);
        UserAccount existing = UserAccount.create(
                "existing-user",
                "student@sufe.demo",
                "user-changed-password-hash",
                UserRole.STUDENT,
                "用户自定义昵称",
                "商学院创业实践课学生",
                260
        );

        when(passwordEncoder.encode("demo-password")).thenReturn("bootstrap-password-hash");
        when(userAccountRepository.findByAccountIgnoreCase(anyString())).thenReturn(Optional.of(existing));
        when(projectGroupRepository.findById(anyString()))
                .thenReturn(Optional.of(ProjectGroup.create("existing-group", "已有小组", "已有项目")));
        when(groupMembershipRepository.existsByUserId(existing.getId())).thenReturn(true);
        StudentIdea demoIdea = StudentIdea.create(existing.getId(), "AI 就业教练", "已有演示创意", "商业计划书 BP");
        ArtifactRecord demoArtifact = ArtifactRecord.create(
                existing.getId(), demoIdea.getId(), "demo-midterm-bp-v1", "BP", "已有演示成果", "摘要", "[]"
        );
        when(studentIdeaRepository.findAllByUserIdOrderByUpdatedAtDesc(existing.getId())).thenReturn(List.of(demoIdea));
        when(artifactRecordRepository.findByUserIdAndSourceMessageId(existing.getId(), "demo-midterm-bp-v1"))
                .thenReturn(Optional.of(demoArtifact));
        when(artifactSubmissionRepository.existsByArtifactId(demoArtifact.getId())).thenReturn(true);

        DemoDataInitializer initializer = new DemoDataInitializer(
                new BootstrapProperties(true, "demo-password"),
                passwordEncoder,
                userAccountRepository,
                projectGroupRepository,
                groupMembershipRepository,
                studentIdeaRepository,
                artifactRecordRepository,
                artifactSubmissionRepository
        );

        initializer.run(new DefaultApplicationArguments());

        assertThat(existing.getDisplayName()).isEqualTo("用户自定义昵称");
        assertThat(existing.getPasswordHash()).isEqualTo("user-changed-password-hash");
        verify(userAccountRepository, never()).save(existing);
    }
}
