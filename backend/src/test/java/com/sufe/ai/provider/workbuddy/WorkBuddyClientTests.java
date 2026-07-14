package com.sufe.ai.provider.workbuddy;

import com.sufe.ai.provider.config.WorkBuddyProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class WorkBuddyClientTests {

    private MockRestServiceServer server;
    private WorkBuddyClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new WorkBuddyClient(
                new WorkBuddyProperties(
                        true,
                        URI.create("http://workbuddy.test"),
                        Path.of("build/workbuddy-test-jobs"),
                        1
                ),
                builder
        );
    }

    @AfterEach
    void verifyRequests() {
        server.verify();
    }

    @Test
    void submitsTextAndSenderAndReturnsRunId() {
        server.expect(once(), requestTo("http://workbuddy.test/api/v1/runs"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-CodeBuddy-Request", "1"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "text": "生成宣传视频",
                          "sender": {
                            "id": "student-001",
                            "name": "测试学生"
                          }
                        }
                        """))
                .andRespond(withSuccess("""
                        {"data":{"runId":"run-001","status":"accepted"}}
                        """, MediaType.APPLICATION_JSON));

        WorkBuddyClient.RunSubmission result = client.submit(
                " 生成宣传视频 ",
                new WorkBuddyClient.Sender(" student-001 ", " 测试学生 ")
        );

        assertThat(result.runId()).isEqualTo("run-001");
    }

    @Test
    void queriesRunAndPreservesUnknownStatusData() {
        server.expect(once(), requestTo("http://workbuddy.test/api/v1/runs/run-002"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-CodeBuddy-Request", "1"))
                .andRespond(withSuccess("""
                        {
                          "data": {
                            "status": "future-vendor-status",
                            "progress": {"step": 3},
                            "newField": ["kept"]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        WorkBuddyClient.RunStatus result = client.getRun(" run-002 ");

        assertThat(result.runId()).isEqualTo("run-002");
        assertThat(result.data().path("status").asText()).isEqualTo("future-vendor-status");
        assertThat(result.data().path("progress").path("step").asInt()).isEqualTo(3);
        assertThat(result.data().path("newField").get(0).asText()).isEqualTo("kept");
    }

    @Test
    void parsesErrorEnvelopeWithoutMakingAnotherRequest() {
        server.expect(once(), requestTo("http://workbuddy.test/api/v1/runs/missing-run"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-CodeBuddy-Request", "1"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "error": {
                                    "code": "RUN_NOT_FOUND",
                                    "message": "Run not found"
                                  }
                                }
                                """));

        assertThatThrownBy(() -> client.getRun("missing-run"))
                .isInstanceOfSatisfying(WorkBuddyApiException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(404);
                    assertThat(exception.getErrorCode()).isEqualTo("RUN_NOT_FOUND");
                    assertThat(exception.getMessage()).isEqualTo("Run not found");
                });
    }

    @Test
    void rejectsSuccessfulEnvelopeWithoutRunId() {
        server.expect(once(), requestTo("http://workbuddy.test/api/v1/runs"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"data":{"status":"accepted"}}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.submit(
                "生成宣传视频",
                new WorkBuddyClient.Sender("student-001", "测试学生")
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("WorkBuddy 响应缺少 runId");
    }
}
