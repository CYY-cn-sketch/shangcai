package com.sufe.ai.provider.lexiang;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthenticationException;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthorizationException;
import com.sufe.ai.provider.lexiang.exception.LexiangClientException;
import com.sufe.ai.provider.lexiang.exception.LexiangProtocolException;
import com.sufe.ai.provider.lexiang.exception.LexiangRateLimitException;
import com.sufe.ai.provider.lexiang.exception.LexiangRequestException;
import com.sufe.ai.provider.lexiang.exception.LexiangServerException;
import com.sufe.ai.provider.session.domain.ProviderSession;
import com.sufe.ai.provider.session.service.ProviderSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Component
public class LexiangAiQaClient {

    private static final String TOKEN_PATH = "/cgi-bin/token";
    private static final String QA_PATH = "/cgi-bin/v1/ai/qa";
    private static final String ANONYMOUS_STAFF_HEADER = "system-bot";
    private static final String TOKEN_OPERATION = "获取 access_token";
    private static final String QA_OPERATION = "AI 问答";
    private static final long DEFAULT_TOKEN_TTL_SECONDS = 7200;
    private static final int PPT_MAX_CHARS = 1800;

    private final LexiangProperties properties;
    private final ProviderSessionService providerSessionService;
    private final RestClient restClient;
    private final Clock clock;
    private final Object tokenMonitor = new Object();

    private volatile CachedToken cachedToken;

    @Autowired
    public LexiangAiQaClient(
            LexiangProperties properties,
            ProviderSessionService providerSessionService,
            RestClient.Builder restClientBuilder
    ) {
        this(properties, providerSessionService, restClientBuilder, Clock.systemUTC());
    }

    LexiangAiQaClient(
            LexiangProperties properties,
            ProviderSessionService providerSessionService,
            RestClient.Builder restClientBuilder,
            Clock clock
    ) {
        this.properties = Objects.requireNonNull(properties, "properties 不能为空");
        this.providerSessionService = Objects.requireNonNull(providerSessionService, "providerSessionService 不能为空");
        this.clock = Objects.requireNonNull(clock, "clock 不能为空");
        Objects.requireNonNull(restClientBuilder, "restClientBuilder 不能为空");
        if (properties.apiBase() == null) {
            throw new IllegalArgumentException("lexiang.apiBase 不能为空");
        }
        this.restClient = restClientBuilder.baseUrl(properties.apiBase().toString()).build();
    }

    public LexiangQaResult ask(LexiangQaCommand command) {
        Objects.requireNonNull(command, "command 不能为空");
        requireConfigured();

        ProviderSession providerSession = providerSessionService.getOrCreate(
                command.userId(),
                command.projectId(),
                command.conversationId(),
                command.expertId(),
                GenerationProvider.LEXIANG
        );
        String anonymousStaffId = requireAnonymousStaffId(providerSession.getAnonymousStaffId());
        String externalSessionId = trimToNull(providerSession.getExternalSessionId());
        boolean newSession = externalSessionId == null;
        QaRequest request = new QaRequest(
                command.query(),
                false,
                anonymousStaffId,
                true,
                newSession,
                externalSessionId,
                "normal",
                PPT_MAX_CHARS,
                "zh-CN",
                resolveTargets(command.targets())
        );

        String accessToken = getAccessToken();
        QaResponse response;
        try {
            response = executeQa(accessToken, request);
        } catch (LexiangAuthenticationException exception) {
            invalidateCachedToken(accessToken);
            throw exception;
        }

        LexiangQaResult result = toResult(response);
        providerSessionService.updateExternalSessionId(providerSession.getId(), result.sessionId());
        return result;
    }

    private void requireConfigured() {
        if (!properties.configured()) {
            throw new IllegalStateException("乐享服务未启用或 appKey/appSecret 未配置");
        }
        if (!ANONYMOUS_STAFF_HEADER.equals(properties.staffId())) {
            throw new IllegalStateException("匿名乐享请求的 staffId 必须为 system-bot");
        }
    }

    private List<LexiangTarget> resolveTargets(List<LexiangTarget> requestedTargets) {
        if (!requestedTargets.isEmpty()) {
            return requestedTargets;
        }
        String spaceId = trimToNull(properties.spaceId());
        return spaceId == null ? List.of() : List.of(new LexiangTarget("space", spaceId));
    }

    private String getAccessToken() {
        Instant now = clock.instant();
        CachedToken current = cachedToken;
        if (current != null && current.validAt(now)) {
            return current.value;
        }

        synchronized (tokenMonitor) {
            now = clock.instant();
            current = cachedToken;
            if (current != null && current.validAt(now)) {
                return current.value;
            }

            TokenResponse response = executeTokenRequest(new TokenRequest(
                    "client_credentials",
                    properties.appKey(),
                    properties.appSecret()
            ));
            if (response == null || trimToNull(response.accessToken()) == null) {
                throw new LexiangProtocolException(TOKEN_OPERATION, "缺少 access_token");
            }
            long ttlSeconds = response.expiresIn() == null || response.expiresIn() <= 0
                    ? DEFAULT_TOKEN_TTL_SECONDS
                    : response.expiresIn();
            long safetySeconds = Math.min(120, Math.max(1, ttlSeconds / 10));
            Instant expiresAt = now.plusSeconds(Math.max(1, ttlSeconds - safetySeconds));
            CachedToken refreshed = new CachedToken(response.accessToken(), expiresAt);
            cachedToken = refreshed;
            return refreshed.value;
        }
    }

    private TokenResponse executeTokenRequest(TokenRequest request) {
        try {
            return restClient.post()
                    .uri(TOKEN_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (httpRequest, response) -> {
                        throw mapHttpException(TOKEN_OPERATION, response);
                    })
                    .body(TokenResponse.class);
        } catch (LexiangClientException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new LexiangClientException("乐享 access_token 通信失败", TOKEN_OPERATION, exception);
        }
    }

    private QaResponse executeQa(String accessToken, QaRequest request) {
        try {
            return restClient.post()
                    .uri(QA_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("x-staff-id", ANONYMOUS_STAFF_HEADER)
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (httpRequest, response) -> {
                        throw mapHttpException(QA_OPERATION, response);
                    })
                    .body(QaResponse.class);
        } catch (LexiangClientException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new LexiangClientException("乐享 AI 问答通信失败", QA_OPERATION, exception);
        }
    }

    private LexiangClientException mapHttpException(String operation, ClientHttpResponse response) throws IOException {
        int statusCode = response.getStatusCode().value();
        if (statusCode == 401) {
            return new LexiangAuthenticationException(operation);
        }
        if (statusCode == 403) {
            return new LexiangAuthorizationException(operation);
        }
        if (statusCode == 429) {
            return new LexiangRateLimitException(operation, parseRetryAfter(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)));
        }
        if (statusCode >= 500) {
            return new LexiangServerException(operation, statusCode);
        }
        return new LexiangRequestException(operation, statusCode);
    }

    private LexiangQaResult toResult(QaResponse response) {
        if (response == null) {
            throw new LexiangProtocolException(QA_OPERATION, "响应为空");
        }
        if (response.code() != null && response.code() != 0) {
            throw new LexiangProtocolException(QA_OPERATION, "业务错误码 " + response.code());
        }
        if (response.data() == null) {
            throw new LexiangProtocolException(QA_OPERATION, "缺少 data");
        }

        QaData data = response.data();
        String content = trimToNull(data.content());
        String sessionId = trimToNull(data.sessionId());
        if (content == null) {
            throw new LexiangProtocolException(QA_OPERATION, "缺少 data.content");
        }
        if (sessionId == null) {
            throw new LexiangProtocolException(QA_OPERATION, "缺少 data.session_id");
        }
        List<LexiangReferenceDoc> referenceDocs = data.referenceDocs();
        if ((referenceDocs == null || referenceDocs.isEmpty()) && data.additionalContent() != null) {
            referenceDocs = data.additionalContent().referenceDocs();
        }
        if (referenceDocs == null) {
            referenceDocs = List.of();
        } else {
            referenceDocs = referenceDocs.stream().filter(Objects::nonNull).toList();
        }
        return new LexiangQaResult(content, sessionId, referenceDocs);
    }

    private void invalidateCachedToken(String rejectedToken) {
        synchronized (tokenMonitor) {
            if (cachedToken != null && cachedToken.value.equals(rejectedToken)) {
                cachedToken = null;
            }
        }
    }

    private static String requireAnonymousStaffId(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || normalized.length() < 16 || normalized.length() > 32) {
            throw new IllegalArgumentException("anonymous_staff_id 长度必须在 16 到 32 之间");
        }
        return normalized;
    }

    private static Long parseRetryAfter(String value) {
        if (value == null) {
            return null;
        }
        try {
            long seconds = Long.parseLong(value.trim());
            return seconds >= 0 ? seconds : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static final class CachedToken {
        private final String value;
        private final Instant expiresAt;

        private CachedToken(String value, Instant expiresAt) {
            this.value = value;
            this.expiresAt = expiresAt;
        }

        private boolean validAt(Instant instant) {
            return instant.isBefore(expiresAt);
        }
    }

    private record TokenRequest(
            @JsonProperty("grant_type") String grantType,
            @JsonProperty("app_key") String appKey,
            @JsonProperty("app_secret") String appSecret
    ) {
        @Override
        public String toString() {
            return "TokenRequest[grantType=" + grantType + ", appKey=<redacted>, appSecret=<redacted>]";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn
    ) {
        @Override
        public String toString() {
            return "TokenResponse[accessToken=<redacted>, expiresIn=" + expiresIn + "]";
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record QaRequest(
            String query,
            boolean stream,
            @JsonProperty("anonymous_staff_id") String anonymousStaffId,
            @JsonProperty("skip_faq") boolean skipFaq,
            @JsonProperty("new_session") boolean newSession,
            @JsonProperty("session_id") String sessionId,
            @JsonProperty("qa_mode") String qaMode,
            @JsonProperty("max_chars") int maxChars,
            String language,
            List<LexiangTarget> targets
    ) {
        @Override
        public String toString() {
            return "QaRequest[queryLength="
                    + query.codePointCount(0, query.length())
                    + ", newSession="
                    + newSession
                    + ", hasSessionId="
                    + (sessionId != null)
                    + ", targetCount="
                    + targets.size()
                    + "]";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record QaResponse(Integer code, QaData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record QaData(
            String content,
            @JsonProperty("session_id") String sessionId,
            @JsonProperty("reference_docs") List<LexiangReferenceDoc> referenceDocs,
            @JsonProperty("additional_content") AdditionalContent additionalContent
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AdditionalContent(
            @JsonProperty("reference_docs") List<LexiangReferenceDoc> referenceDocs
    ) {
    }
}
