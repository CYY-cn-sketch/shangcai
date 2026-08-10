package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class V26__version_artifact_submissions extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        boolean h2 = connection.getMetaData().getDatabaseProductName().contains("H2");
        try (Statement statement = connection.createStatement()) {
            statement.execute("ALTER TABLE artifact_submission ADD COLUMN submission_version INT NOT NULL DEFAULT 1");
            statement.execute("ALTER TABLE artifact_submission ADD COLUMN artifact_type_snapshot VARCHAR(32)");
            statement.execute("ALTER TABLE artifact_submission ADD COLUMN artifact_title_snapshot VARCHAR(200)");
            statement.execute("ALTER TABLE artifact_submission ADD COLUMN artifact_summary_snapshot TEXT");
            statement.execute("ALTER TABLE artifact_submission ADD COLUMN content_json_snapshot TEXT");

            statement.execute("""
                    UPDATE artifact_submission
                    SET artifact_type_snapshot = (
                            SELECT artifact_type FROM artifact_record WHERE artifact_record.id = artifact_submission.artifact_id
                        ),
                        artifact_title_snapshot = (
                            SELECT title FROM artifact_record WHERE artifact_record.id = artifact_submission.artifact_id
                        ),
                        artifact_summary_snapshot = (
                            SELECT summary FROM artifact_record WHERE artifact_record.id = artifact_submission.artifact_id
                        ),
                        content_json_snapshot = (
                            SELECT content_json FROM artifact_record WHERE artifact_record.id = artifact_submission.artifact_id
                        )
                    """);

            if (h2) {
                statement.execute("ALTER TABLE artifact_submission ALTER COLUMN artifact_type_snapshot SET NOT NULL");
                statement.execute("ALTER TABLE artifact_submission ALTER COLUMN artifact_title_snapshot SET NOT NULL");
                statement.execute("ALTER TABLE artifact_submission ALTER COLUMN artifact_summary_snapshot SET NOT NULL");
                statement.execute("ALTER TABLE artifact_submission ALTER COLUMN content_json_snapshot SET NOT NULL");
                statement.execute("ALTER TABLE artifact_submission ADD CONSTRAINT uk_artifact_submission_artifact_version UNIQUE (artifact_id, submission_version)");
                statement.execute("ALTER TABLE artifact_submission DROP CONSTRAINT fk_artifact_submission_artifact");
                statement.execute("ALTER TABLE artifact_submission DROP CONSTRAINT uk_artifact_submission_artifact");
                dropLegacyArtifactUniqueIndexes(connection);
                statement.execute("ALTER TABLE artifact_submission ADD CONSTRAINT fk_artifact_submission_artifact "
                        + "FOREIGN KEY (artifact_id) REFERENCES artifact_record (id) ON DELETE CASCADE");
            } else {
                statement.execute("ALTER TABLE artifact_submission MODIFY COLUMN artifact_type_snapshot VARCHAR(32) NOT NULL");
                statement.execute("ALTER TABLE artifact_submission MODIFY COLUMN artifact_title_snapshot VARCHAR(200) NOT NULL");
                statement.execute("ALTER TABLE artifact_submission MODIFY COLUMN artifact_summary_snapshot TEXT NOT NULL");
                statement.execute("ALTER TABLE artifact_submission MODIFY COLUMN content_json_snapshot TEXT NOT NULL");
                statement.execute("ALTER TABLE artifact_submission ADD CONSTRAINT uk_artifact_submission_artifact_version UNIQUE (artifact_id, submission_version)");
                statement.execute("ALTER TABLE artifact_submission DROP FOREIGN KEY fk_artifact_submission_artifact");
                statement.execute("ALTER TABLE artifact_submission DROP INDEX uk_artifact_submission_artifact");
                statement.execute("ALTER TABLE artifact_submission ADD CONSTRAINT fk_artifact_submission_artifact "
                        + "FOREIGN KEY (artifact_id) REFERENCES artifact_record (id) ON DELETE CASCADE");
            }
        }
    }

    private static void dropLegacyArtifactUniqueIndexes(Connection connection) throws Exception {
        DatabaseMetaData metadata = connection.getMetaData();
        Map<String, List<String>> uniqueIndexes = new LinkedHashMap<>();
        try (ResultSet indexes = metadata.getIndexInfo(
                connection.getCatalog(),
                connection.getSchema(),
                "artifact_submission",
                true,
                false
        )) {
            while (indexes.next()) {
                String indexName = indexes.getString("INDEX_NAME");
                String columnName = indexes.getString("COLUMN_NAME");
                if (indexName == null || columnName == null) continue;
                uniqueIndexes.computeIfAbsent(indexName, ignored -> new ArrayList<>()).add(columnName);
            }
        }

        String quote = metadata.getIdentifierQuoteString().trim();
        try (Statement statement = connection.createStatement()) {
            for (Map.Entry<String, List<String>> entry : uniqueIndexes.entrySet()) {
                List<String> columns = entry.getValue();
                if (columns.size() == 1 && columns.getFirst().equalsIgnoreCase("artifact_id")) {
                    String indexName = quote.isEmpty()
                            ? entry.getKey()
                            : quote + entry.getKey().replace(quote, quote + quote) + quote;
                    statement.execute("DROP INDEX " + indexName);
                }
            }
        }
    }
}
