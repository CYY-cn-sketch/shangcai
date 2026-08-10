package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Statement;

public class V23__support_multiple_conversations_and_expert_handoffs extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        boolean h2 = context.getConnection().getMetaData().getDatabaseProductName().contains("H2");
        try (Statement statement = context.getConnection().createStatement()) {
            statement.execute("ALTER TABLE student_conversation ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT '项目对话'");
            statement.execute("ALTER TABLE student_conversation ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'");
            statement.execute("ALTER TABLE student_conversation ADD COLUMN last_message_at TIMESTAMP(6)");
            statement.execute(h2
                    ? "ALTER TABLE student_conversation DROP CONSTRAINT uk_student_conversation_user_idea"
                    : "ALTER TABLE student_conversation DROP INDEX uk_student_conversation_user_idea");
            statement.execute("CREATE INDEX idx_student_conversation_user_idea_updated "
                    + "ON student_conversation (user_id, idea_id, updated_at)");
            statement.execute("""
                    CREATE TABLE expert_handoff (
                        id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        idea_id VARCHAR(36) NOT NULL,
                        source_artifact_id VARCHAR(36) NOT NULL,
                        source_expert_id VARCHAR(64) NOT NULL,
                        target_expert_id VARCHAR(64) NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        payload_json TEXT NOT NULL,
                        confirmed_at TIMESTAMP(6) NOT NULL,
                        created_at TIMESTAMP(6) NOT NULL,
                        updated_at TIMESTAMP(6) NOT NULL,
                        CONSTRAINT pk_expert_handoff PRIMARY KEY (id),
                        CONSTRAINT uk_expert_handoff_source_target UNIQUE (user_id, source_artifact_id, target_expert_id),
                        CONSTRAINT fk_expert_handoff_user FOREIGN KEY (user_id) REFERENCES user_account (id) ON DELETE CASCADE,
                        CONSTRAINT fk_expert_handoff_idea FOREIGN KEY (idea_id) REFERENCES student_idea (id) ON DELETE CASCADE,
                        CONSTRAINT fk_expert_handoff_artifact FOREIGN KEY (source_artifact_id) REFERENCES artifact_record (id) ON DELETE CASCADE
                    )
                    """);
            statement.execute("CREATE INDEX idx_expert_handoff_user_idea_target "
                    + "ON expert_handoff (user_id, idea_id, target_expert_id, confirmed_at)");
        }
    }
}
