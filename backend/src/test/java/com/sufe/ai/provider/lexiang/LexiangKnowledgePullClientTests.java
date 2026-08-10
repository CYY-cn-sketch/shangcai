package com.sufe.ai.provider.lexiang;

import com.sufe.ai.provider.config.LexiangProperties;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class LexiangKnowledgePullClientTests {

    private MockWebServer server;
    private LexiangKnowledgeClient client;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        LexiangProperties properties = new LexiangProperties(
                true,
                server.url("/").uri(),
                "app-key",
                "app-secret",
                "system-bot",
                "knowledge-manager",
                "",
                1
        );
        client = new LexiangKnowledgeClient(properties, RestClient.builder());
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void usesOfficialPageTokenParentRecursionParametersAndReadsDownloadLink() throws Exception {
        enqueueJson("{\"access_token\":\"test-token\",\"expires_in\":3600}");
        enqueueJson("""
                {
                  "data":[{
                    "id":"entry-001",
                    "attributes":{"name":"课程资料.pdf","entry_type":"file","updated_at":"1710000000","has_children":false}
                  }],
                  "meta":{"page_token":"next-page"}
                }
                """);
        enqueueJson("{\"data\":[],\"meta\":{}}");
        enqueueJson("""
                {
                  "data":{
                    "id":"entry-001",
                    "attributes":{"name":"课程资料.pdf","entry_type":"file","updated_at":"1710000000","has_children":false}
                  },
                  "links":{"download":"https://file.lexiang-asset.com/course.pdf"}
                }
                """);

        var first = client.listEntries("space-course", "folder-course", null);
        var second = client.listEntries("space-course", "folder-course", first.nextPageToken());
        var detail = client.describeEntry("entry-001");

        assertThat(first.entries()).hasSize(1);
        assertThat(first.nextPageToken()).isEqualTo("next-page");
        assertThat(second.entries()).isEmpty();
        assertThat(detail.downloadUrl()).isEqualTo("https://file.lexiang-asset.com/course.pdf");

        RecordedRequest token = server.takeRequest(1, TimeUnit.SECONDS);
        RecordedRequest pageOne = server.takeRequest(1, TimeUnit.SECONDS);
        RecordedRequest pageTwo = server.takeRequest(1, TimeUnit.SECONDS);
        RecordedRequest describe = server.takeRequest(1, TimeUnit.SECONDS);
        assertThat(token).isNotNull();
        assertThat(pageOne.getRequestUrl().queryParameter("space_id")).isEqualTo("space-course");
        assertThat(pageOne.getRequestUrl().queryParameter("parent_id")).isEqualTo("folder-course");
        assertThat(pageOne.getRequestUrl().queryParameter("limit")).isEqualTo("100");
        assertThat(pageOne.getRequestUrl().queryParameter("page_token")).isNull();
        assertThat(pageOne.getHeader("x-staff-id")).isEqualTo("knowledge-manager");
        assertThat(pageTwo.getRequestUrl().queryParameter("page_token")).isEqualTo("next-page");
        assertThat(describe.getPath()).isEqualTo("/cgi-bin/v1/kb/entries/entry-001");
    }

    private void enqueueJson(String body) {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(body));
    }
}
