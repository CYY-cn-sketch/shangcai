package com.sufe.ai.provider.lexiang;

import com.sufe.ai.provider.config.LexiangProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LexiangKnowledgeClientTests {

    private static final String API_BASE = "https://mock.lexiang.invalid";
    private static final String COS_URL = "https://sufe-test.cos.ap-shanghai.myqcloud.com/upload/object";

    private MockRestServiceServer server;
    private LexiangKnowledgeClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new LexiangKnowledgeClient(properties(), builder);
    }

    @Test
    void uploadsBinaryWithDynamicCosHeadersThenCreatesEntry() {
        expectToken();
        server.expect(requestTo(API_BASE + "/cgi-bin/v1/kb/files/upload-params"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andExpect(header("x-staff-id", "knowledge-manager"))
                .andExpect(jsonPath("$.name").value("课程资料.pdf"))
                .andExpect(jsonPath("$.media_type").value("file"))
                .andRespond(withSuccess("""
                        {
                          "object": {
                            "state": "upload-state-001",
                            "upload_url": "%s",
                            "headers": {"x-cos-meta-origin": "lexiang"},
                            "auth": {"XCosSecurityToken": "temporary-cos-token"}
                          }
                        }
                        """.formatted(COS_URL), MediaType.APPLICATION_JSON));
        server.expect(requestTo(COS_URL))
                .andExpect(method(HttpMethod.PUT))
                .andExpect(header("x-cos-meta-origin", "lexiang"))
                .andExpect(header("x-cos-security-token", "temporary-cos-token"))
                .andExpect(content().bytes("course-content".getBytes(StandardCharsets.UTF_8)))
                .andRespond(withSuccess().header(HttpHeaders.ETAG, "\"etag-001\""));
        server.expect(requestTo(API_BASE + "/cgi-bin/v1/kb/entries?space_id=space-course&state=upload-state-001"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andExpect(header("x-staff-id", "knowledge-manager"))
                .andExpect(jsonPath("$.data.attributes.name").value("课程资料.pdf"))
                .andExpect(jsonPath("$.data.attributes.entry_type").value("file"))
                .andRespond(withSuccess("""
                        {"data":{"id":"entry-course-001"}}
                        """, MediaType.APPLICATION_JSON));

        String entryId = client.createFile(
                "课程资料.pdf",
                "course-content".getBytes(StandardCharsets.UTF_8),
                LexiangKnowledgeClient.LexiangEntryType.FILE
        );

        assertThat(entryId).isEqualTo("entry-course-001");
        server.verify();
    }

    @Test
    void deletesEntryWithSystemBotIdentity() {
        expectToken();
        server.expect(requestTo(API_BASE + "/cgi-bin/v1/kb/entries/entry-course-001"))
                .andExpect(method(HttpMethod.DELETE))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andExpect(header("x-staff-id", "system-bot"))
                .andRespond(withSuccess());

        client.delete("entry-course-001");

        server.verify();
    }

    private void expectToken() {
        server.expect(requestTo(API_BASE + "/cgi-bin/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"access_token":"test-token","expires_in":3600}
                        """, MediaType.APPLICATION_JSON));
    }

    private static LexiangProperties properties() {
        return new LexiangProperties(
                true,
                URI.create(API_BASE),
                "app-key",
                "app-secret",
                "system-bot",
                "knowledge-manager",
                "space-course",
                1
        );
    }
}
