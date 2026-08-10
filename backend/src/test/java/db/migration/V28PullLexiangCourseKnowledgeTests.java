package db.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class V28PullLexiangCourseKnowledgeTests {

    @Test
    void allowsOnlyUniqueCourseMappingsAndAddsPullTrackingColumns() throws Exception {
        String url = "jdbc:h2:mem:v28-" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure()
                .dataSource(url, "sa", "")
                .target(MigrationVersion.fromVersion("27"))
                .load()
                .migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            seedBases(connection);
        }

        Flyway.configure().dataSource(url, "sa", "").load().migrate();

        try (Connection connection = DriverManager.getConnection(url, "sa", "")) {
            insertMapping(connection, "mapping-course-1", "course-v28-1", "COURSE_SHARED", "space-1", "folder-1");
            assertThat(count(connection, "SELECT COUNT(*) FROM lexiang_course_mapping WHERE knowledge_base_id='course-v28-1'"))
                    .isEqualTo(1);
            assertThatThrownBy(() -> insertMapping(
                    connection,
                    "mapping-private",
                    "private-v28",
                    "EXPERT_PRIVATE",
                    "space-private",
                    "folder-private"
            )).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> insertMapping(
                    connection,
                    "mapping-course-2",
                    "course-v28-2",
                    "COURSE_SHARED",
                    "space-1",
                    "folder-1"
            )).isInstanceOf(SQLException.class);

            DatabaseMetaData metaData = connection.getMetaData();
            assertThat(columnExists(metaData, "knowledge_asset", "lexiang_remote_updated_at")).isTrue();
            assertThat(columnExists(metaData, "knowledge_asset", "lexiang_last_seen_run_id")).isTrue();
            assertThat(tableExists(metaData, "lexiang_pull_run")).isTrue();
            assertThat(tableExists(metaData, "lexiang_pull_lock")).isTrue();
        }
    }

    private static void seedBases(Connection connection) throws Exception {
        execute(connection, """
                INSERT INTO expert_profile (
                    id, name, role_description, scenario, accent, active, created_at, updated_at
                ) VALUES (
                    'expert-v28', '迁移专家', '迁移测试', '迁移测试', 'blue', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """);
        insertBase(connection, "course-v28-1", "V28课程库1", "COURSE_SHARED", null);
        insertBase(connection, "course-v28-2", "V28课程库2", "COURSE_SHARED", null);
        insertBase(connection, "private-v28", "V28专家库", "EXPERT_PRIVATE", "expert-v28");
    }

    private static void insertBase(
            Connection connection,
            String id,
            String category,
            String scope,
            String ownerExpertId
    ) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO knowledge_base (
                    id, category, description, used_by, active, created_at, updated_at, scope_type, owner_expert_id
                ) VALUES (?, ?, '迁移测试', '迁移测试', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
                """)) {
            statement.setString(1, id);
            statement.setString(2, category);
            statement.setString(3, scope);
            statement.setString(4, ownerExpertId);
            statement.executeUpdate();
        }
    }

    private static void insertMapping(
            Connection connection,
            String id,
            String baseId,
            String scope,
            String spaceId,
            String parentEntryId
    ) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO lexiang_course_mapping (
                    id, knowledge_base_id, knowledge_base_scope, space_id, parent_entry_id,
                    enabled, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """)) {
            statement.setString(1, id);
            statement.setString(2, baseId);
            statement.setString(3, scope);
            statement.setString(4, spaceId);
            statement.setString(5, parentEntryId);
            statement.executeUpdate();
        }
    }

    private static void execute(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.executeUpdate();
        }
    }

    private static int count(Connection connection, String sql) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            result.next();
            return result.getInt(1);
        }
    }

    private static boolean columnExists(DatabaseMetaData metaData, String table, String column) throws Exception {
        try (ResultSet result = metaData.getColumns(null, null, table, column)) {
            return result.next();
        }
    }

    private static boolean tableExists(DatabaseMetaData metaData, String table) throws Exception {
        try (ResultSet result = metaData.getTables(null, null, table, new String[]{"TABLE"})) {
            return result.next();
        }
    }
}
