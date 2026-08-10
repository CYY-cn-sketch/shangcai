package db.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class V21MigrationChecksumTests {

    @Test
    void preservesAppliedMigrationChecksum() {
        String url = "jdbc:h2:mem:v21-checksum-" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE";
        Flyway flyway = Flyway.configure()
                .dataSource(url, "sa", "")
                .load();

        MigrationInfo migration = Arrays.stream(flyway.info().all())
                .filter(info -> MigrationVersion.fromVersion("21").equals(info.getVersion()))
                .findFirst()
                .orElseThrow();

        assertThat(migration.getChecksum()).isEqualTo(701780291);
    }
}
