package com.sufe.ai;

import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("production")
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:sufe-production-profile;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "logging.file.name=${java.io.tmpdir}/sufe-ai-production-profile.log",
                "logging.logback.rollingpolicy.file-name-pattern=${java.io.tmpdir}/sufe-ai-production-profile.%d{yyyy-MM-dd}.%i.log.gz",
                "sufe.storage.files-root=${java.io.tmpdir}/sufe-ai-production-files",
                "sufe.storage.artifacts-root=${java.io.tmpdir}/sufe-ai-production-artifacts"
        }
)
class ProductionProfileTests {

    @Autowired
    private Environment environment;

    @Autowired
    private WorkBuddyProperties workBuddyProperties;

    @Autowired
    private LexiangProperties lexiangProperties;

    @Test
    void productionProfileIsLoopbackOnlyAndKeepsProvidersDisabledByDefault() {
        assertThat(environment.getProperty("server.address")).isEqualTo("127.0.0.1");
        assertThat(environment.getProperty("server.servlet.session.cookie.secure", Boolean.class)).isTrue();
        assertThat(environment.getProperty("sufe.bootstrap.demo-data-enabled", Boolean.class)).isFalse();
        assertThat(workBuddyProperties.enabled()).isFalse();
        assertThat(lexiangProperties.enabled()).isFalse();
    }
}
