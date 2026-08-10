package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

public class V25__merge_duplicate_experts_and_clear_parsed_skill_drafts extends BaseJavaMigration {

    private static final String CANONICAL_ID = "business";
    private static final String CANONICAL_NAME = "商业模式/BP 专家";
    private static final String LEGACY_NAME = "商业模式/BP专家";
    private static final String TEMPORARY_CANONICAL_NAME = "__business_expert_v25_merge__";

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        List<Profile> candidates = readCandidates(connection);
        if (!candidates.isEmpty()) {
            mergeExperts(connection, candidates);
        }

        // PARSED records are unconfirmed previews. ENABLED source archives remain attached to the canonical expert.
        execute(connection, "DELETE FROM expert_skill_upload WHERE status = ?", "PARSED");
    }

    private static void mergeExperts(Connection connection, List<Profile> candidates) throws Exception {
        candidates.sort(profilePreference());
        Profile preferred = candidates.getFirst();
        MergedProfile merged = mergeProfileFields(candidates, preferred);

        if (candidates.stream().noneMatch(profile -> CANONICAL_ID.equals(profile.id()))) {
            insertCanonicalProfile(connection, merged);
            candidates.add(readProfile(connection, CANONICAL_ID));
            candidates.sort(profilePreference());
        } else {
            updateCanonicalProfile(connection, merged);
        }

        Set<String> candidateIds = new HashSet<>();
        candidates.forEach(profile -> candidateIds.add(profile.id()));
        List<PrivateBase> privateBases = readPrivateBases(connection, candidateIds);
        PrivateBase canonicalPrivateBase = mergePrivateKnowledge(connection, privateBases, candidateIds);

        mergeKnowledgeRoutes(connection, candidateIds, privateBases, canonicalPrivateBase);
        mergeSkills(connection, candidates);
        reassignSourceArchives(connection, candidateIds);
        reassignRuntimeReferences(connection, candidateIds);

        for (String candidateId : candidateIds) {
            if (!CANONICAL_ID.equals(candidateId)) {
                execute(connection, "DELETE FROM expert_profile WHERE id = ?", candidateId);
            }
        }
        execute(
                connection,
                "UPDATE expert_profile SET name = ?, updated_at = ? WHERE id = ?",
                CANONICAL_NAME,
                Timestamp.from(merged.updatedAt()),
                CANONICAL_ID
        );
        execute(
                connection,
                "UPDATE conversation_message SET expert_name = ? WHERE expert_id = ?",
                CANONICAL_NAME,
                CANONICAL_ID
        );
    }

    private static List<Profile> readCandidates(Connection connection) throws Exception {
        List<Profile> profiles = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT id, name, role_description, scenario, accent, source_skill_name, source_skill_content,
                       source_skill_uploaded_by, system_prompt, user_prompt, active, created_at, updated_at,
                       (SELECT COUNT(*) FROM expert_skill skill WHERE skill.expert_id = expert_profile.id) AS skill_count
                FROM expert_profile
                WHERE id = ? OR name = ? OR name = ?
                """)) {
            statement.setString(1, CANONICAL_ID);
            statement.setString(2, CANONICAL_NAME);
            statement.setString(3, LEGACY_NAME);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) profiles.add(toProfile(result));
            }
        }
        return profiles;
    }

    private static Profile readProfile(Connection connection, String id) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT id, name, role_description, scenario, accent, source_skill_name, source_skill_content,
                       source_skill_uploaded_by, system_prompt, user_prompt, active, created_at, updated_at,
                       (SELECT COUNT(*) FROM expert_skill skill WHERE skill.expert_id = expert_profile.id) AS skill_count
                FROM expert_profile WHERE id = ?
                """)) {
            statement.setString(1, id);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("专家不存在：" + id);
                return toProfile(result);
            }
        }
    }

    private static Profile toProfile(ResultSet result) throws Exception {
        return new Profile(
                result.getString("id"),
                result.getString("name"),
                result.getString("role_description"),
                result.getString("scenario"),
                result.getString("accent"),
                result.getString("source_skill_name"),
                result.getString("source_skill_content"),
                result.getString("source_skill_uploaded_by"),
                result.getString("system_prompt"),
                result.getString("user_prompt"),
                result.getBoolean("active"),
                toInstant(result.getTimestamp("created_at")),
                toInstant(result.getTimestamp("updated_at")),
                result.getLong("skill_count")
        );
    }

    private static Comparator<Profile> profilePreference() {
        return Comparator
                .comparing(Profile::updatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Comparator.comparingInt(Profile::completeness).reversed())
                .thenComparing(profile -> CANONICAL_ID.equals(profile.id()) ? 0 : 1)
                .thenComparing(Profile::id);
    }

    private static MergedProfile mergeProfileFields(List<Profile> ordered, Profile preferred) {
        Instant createdAt = ordered.stream()
                .map(Profile::createdAt)
                .filter(value -> value != null)
                .min(Instant::compareTo)
                .orElse(Instant.now());
        Instant updatedAt = ordered.stream()
                .map(Profile::updatedAt)
                .filter(value -> value != null)
                .max(Instant::compareTo)
                .orElse(Instant.now());
        return new MergedProfile(
                firstText(ordered, Profile::roleDescription),
                firstText(ordered, Profile::scenario),
                firstText(ordered, Profile::accent),
                firstText(ordered, Profile::sourceSkillName),
                firstText(ordered, Profile::sourceSkillContent),
                firstText(ordered, Profile::sourceSkillUploadedBy),
                firstText(ordered, Profile::systemPrompt),
                firstText(ordered, Profile::userPrompt),
                preferred.active(),
                createdAt,
                updatedAt
        );
    }

    private static String firstText(List<Profile> ordered, Function<Profile, String> getter) {
        return ordered.stream()
                .map(getter)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private static void insertCanonicalProfile(Connection connection, MergedProfile profile) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO expert_profile (
                    id, name, role_description, scenario, accent, source_skill_name, source_skill_content,
                    source_skill_uploaded_by, system_prompt, user_prompt, active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """)) {
            statement.setString(1, CANONICAL_ID);
            statement.setString(2, TEMPORARY_CANONICAL_NAME);
            statement.setString(3, requireMergedText(profile.roleDescription(), "role_description"));
            statement.setString(4, requireMergedText(profile.scenario(), "scenario"));
            statement.setString(5, requireMergedText(profile.accent(), "accent"));
            statement.setString(6, profile.sourceSkillName());
            statement.setString(7, profile.sourceSkillContent());
            statement.setString(8, profile.sourceSkillUploadedBy());
            statement.setString(9, profile.systemPrompt());
            statement.setString(10, profile.userPrompt());
            statement.setBoolean(11, profile.active());
            statement.setTimestamp(12, Timestamp.from(profile.createdAt()));
            statement.setTimestamp(13, Timestamp.from(profile.updatedAt()));
            statement.executeUpdate();
        }
    }

    private static void updateCanonicalProfile(Connection connection, MergedProfile profile) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                UPDATE expert_profile
                SET role_description = ?, scenario = ?, accent = ?, source_skill_name = ?, source_skill_content = ?,
                    source_skill_uploaded_by = ?, system_prompt = ?, user_prompt = ?, active = ?, updated_at = ?
                WHERE id = ?
                """)) {
            statement.setString(1, requireMergedText(profile.roleDescription(), "role_description"));
            statement.setString(2, requireMergedText(profile.scenario(), "scenario"));
            statement.setString(3, requireMergedText(profile.accent(), "accent"));
            statement.setString(4, profile.sourceSkillName());
            statement.setString(5, profile.sourceSkillContent());
            statement.setString(6, profile.sourceSkillUploadedBy());
            statement.setString(7, profile.systemPrompt());
            statement.setString(8, profile.userPrompt());
            statement.setBoolean(9, profile.active());
            statement.setTimestamp(10, Timestamp.from(profile.updatedAt()));
            statement.setString(11, CANONICAL_ID);
            statement.executeUpdate();
        }
    }

    private static String requireMergedText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("合并专家缺少必填配置：" + field);
        }
        return value;
    }

    private static List<PrivateBase> readPrivateBases(Connection connection, Set<String> expertIds) throws Exception {
        List<PrivateBase> bases = new ArrayList<>();
        for (String expertId : expertIds) {
            try (PreparedStatement statement = connection.prepareStatement("""
                    SELECT id, category, owner_expert_id, updated_at,
                           (SELECT COUNT(*) FROM knowledge_asset asset WHERE asset.knowledge_base_id = knowledge_base.id) AS asset_count
                    FROM knowledge_base
                    WHERE owner_expert_id = ? AND scope_type = 'EXPERT_PRIVATE'
                    """)) {
                statement.setString(1, expertId);
                try (ResultSet result = statement.executeQuery()) {
                    while (result.next()) {
                        bases.add(new PrivateBase(
                                result.getString("id"),
                                result.getString("category"),
                                result.getString("owner_expert_id"),
                                toInstant(result.getTimestamp("updated_at")),
                                result.getLong("asset_count")
                        ));
                    }
                }
            }
        }
        return bases;
    }

    private static PrivateBase mergePrivateKnowledge(
            Connection connection,
            List<PrivateBase> privateBases,
            Set<String> candidateIds
    ) throws Exception {
        if (privateBases.isEmpty()) return null;

        PrivateBase target = privateBases.stream()
                .filter(base -> CANONICAL_ID.equals(base.ownerExpertId()))
                .findFirst()
                .orElseGet(() -> privateBases.stream()
                        .max(Comparator.comparingLong(PrivateBase::assetCount)
                                .thenComparing(PrivateBase::updatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                        .orElseThrow());

        if (!CANONICAL_ID.equals(target.ownerExpertId())) {
            execute(connection, "UPDATE knowledge_base SET owner_expert_id = ?, used_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    CANONICAL_ID, CANONICAL_NAME, target.id());
        }

        for (PrivateBase base : privateBases) {
            if (base.id().equals(target.id())) continue;
            execute(connection, "UPDATE knowledge_asset SET knowledge_base_id = ? WHERE knowledge_base_id = ?", target.id(), base.id());
            for (String expertId : candidateIds) {
                execute(connection, "DELETE FROM expert_knowledge_route WHERE expert_id = ? AND category = ?", expertId, base.category());
            }
            execute(connection, "DELETE FROM knowledge_base WHERE id = ? AND scope_type = 'EXPERT_PRIVATE'", base.id());
        }
        return new PrivateBase(target.id(), target.category(), CANONICAL_ID, target.updatedAt(), target.assetCount());
    }

    private static void mergeKnowledgeRoutes(
            Connection connection,
            Set<String> candidateIds,
            List<PrivateBase> privateBases,
            PrivateBase canonicalPrivateBase
    ) throws Exception {
        Set<String> privateCategories = new HashSet<>();
        privateBases.forEach(base -> privateCategories.add(base.category()));

        Set<String> mergedCategories = new HashSet<>();
        for (String expertId : candidateIds) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT category FROM expert_knowledge_route WHERE expert_id = ?")) {
                statement.setString(1, expertId);
                try (ResultSet result = statement.executeQuery()) {
                    while (result.next()) {
                        String category = result.getString(1);
                        if (!privateCategories.contains(category)) mergedCategories.add(category);
                    }
                }
            }
        }

        for (String expertId : candidateIds) {
            execute(connection, "DELETE FROM expert_knowledge_route WHERE expert_id = ?", expertId);
        }
        for (String category : mergedCategories) {
            insertRoute(connection, category);
        }
        if (canonicalPrivateBase != null) {
            insertRoute(connection, canonicalPrivateBase.category());
        }
    }

    private static void insertRoute(Connection connection, String category) throws Exception {
        UUID routeId = UUID.nameUUIDFromBytes(("v25-business-route:" + category).getBytes(StandardCharsets.UTF_8));
        execute(
                connection,
                "INSERT INTO expert_knowledge_route (id, expert_id, category, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                routeId.toString(),
                CANONICAL_ID,
                category
        );
    }

    private static void mergeSkills(Connection connection, List<Profile> candidates) throws Exception {
        Profile source = candidates.stream()
                .filter(profile -> profile.skillCount() > 0)
                .min(profilePreference())
                .orElse(null);
        for (Profile candidate : candidates) {
            if (source == null || !candidate.id().equals(source.id())) {
                execute(connection, "DELETE FROM expert_skill WHERE expert_id = ?", candidate.id());
            }
        }
        if (source != null && !CANONICAL_ID.equals(source.id())) {
            execute(connection, "UPDATE expert_skill SET expert_id = ? WHERE expert_id = ?", CANONICAL_ID, source.id());
        }
    }

    private static void reassignSourceArchives(Connection connection, Set<String> candidateIds) throws Exception {
        for (String expertId : candidateIds) {
            if (!CANONICAL_ID.equals(expertId)) {
                execute(connection, "UPDATE expert_skill_upload SET expert_id = ? WHERE expert_id = ?", CANONICAL_ID, expertId);
            }
        }
    }

    private static void reassignRuntimeReferences(Connection connection, Set<String> candidateIds) throws Exception {
        for (String expertId : candidateIds) {
            if (CANONICAL_ID.equals(expertId)) continue;
            deleteProviderSessionCollisions(connection, expertId);
            deleteExpertHandoffCollisions(connection, expertId);
            execute(connection, "UPDATE provider_session SET expert_id = ? WHERE expert_id = ?", CANONICAL_ID, expertId);
            execute(connection, "UPDATE generation_job SET expert_id = ? WHERE expert_id = ?", CANONICAL_ID, expertId);
            execute(connection, "UPDATE student_conversation SET selected_expert_id = ? WHERE selected_expert_id = ?", CANONICAL_ID, expertId);
            execute(connection, "UPDATE conversation_message SET expert_id = ?, expert_name = ? WHERE expert_id = ?",
                    CANONICAL_ID, CANONICAL_NAME, expertId);
            execute(connection, "UPDATE ai_chat_request SET expert_id = ? WHERE expert_id = ?", CANONICAL_ID, expertId);
            execute(connection, "UPDATE expert_handoff SET source_expert_id = ? WHERE source_expert_id = ?", CANONICAL_ID, expertId);
            execute(connection, "UPDATE expert_handoff SET target_expert_id = ? WHERE target_expert_id = ?", CANONICAL_ID, expertId);
        }
    }

    private static void deleteProviderSessionCollisions(Connection connection, String duplicateId) throws Exception {
        List<String> collisionIds = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT duplicate_session.id
                FROM provider_session duplicate_session
                JOIN provider_session canonical_session
                  ON canonical_session.user_id = duplicate_session.user_id
                 AND canonical_session.project_id = duplicate_session.project_id
                 AND canonical_session.conversation_id = duplicate_session.conversation_id
                 AND canonical_session.provider = duplicate_session.provider
                 AND canonical_session.expert_id = ?
                WHERE duplicate_session.expert_id = ?
                """)) {
            statement.setString(1, CANONICAL_ID);
            statement.setString(2, duplicateId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) collisionIds.add(result.getString(1));
            }
        }
        for (String id : collisionIds) execute(connection, "DELETE FROM provider_session WHERE id = ?", id);
    }

    private static void deleteExpertHandoffCollisions(Connection connection, String duplicateId) throws Exception {
        List<String> collisionIds = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT duplicate_handoff.id
                FROM expert_handoff duplicate_handoff
                JOIN expert_handoff canonical_handoff
                  ON canonical_handoff.user_id = duplicate_handoff.user_id
                 AND canonical_handoff.source_artifact_id = duplicate_handoff.source_artifact_id
                 AND canonical_handoff.target_expert_id = ?
                WHERE duplicate_handoff.target_expert_id = ?
                """)) {
            statement.setString(1, CANONICAL_ID);
            statement.setString(2, duplicateId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) collisionIds.add(result.getString(1));
            }
        }
        for (String id : collisionIds) execute(connection, "DELETE FROM expert_handoff WHERE id = ?", id);
    }

    private static void execute(Connection connection, String sql, Object... values) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < values.length; index++) statement.setObject(index + 1, values[index]);
            statement.executeUpdate();
        }
    }

    private static Instant toInstant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private record Profile(
            String id,
            String name,
            String roleDescription,
            String scenario,
            String accent,
            String sourceSkillName,
            String sourceSkillContent,
            String sourceSkillUploadedBy,
            String systemPrompt,
            String userPrompt,
            boolean active,
            Instant createdAt,
            Instant updatedAt,
            long skillCount
    ) {
        private int completeness() {
            int score = 0;
            if (hasText(roleDescription)) score++;
            if (hasText(scenario)) score++;
            if (hasText(accent)) score++;
            if (hasText(sourceSkillName)) score++;
            if (hasText(sourceSkillContent)) score += 2;
            if (hasText(sourceSkillUploadedBy)) score++;
            if (hasText(systemPrompt)) score += 2;
            if (hasText(userPrompt)) score += 2;
            if (skillCount > 0) score += 2;
            return score;
        }

        private static boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }

    private record MergedProfile(
            String roleDescription,
            String scenario,
            String accent,
            String sourceSkillName,
            String sourceSkillContent,
            String sourceSkillUploadedBy,
            String systemPrompt,
            String userPrompt,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    private record PrivateBase(String id, String category, String ownerExpertId, Instant updatedAt, long assetCount) {
    }
}
