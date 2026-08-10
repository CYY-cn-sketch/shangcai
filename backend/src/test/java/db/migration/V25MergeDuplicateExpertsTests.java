package db.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class V25MergeDuplicateExpertsTests {

    private static final String CANONICAL_ID = "business";
    private static final String DUPLICATE_ID = "business-imported-newer";

    @Test
    void keepsCanonicalIdentityAndMergesNewestConfigurationMaterialsAndConfirmedSources() throws Exception {
        String url = "jdbc:h2:mem:v25-" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure()
                .dataSource(url, "sa", "")
                .target(MigrationVersion.fromVersion("24"))
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            seedDuplicateExperts(connection);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill_upload WHERE status = 'PARSED'"))
                    .isEqualTo(10);
        }

        Flyway.configure().dataSource(url, "sa", "").load().migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_profile WHERE id = 'business'"))
                    .isEqualTo(1);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_profile WHERE id = 'business-imported-newer'"))
                    .isZero();
            assertThat(text(connection, "SELECT name FROM expert_profile WHERE id = 'business'"))
                    .isEqualTo("商业模式/BP 专家");
            assertThat(text(connection, "SELECT system_prompt FROM expert_profile WHERE id = 'business'"))
                    .isEqualTo("较新的完整系统提示词");
            assertThat(text(connection, "SELECT source_skill_uploaded_by FROM expert_profile WHERE id = 'business'"))
                    .isEqualTo("旧配置维护人");

            assertThat(count(connection, "SELECT COUNT(*) FROM knowledge_base WHERE scope_type = 'EXPERT_PRIVATE' AND owner_expert_id = 'business'"))
                    .isEqualTo(1);
            assertThat(count(connection, "SELECT COUNT(*) FROM knowledge_base WHERE id = 'kb-business-newer'"))
                    .isZero();
            assertThat(count(connection, """
                    SELECT COUNT(*) FROM knowledge_asset asset
                    JOIN knowledge_base base ON base.id = asset.knowledge_base_id
                    WHERE base.scope_type = 'EXPERT_PRIVATE' AND base.owner_expert_id = 'business'
                    """))
                    .isEqualTo(2);
            assertThat(count(connection, "SELECT COUNT(*) FROM knowledge_base WHERE scope_type = 'COURSE_SHARED'"))
                    .isGreaterThan(0);

            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill WHERE expert_id = 'business' AND id = 'new-business-skill'"))
                    .isEqualTo(1);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill WHERE id = 'old-business-skill'"))
                    .isZero();
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_knowledge_route WHERE expert_id = 'business' AND category = 'BP 模板'"))
                    .isEqualTo(1);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_knowledge_route WHERE expert_id = 'business-imported-newer'"))
                    .isZero();

            assertThat(text(connection, "SELECT expert_id FROM expert_skill_upload WHERE id = 'enabled-business-source'"))
                    .isEqualTo(CANONICAL_ID);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill_upload_file WHERE upload_id = 'enabled-business-source'"))
                    .isEqualTo(1);
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill_upload WHERE status = 'PARSED'"))
                    .isZero();
            assertThat(count(connection, "SELECT COUNT(*) FROM expert_skill_upload_file WHERE upload_id LIKE 'parsed-draft-%'"))
                    .isZero();
        }
    }

    private static void seedDuplicateExperts(Connection connection) throws Exception {
        Instant oldTime = Instant.parse("2026-07-01T00:00:00Z");
        Instant newTime = Instant.parse("2026-08-01T00:00:00Z");
        insertProfile(
                connection,
                CANONICAL_ID,
                "商业模式/BP专家",
                "旧角色配置",
                "旧场景",
                "#111111",
                "old/SKILL.md",
                "旧来源内容",
                "旧配置维护人",
                "旧系统提示词",
                "旧用户提示词",
                oldTime
        );
        insertProfile(
                connection,
                DUPLICATE_ID,
                "商业模式/BP 专家",
                "较新的完整角色配置",
                "较新的完整场景",
                "#225588",
                "new/SKILL.md",
                "较新的完整来源内容",
                null,
                "较新的完整系统提示词",
                "较新的完整用户提示词",
                newTime
        );

        insertPrivateBase(connection, "kb-business-old", "旧商业模式专属知识库", CANONICAL_ID, oldTime);
        insertPrivateBase(connection, "kb-business-newer", "商业模式/BP 专家专属知识库", DUPLICATE_ID, newTime);
        insertAsset(connection, "old-business-asset", "kb-business-old", "旧资料");
        insertAsset(connection, "new-business-asset", "kb-business-newer", "新资料");

        insertSkill(connection, "old-business-skill", CANONICAL_ID, "旧技能", oldTime);
        insertSkill(connection, "new-business-skill", DUPLICATE_ID, "较新技能", newTime);
        insertRoute(connection, "old-private-route", CANONICAL_ID, "旧商业模式专属知识库", oldTime);
        insertRoute(connection, "new-private-route", DUPLICATE_ID, "商业模式/BP 专家专属知识库", newTime);
        insertRoute(connection, "new-course-route", DUPLICATE_ID, "BP 模板", newTime);

        insertUpload(connection, "enabled-business-source", "ENABLED", DUPLICATE_ID, newTime);
        insertUploadFile(connection, "enabled-business-file", "enabled-business-source", "skill/enabled.md");
        for (int index = 0; index < 10; index++) {
            String uploadId = "parsed-draft-" + index;
            insertUpload(connection, uploadId, "PARSED", null, newTime.plusSeconds(index));
            insertUploadFile(connection, "parsed-file-" + index, uploadId, "skill/parsed-" + index + ".md");
        }
    }

    private static void insertProfile(
            Connection connection,
            String id,
            String name,
            String role,
            String scenario,
            String accent,
            String sourceName,
            String sourceContent,
            String sourceUploadedBy,
            String systemPrompt,
            String userPrompt,
            Instant updatedAt
    ) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_profile (
                    id, name, role_description, scenario, accent, source_skill_name, source_skill_content,
                    source_skill_uploaded_by, system_prompt, user_prompt, active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, name);
            statement.setString(3, role);
            statement.setString(4, scenario);
            statement.setString(5, accent);
            statement.setString(6, sourceName);
            statement.setString(7, sourceContent);
            statement.setString(8, sourceUploadedBy);
            statement.setString(9, systemPrompt);
            statement.setString(10, userPrompt);
            statement.setTimestamp(11, Timestamp.from(updatedAt.minusSeconds(3600)));
            statement.setTimestamp(12, Timestamp.from(updatedAt));
            statement.executeUpdate();
        }
    }

    private static void insertPrivateBase(Connection connection, String id, String category, String ownerId, Instant updatedAt) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO knowledge_base (
                    id, category, description, used_by, active, created_at, updated_at, scope_type, owner_expert_id
                ) VALUES (?, ?, '专家专属资料', ?, TRUE, ?, ?, 'EXPERT_PRIVATE', ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, category);
            statement.setString(3, category);
            statement.setTimestamp(4, Timestamp.from(updatedAt.minusSeconds(3600)));
            statement.setTimestamp(5, Timestamp.from(updatedAt));
            statement.setString(6, ownerId);
            statement.executeUpdate();
        }
    }

    private static void insertAsset(Connection connection, String id, String baseId, String name) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO knowledge_asset (
                    id, knowledge_base_id, name, size_label, file_type, preview, content_text, uploaded_by,
                    enabled, created_at, updated_at, extraction_status, origin_type
                ) VALUES (?, ?, ?, '1 KB', 'MD', ?, ?, '迁移测试', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'READY', 'SKILL_IMPORT')
                """)) {
            statement.setString(1, id);
            statement.setString(2, baseId);
            statement.setString(3, name);
            statement.setString(4, name + "摘要");
            statement.setString(5, name + "正文");
            statement.executeUpdate();
        }
    }

    private static void insertSkill(Connection connection, String id, String expertId, String name, Instant createdAt) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_skill (id, expert_id, name, stage, description, created_at)
                VALUES (?, ?, ?, '已确认上传', ?, ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, expertId);
            statement.setString(3, name);
            statement.setString(4, name + "说明");
            statement.setTimestamp(5, Timestamp.from(createdAt));
            statement.executeUpdate();
        }
    }

    private static void insertRoute(Connection connection, String id, String expertId, String category, Instant createdAt) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_knowledge_route (id, expert_id, category, created_at) VALUES (?, ?, ?, ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, expertId);
            statement.setString(3, category);
            statement.setTimestamp(4, Timestamp.from(createdAt));
            statement.executeUpdate();
        }
    }

    private static void insertUpload(Connection connection, String id, String status, String expertId, Instant createdAt) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_skill_upload (
                    id, uploaded_by, folder_name, main_file_path, file_count, source_content, parsed_name,
                    parsed_role, parsed_scenario, parsed_accent, parsed_system_prompt, parsed_user_prompt,
                    parsed_skill_name, parsed_skill_description, status, expert_id, confirmed_by, created_at, confirmed_at
                ) VALUES (?, '迁移测试', ?, 'SKILL.md', 1, '# skill', '商业模式/BP 专家', '角色', '场景',
                          '#225588', 'system', 'user', 'skill', 'description', ?, ?, ?, ?, ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, id);
            statement.setString(3, status);
            statement.setString(4, expertId);
            statement.setString(5, "ENABLED".equals(status) ? "迁移测试" : null);
            statement.setTimestamp(6, Timestamp.from(createdAt));
            statement.setTimestamp(7, "ENABLED".equals(status) ? Timestamp.from(createdAt) : null);
            statement.executeUpdate();
        }
    }

    private static void insertUploadFile(Connection connection, String id, String uploadId, String storageKey) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_skill_upload_file (
                    id, upload_id, relative_path, file_role, content_text, storage_key, mime_type,
                    file_size_bytes, sha256, created_at
                ) VALUES (?, ?, 'SKILL.md', 'REFERENCE', '# skill', ?, 'text/markdown', 7,
                          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', CURRENT_TIMESTAMP)
                """)) {
            statement.setString(1, id);
            statement.setString(2, uploadId);
            statement.setString(3, storageKey);
            statement.executeUpdate();
        }
    }

    private static long count(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            result.next();
            return result.getLong(1);
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
