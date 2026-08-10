package db.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class V26VersionArtifactSubmissionsTests {

    @Test
    void backfillsExistingSubmissionSnapshotsAndAllowsDistinctVersions() throws Exception {
        String url = "jdbc:h2:mem:v26-" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure()
                .dataSource(url, "sa", "")
                .target(MigrationVersion.fromVersion("25"))
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            seedExistingSubmission(connection);
        }

        Flyway.configure().dataSource(url, "sa", "").load().migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            assertThat(number(connection, "SELECT submission_version FROM artifact_submission WHERE id = 'submission-v1'"))
                    .isEqualTo(1);
            assertThat(text(connection, "SELECT artifact_type_snapshot FROM artifact_submission WHERE id = 'submission-v1'"))
                    .isEqualTo("BP");
            assertThat(text(connection, "SELECT artifact_title_snapshot FROM artifact_submission WHERE id = 'submission-v1'"))
                    .isEqualTo("迁移前成果");
            assertThat(text(connection, "SELECT artifact_summary_snapshot FROM artifact_submission WHERE id = 'submission-v1'"))
                    .isEqualTo("迁移前摘要");
            assertThat(text(connection, "SELECT content_json_snapshot FROM artifact_submission WHERE id = 'submission-v1'"))
                    .isEqualTo("[{\"title\":\"迁移内容\"}]");

            insertVersionTwo(connection);
            assertThat(number(connection, "SELECT COUNT(*) FROM artifact_submission WHERE artifact_id = 'artifact-versioned'"))
                    .isEqualTo(2);
            assertThatThrownBy(() -> insertDuplicateVersionOne(connection))
                    .isInstanceOf(SQLException.class);
        }
    }

    private static void seedExistingSubmission(Connection connection) throws Exception {
        execute(connection, """
                INSERT INTO user_account (
                    id, account, password_hash, role, display_name, title, status, quota_remaining, created_at, updated_at
                ) VALUES (
                    'user-versioned', 'versioned@test.local', 'hash', 'STUDENT', '版本学生', '学生', 'ACTIVE', 10,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """);
        execute(connection, """
                INSERT INTO student_idea (id, user_id, title, description, stage, created_at, updated_at)
                VALUES ('idea-versioned', 'user-versioned', '版本创意', '用于迁移测试', 'BP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);
        execute(connection, """
                INSERT INTO artifact_record (
                    id, user_id, idea_id, source_message_id, artifact_type, title, summary, content_json, created_at, updated_at
                ) VALUES (
                    'artifact-versioned', 'user-versioned', 'idea-versioned', 'message-versioned', 'BP',
                    '迁移前成果', '迁移前摘要', '[{\"title\":\"迁移内容\"}]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """);
        execute(connection, """
                INSERT INTO artifact_submission (
                    id, artifact_id, student_user_id, student_name, group_label, group_name, status,
                    teacher_comment, reviewer_user_id, is_excellent, submitted_at, reviewed_at,
                    updated_at, ai_diagnosis_json, ai_diagnosed_at
                ) VALUES (
                    'submission-v1', 'artifact-versioned', 'user-versioned', '版本学生', '第 1 组', '版本项目',
                    'REVISION', '保留旧评语', NULL, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP, '{\"summary\":\"保留旧诊断\"}', CURRENT_TIMESTAMP
                )
                """);
    }

    private static void insertVersionTwo(Connection connection) throws Exception {
        execute(connection, """
                INSERT INTO artifact_submission (
                    id, artifact_id, submission_version, artifact_type_snapshot, artifact_title_snapshot,
                    artifact_summary_snapshot, content_json_snapshot, student_user_id, student_name,
                    group_label, group_name, status, is_excellent, submitted_at, updated_at
                ) VALUES (
                    'submission-v2', 'artifact-versioned', 2, 'BP', '迁移后成果', '迁移后摘要',
                    '[{\"title\":\"第二版\"}]', 'user-versioned', '版本学生', '第 1 组', '版本项目',
                    'PENDING', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """);
    }

    private static void insertDuplicateVersionOne(Connection connection) throws Exception {
        execute(connection, """
                INSERT INTO artifact_submission (
                    id, artifact_id, submission_version, artifact_type_snapshot, artifact_title_snapshot,
                    artifact_summary_snapshot, content_json_snapshot, student_user_id, student_name,
                    group_label, group_name, status, is_excellent, submitted_at, updated_at
                ) VALUES (
                    'submission-v1-duplicate', 'artifact-versioned', 1, 'BP', '重复版本', '重复版本', '[]',
                    'user-versioned', '版本学生', '第 1 组', '版本项目', 'PENDING', FALSE,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """);
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.executeUpdate();
        }
    }

    private static int number(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            result.next();
            return result.getInt(1);
        }
    }

    private static String text(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            result.next();
            return result.getString(1);
        }
    }
}
