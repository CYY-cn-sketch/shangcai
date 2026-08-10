package com.sufe.ai.artifact.service;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:sufe-ai-artifact-concurrency;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ArtifactSubmissionConcurrencyTests {

    private static final String STUDENT_ACCOUNT = "artifact-lock-student@test.local";
    private static final String TEACHER_ACCOUNT = "artifact-lock-teacher@test.local";

    @Autowired
    private ArtifactService artifactService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository groupRepository;

    @Autowired
    private GroupMembershipRepository membershipRepository;

    @Autowired
    private StudentIdeaRepository ideaRepository;

    @Autowired
    private ArtifactSubmissionRepository submissionRepository;

    @Test
    void neverApprovesAnOldVersionWhileCreatingItsReplacement() throws Exception {
        UserAccount student = userAccountRepository.saveAndFlush(UserAccount.create(
                "U-ARTIFACT-LOCK-STUDENT",
                STUDENT_ACCOUNT,
                "unused",
                UserRole.STUDENT,
                "并发成果学生",
                "学生",
                100
        ));
        userAccountRepository.saveAndFlush(UserAccount.create(
                "U-ARTIFACT-LOCK-TEACHER",
                TEACHER_ACCOUNT,
                "unused",
                UserRole.TEACHER,
                "并发成果教师",
                "教师",
                100
        ));
        ProjectGroup group = groupRepository.saveAndFlush(ProjectGroup.create(
                "G-ARTIFACT-LOCK", "第 19 组", "并发成果项目"
        ));
        membershipRepository.saveAndFlush(GroupMembership.create(
                "M-ARTIFACT-LOCK", student.getId(), group.getId()
        ));
        StudentIdea idea = ideaRepository.saveAndFlush(StudentIdea.create(
                student.getId(), "并发审核创意", "验证审核和重提串行化", "BP"
        ));
        ArtifactRecord artifact = artifactService.saveArtifact(
                STUDENT_ACCOUNT,
                new ArtifactService.SaveArtifactCommand(
                        idea.getId(),
                        "artifact-lock-message",
                        "BP",
                        "并发商业计划书",
                        "第一版",
                        "{\"version\":1}"
                )
        );
        ArtifactSubmission versionOne = artifactService.submitArtifact(STUDENT_ACCOUNT, artifact.getId()).submission();
        artifactService.reviewSubmission(
                TEACHER_ACCOUNT,
                versionOne.getId(),
                new ArtifactService.ReviewCommand(SubmissionStatus.REVISION, "请修改后重提", false)
        );

        List<Throwable> outcomes = runConcurrently(
                () -> artifactService.reviewSubmission(
                        TEACHER_ACCOUNT,
                        versionOne.getId(),
                        new ArtifactService.ReviewCommand(SubmissionStatus.APPROVED, "审核通过", false)
                ),
                () -> artifactService.submitArtifact(STUDENT_ACCOUNT, artifact.getId())
        );

        assertThat(outcomes).filteredOn(SuccessfulOperation.class::isInstance).hasSize(1);
        assertThat(outcomes).filteredOn(ArtifactConflictException.class::isInstance).hasSize(1);
        List<ArtifactSubmission> versions = submissionRepository.findAll().stream()
                .filter(submission -> artifact.getId().equals(submission.getArtifactId()))
                .toList();
        if (versions.size() == 2) {
            ArtifactSubmission persistedVersionOne = submissionRepository.findById(versionOne.getId()).orElseThrow();
            assertThat(persistedVersionOne.getStatus()).isEqualTo(SubmissionStatus.REVISION);
            assertThat(versions).filteredOn(version -> version.getSubmissionVersion() == 2)
                    .singleElement()
                    .satisfies(version -> assertThat(version.getStatus()).isEqualTo(SubmissionStatus.PENDING));
        } else {
            assertThat(versions).hasSize(1);
            assertThat(versions.getFirst().getStatus()).isEqualTo(SubmissionStatus.APPROVED);
        }
    }

    private static List<Throwable> runConcurrently(Runnable first, Runnable second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Throwable> firstResult = executor.submit(task(first, ready, start));
            Future<Throwable> secondResult = executor.submit(task(second, ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(firstResult.get(10, TimeUnit.SECONDS), secondResult.get(10, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private static Callable<Throwable> task(Runnable action, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            start.await(5, TimeUnit.SECONDS);
            try {
                action.run();
                return new SuccessfulOperation();
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private static final class SuccessfulOperation extends RuntimeException {
    }
}
