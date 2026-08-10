package com.sufe.ai.provider.lexiang;

import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthenticationException;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthorizationException;
import com.sufe.ai.provider.lexiang.exception.LexiangClientException;
import com.sufe.ai.provider.lexiang.exception.LexiangRateLimitException;
import com.sufe.ai.provider.lexiang.exception.LexiangServerException;
import com.sufe.ai.provider.session.domain.ProviderSession;
import com.sufe.ai.provider.session.service.ProviderSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LexiangAiQaClientTests {

    private static final String API_BASE = "https://mock.lexiang.invalid";
    private static final String TOKEN_URL = API_BASE + "/cgi-bin/token";
    private static final String QA_URL = API_BASE + "/cgi-bin/v1/ai/qa";
    private static final String ANONYMOUS_STAFF_ID = "anonymous-staff-001";

    private ProviderSessionService providerSessionService;
    private MockRestServiceServer server;
    private MutableClock clock;
    private LexiangAiQaClient client;
    private ProviderSession providerSession;

    @BeforeEach
    void setUp() {
        providerSessionService = mock(ProviderSessionService.class);
        RestClient.Builder restClientBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(restClientBuilder).build();
        clock = new MutableClock(Instant.parse("2026-07-13T08:00:00Z"), ZoneOffset.UTC);
        client = new LexiangAiQaClient(properties(), providerSessionService, restClientBuilder, clock);
        providerSession = ProviderSession.create(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG,
                ANONYMOUS_STAFF_ID
        );
        when(providerSessionService.getOrCreate(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG
        )).thenReturn(providerSession);
    }

    @Test
    void createsAnonymousSessionAndParsesDirectReferenceDocs() {
        expectToken("test-token", 3600);
        server.expect(requestTo(QA_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andExpect(header("x-staff-id", "system-bot"))
                .andExpect(jsonPath("$.query").value("生成商业计划书提纲"))
                .andExpect(jsonPath("$.stream").value(false))
                .andExpect(jsonPath("$.anonymous_staff_id").value(ANONYMOUS_STAFF_ID))
                .andExpect(jsonPath("$.skip_faq").value(true))
                .andExpect(jsonPath("$.new_session").value(true))
                .andExpect(jsonPath("$.session_id").doesNotExist())
                .andExpect(jsonPath("$.qa_mode").value("normal"))
                .andExpect(jsonPath("$.max_chars").value(1800))
                .andExpect(jsonPath("$.language").value("zh-CN"))
                .andExpect(jsonPath("$.targets[0].type").value("kb_entry"))
                .andExpect(jsonPath("$.targets[0].id").value("entry-001"))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "content": "第一版提纲",
                            "session_id": "lexiang-session-001",
                            "reference_docs": [
                              {
                                "title": "创业课程资料",
                                "url": "https://example.invalid/doc-001",
                                "content": "参考摘要",
                                "ignored_field": "ignored"
                              }
                            ]
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        LexiangQaResult result = client.ask(command(
                "生成商业计划书提纲",
                List.of(new LexiangTarget("kb_entry", "entry-001"))
        ));

        assertThat(result.content()).isEqualTo("第一版提纲");
        assertThat(result.sessionId()).isEqualTo("lexiang-session-001");
        assertThat(result.referenceDocs()).containsExactly(new LexiangReferenceDoc(
                "创业课程资料",
                "https://example.invalid/doc-001",
                "参考摘要"
        ));
        assertThat(result.verifiedUsage()).isEmpty();
        verify(providerSessionService).updateExternalSessionId(providerSession.getId(), "lexiang-session-001");
        server.verify();
    }

    @Test
    void reusesTokenAndExistingSessionAndFallsBackToConfiguredSpaceTarget() {
        providerSession.updateExternalSessionId("lexiang-session-existing");
        expectToken("cached-token", 3600);
        server.expect(ExpectedCount.twice(), requestTo(QA_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer cached-token"))
                .andExpect(jsonPath("$.new_session").value(false))
                .andExpect(jsonPath("$.session_id").value("lexiang-session-existing"))
                .andExpect(jsonPath("$.targets[0].type").value("space"))
                .andExpect(jsonPath("$.targets[0].id").value("space-default"))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "content": "修改后的内容",
                            "session_id": "lexiang-session-existing",
                            "additional_content": {
                              "reference_docs": [
                                {"title": "课程知识库", "url": "https://example.invalid/doc-002"}
                              ]
                            }
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        LexiangQaResult first = client.ask(command("补充市场分析", List.of()));
        LexiangQaResult second = client.ask(command("补充财务预测", List.of()));

        assertThat(first.referenceDocs()).hasSize(1);
        assertThat(second.sessionId()).isEqualTo("lexiang-session-existing");
        verify(providerSessionService, org.mockito.Mockito.times(2))
                .updateExternalSessionId(providerSession.getId(), "lexiang-session-existing");
        server.verify();
    }

    @Test
    void refreshesTokenAfterCachedTokenExpires() {
        providerSession.updateExternalSessionId("lexiang-session-existing");
        expectToken("short-lived-token", 10);
        expectQa("short-lived-token", "第一次回答");
        expectToken("refreshed-token", 3600);
        expectQa("refreshed-token", "第二次回答");

        client.ask(command("第一次请求", List.of()));
        clock.advance(Duration.ofSeconds(9));
        LexiangQaResult result = client.ask(command("第二次请求", List.of()));

        assertThat(result.content()).isEqualTo("第二次回答");
        server.verify();
    }

    @ParameterizedTest
    @MethodSource("httpErrors")
    void mapsQaHttpErrorsToTypedExceptions(
            HttpStatus status,
            Class<? extends LexiangClientException> expectedType
    ) {
        expectToken("test-token", 3600);
        server.expect(requestTo(QA_URL))
                .andRespond(withStatus(status)
                        .header(HttpHeaders.RETRY_AFTER, "7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"detail\":\"sensitive-response-body\"}"));

        Throwable thrown = catchThrowable(() -> client.ask(command("触发错误", List.of())));

        assertThat(thrown)
                .isExactlyInstanceOf(expectedType)
                .hasMessageNotContaining("sensitive-response-body");
        LexiangClientException exception = (LexiangClientException) thrown;
        assertThat(exception.getStatusCode()).isEqualTo(status.value());
        assertThat(exception.getOperation()).isEqualTo("AI 问答");
        if (exception instanceof LexiangRateLimitException rateLimitException) {
            assertThat(rateLimitException.getRetryAfterSeconds()).isEqualTo(7);
        }
        verify(providerSessionService, never()).updateExternalSessionId(anyString(), anyString());
        server.verify();
    }

    @Test
    void mapsTokenUnauthorizedWithoutCallingQa() {
        server.expect(requestTo(TOKEN_URL))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"access_token\":\"must-not-leak\"}"));

        assertThatThrownBy(() -> client.ask(command("获取令牌失败", List.of())))
                .isExactlyInstanceOf(LexiangAuthenticationException.class)
                .hasMessageNotContaining("must-not-leak");
        server.verify();
    }

    @Test
    void rejectsOversizedQueryBeforeSessionOrHttpCall() {
        assertThatThrownBy(() -> new LexiangQaCommand(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                "问".repeat(1025),
                List.of()
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1024");

        verifyNoInteractions(providerSessionService);
        server.verify();
    }

    @Test
    void rejectsMixedTargetTypesBeforeSessionOrHttpCall() {
        assertThatThrownBy(() -> command("测试混合范围", List.of(
                new LexiangTarget("space", "space-001"),
                new LexiangTarget("kb_entry", "entry-001")
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("同一种范围类型");

        verifyNoInteractions(providerSessionService);
        server.verify();
    }

    @Test
    void rejectsInvalidAnonymousStaffIdBeforeTokenRequest() {
        ProviderSession invalidSession = mock(ProviderSession.class);
        when(invalidSession.getAnonymousStaffId()).thenReturn("too-short");
        when(providerSessionService.getOrCreate(
                "user-001",
                "project-001",
                "conversation-001",
                "pitch-expert",
                GenerationProvider.LEXIANG
        )).thenReturn(invalidSession);

        assertThatThrownBy(() -> client.ask(command("测试匿名身份", List.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("anonymous_staff_id");
        server.verify();
    }

    @Test
    void requestAndResultToStringDoNotExposeFullContent() {
        LexiangQaCommand command = command("不可记录的完整输入", List.of());
        LexiangQaResult result = new LexiangQaResult("不可记录的完整回答", "session-secret", List.of());

        assertThat(command.toString()).doesNotContain(command.query());
        assertThat(result.toString())
                .doesNotContain(result.content())
                .doesNotContain(result.sessionId());
    }

    private void expectToken(String token, long expiresIn) {
        server.expect(requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.grant_type").value("client_credentials"))
                .andExpect(jsonPath("$.app_key").value("test-app-key"))
                .andExpect(jsonPath("$.app_secret").value("test-app-secret"))
                .andRespond(withSuccess(
                        "{\"access_token\":\"" + token + "\",\"expires_in\":" + expiresIn + "}",
                        MediaType.APPLICATION_JSON
                ));
    }

    private void expectQa(String token, String content) {
        server.expect(requestTo(QA_URL))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andRespond(withSuccess("""
                        {
                          "code": 0,
                          "data": {
                            "content": "%s",
                            "session_id": "lexiang-session-existing",
                            "reference_docs": []
                          }
                        }
                        """.formatted(content), MediaType.APPLICATION_JSON));
    }

    private static Stream<Arguments> httpErrors() {
        return Stream.of(
                Arguments.of(HttpStatus.UNAUTHORIZED, LexiangAuthenticationException.class),
                Arguments.of(HttpStatus.FORBIDDEN, LexiangAuthorizationException.class),
                Arguments.of(HttpStatus.TOO_MANY_REQUESTS, LexiangRateLimitException.class),
                Arguments.of(HttpStatus.INTERNAL_SERVER_ERROR, LexiangServerException.class),
                Arguments.of(HttpStatus.SERVICE_UNAVAILABLE, LexiangServerException.class)
        );
    }

    private static LexiangQaCommand command(String query, List<LexiangTarget> targets) {
        return new LexiangQaCommand(
                " user-001 ",
                " project-001 ",
                " conversation-001 ",
                " pitch-expert ",
                query,
                targets
        );
    }

    private static LexiangProperties properties() {
        return new LexiangProperties(
                true,
                URI.create(API_BASE),
                "test-app-key",
                "test-app-secret",
                "system-bot",
                "knowledge-manager",
                "space-default",
                2
        );
    }

    private static final class MutableClock extends Clock {
        private Instant currentInstant;
        private final ZoneId zone;

        private MutableClock(Instant currentInstant, ZoneId zone) {
            this.currentInstant = currentInstant;
            this.zone = zone;
        }

        private void advance(Duration duration) {
            currentInstant = currentInstant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId newZone) {
            return new MutableClock(currentInstant, newZone);
        }

        @Override
        public Instant instant() {
            return currentInstant;
        }
    }
}
