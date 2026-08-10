package com.sufe.ai.provider.deepseek;

import com.sufe.ai.provider.config.DeepSeekProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DeepSeekChatClientTests {

    private MockRestServiceServer server;
    private DeepSeekChatClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new DeepSeekChatClient(
                new DeepSeekProperties(
                        true,
                        URI.create("https://deepseek.test"),
                        "test-api-key",
                        "deepseek-v4-flash",
                        "deepseek-v4-pro",
                        4096,
                        20,
                        12000
                ),
                builder
        );
    }

    @AfterEach
    void verifyRequests() {
        server.verify();
    }

    @Test
    void sendsServerSideConversationAndReturnsVerifiedUsage() {
        server.expect(once(), requestTo("https://deepseek.test/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-api-key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "model": "deepseek-v4-pro",
                          "messages": [
                            {"role":"system","content":"系统规则"},
                            {"role":"user","content":"请分析项目"}
                          ],
                          "thinking": {"type":"enabled","reasoning_effort":"high"},
                          "stream": false,
                          "max_tokens": 4096,
                          "user_id": "user-001"
                        }
                        """))
                .andRespond(withSuccess("""
                        {
                          "id":"chatcmpl-test-001",
                          "model":"deepseek-v4-pro",
                          "choices":[{"message":{"role":"assistant","content":"分析结果"}}],
                          "usage":{"prompt_tokens":120,"completion_tokens":40,"total_tokens":160}
                        }
                        """, MediaType.APPLICATION_JSON));

        DeepSeekChatResult result = client.chat(new DeepSeekChatCommand(
                "user-001",
                "deepseek-v4-pro",
                true,
                "high",
                List.of(
                        new DeepSeekMessage("system", "系统规则"),
                        new DeepSeekMessage("user", "请分析项目")
                )
        ));

        assertThat(result.content()).isEqualTo("分析结果");
        assertThat(result.model()).isEqualTo("deepseek-v4-pro");
        assertThat(result.verifiedUsage()).hasValueSatisfying(usage -> {
            assertThat(usage.requestId()).isEqualTo("chatcmpl-test-001");
            assertThat(usage.inputTokens()).isEqualTo(120);
            assertThat(usage.outputTokens()).isEqualTo(40);
        });
    }

    @Test
    void omitsReasoningEffortWhenThinkingIsDisabled() {
        server.expect(once(), requestTo("https://deepseek.test/chat/completions"))
                .andExpect(content().json("""
                        {
                          "model":"deepseek-v4-flash",
                          "thinking":{"type":"disabled"}
                        }
                        """))
                .andRespond(withSuccess("""
                        {
                          "id":"chatcmpl-test-002",
                          "model":"deepseek-v4-flash",
                          "choices":[{"message":{"content":"快速结果"}}],
                          "usage":{"prompt_tokens":20,"completion_tokens":8}
                        }
                        """, MediaType.APPLICATION_JSON));

        DeepSeekChatResult result = client.chat(new DeepSeekChatCommand(
                "user-001",
                "deepseek-v4-flash",
                false,
                "high",
                List.of(new DeepSeekMessage("user", "快速回答"))
        ));

        assertThat(result.content()).isEqualTo("快速结果");
    }

    @Test
    void mapsAuthenticationFailureWithoutExposingProviderBody() {
        server.expect(once(), requestTo("https://deepseek.test/chat/completions"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"sensitive provider detail\"}}"));

        assertThatThrownBy(() -> client.chat(new DeepSeekChatCommand(
                "user-001",
                "deepseek-v4-flash",
                false,
                "high",
                List.of(new DeepSeekMessage("user", "测试"))
        )))
                .isInstanceOfSatisfying(DeepSeekClientException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo("DEEPSEEK_AUTH_FAILED");
                    assertThat(exception.getResponseStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
                    assertThat(exception.getMessage()).doesNotContain("sensitive provider detail");
                });
    }

    @Test
    void reportsThinkingOutputExhaustionWithoutExposingReasoningContent() {
        server.expect(once(), requestTo("https://deepseek.test/chat/completions"))
                .andRespond(withSuccess("""
                        {
                          "id":"chatcmpl-test-exhausted",
                          "model":"deepseek-v4-flash",
                          "choices":[{
                            "finish_reason":"length",
                            "message":{
                              "content":"",
                              "reasoning_content":"sensitive internal reasoning"
                            }
                          }],
                          "usage":{"prompt_tokens":1200,"completion_tokens":4096}
                        }
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.chat(new DeepSeekChatCommand(
                "user-001",
                "deepseek-v4-flash",
                true,
                "high",
                List.of(new DeepSeekMessage("user", "生成十页路演大纲"))
        )))
                .isInstanceOfSatisfying(DeepSeekClientException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo("DEEPSEEK_OUTPUT_EXHAUSTED");
                    assertThat(exception.getMessage())
                            .contains("没有形成正式回复")
                            .doesNotContain("sensitive internal reasoning");
                });
    }
}
