package com.sufe.ai.provider.lexiang;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthenticationException;
import com.sufe.ai.provider.lexiang.exception.LexiangAuthorizationException;
import com.sufe.ai.provider.lexiang.exception.LexiangClientException;
import com.sufe.ai.provider.lexiang.exception.LexiangProtocolException;
import com.sufe.ai.provider.lexiang.exception.LexiangRateLimitException;
import com.sufe.ai.provider.lexiang.exception.LexiangRequestException;
import com.sufe.ai.provider.lexiang.exception.LexiangServerException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class LexiangKnowledgeClient {

    private static final String TOKEN_PATH = "/cgi-bin/token";
    private static final String UPLOAD_PARAMS_PATH = "/cgi-bin/v1/kb/files/upload-params";
    private static final String ENTRY_PATH = "/cgi-bin/v1/kb/entries";
    private static final long DEFAULT_TOKEN_TTL_SECONDS = 7200;

    private final LexiangProperties properties;
    private final RestClient restClient;
    private final Clock clock;
    private final Object tokenMonitor = new Object();

    private volatile CachedToken cachedToken;

    @Autowired
    public LexiangKnowledgeClient(LexiangProperties properties, RestClient.Builder restClientBuilder) {
        this(properties, restClientBuilder, Clock.systemUTC());
    }

    LexiangKnowledgeClient(LexiangProperties properties, RestClient.Builder restClientBuilder, Clock clock) {
        this.properties = Objects.requireNonNull(properties, "properties 不能为空");
        this.clock = Objects.requireNonNull(clock, "clock 不能为空");
        Objects.requireNonNull(restClientBuilder, "restClientBuilder 不能为空");
        if (properties.apiBase() == null) throw new IllegalArgumentException("lexiang.apiBase 不能为空");
        this.restClient = restClientBuilder.baseUrl(properties.apiBase().toString()).build();
    }

    public String createFile(String name, byte[] content, LexiangEntryType entryType) {
        String configuredSpaceId = trimToNull(properties.spaceId());
        if (configuredSpaceId == null) {
            throw new IllegalStateException("未配置乐享知识库 spaceId");
        }
        return createFile(name, content, entryType, configuredSpaceId, null);
    }

    public String createFile(
            String name,
            byte[] content,
            LexiangEntryType entryType,
            String spaceId,
            String parentEntryId
    ) {
        requireKnowledgeConfigured();
        validateNameAndContent(name, content);
        String normalizedSpaceId = requireRemoteId(spaceId, "spaceId");
        String normalizedParentId = trimToNull(parentEntryId) == null
                ? null
                : requireRemoteId(parentEntryId, "parentEntryId");
        PreparedUpload upload = uploadBinary(name, content, entryType);
        CreateEntryResponse response = authenticated("创建知识节点", token -> restClient.post()
                .uri(builder -> builder.path(ENTRY_PATH)
                        .queryParam("space_id", normalizedSpaceId)
                        .queryParam("state", upload.state())
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("x-staff-id", properties.knowledgeStaffId().trim())
                .body(new CreateEntryRequest(new EntryData(
                        "kb_entry",
                        new EntryAttributes(name.trim(), entryType.apiValue()),
                        normalizedParentId == null
                                ? null
                                : new EntryRelationships(new ParentEntryRelationship(
                                        new RelatedEntry("kb_entry", normalizedParentId)
                                ))
                )))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                    throw mapHttpException("创建知识节点", httpResponse);
                })
                .body(CreateEntryResponse.class));
        String entryId = response == null || response.data() == null ? null : trimToNull(response.data().id());
        if (entryId == null) throw new LexiangProtocolException("创建知识节点", "缺少 data.id");
        return entryId;
    }

    public LexiangEntryPage listEntries(String spaceId, String parentId, String pageToken) {
        requireKnowledgeConfigured();
        String normalizedSpaceId = requireRemoteId(spaceId, "spaceId");
        String normalizedParentId = trimToNull(parentId) == null ? null : requireRemoteId(parentId, "parentId");
        String normalizedPageToken = validatePageToken(pageToken);
        ListEntriesResponse response = authenticated("获取知识列表", token -> restClient.get()
                .uri(builder -> {
                    var uri = builder.path(ENTRY_PATH)
                            .queryParam("space_id", normalizedSpaceId)
                            .queryParam("limit", 100);
                    if (normalizedParentId != null) uri.queryParam("parent_id", normalizedParentId);
                    if (normalizedPageToken != null) uri.queryParam("page_token", normalizedPageToken);
                    return uri.build();
                })
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("x-staff-id", properties.knowledgeStaffId().trim())
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                    throw mapHttpException("获取知识列表", httpResponse);
                })
                .body(ListEntriesResponse.class));
        List<LexiangEntrySummary> entries = response == null || response.data() == null
                ? List.of()
                : response.data().stream().map(LexiangKnowledgeClient::toSummary).toList();
        String nextPageToken = response == null || response.meta() == null
                ? null
                : trimToNull(response.meta().pageToken());
        return new LexiangEntryPage(entries, nextPageToken);
    }

    public LexiangEntryDetail describeEntry(String entryId) {
        requireKnowledgeConfigured();
        String normalizedEntryId = requireEntryId(entryId);
        DescribeEntryResponse response = authenticated("获取知识详情", token -> restClient.get()
                .uri(ENTRY_PATH + "/{entryId}", normalizedEntryId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("x-staff-id", properties.knowledgeStaffId().trim())
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                    throw mapHttpException("获取知识详情", httpResponse);
                })
                .body(DescribeEntryResponse.class));
        if (response == null || response.data() == null) {
            throw new LexiangProtocolException("获取知识详情", "缺少 data");
        }
        EntryResource data = response.data();
        EntryResourceAttributes attributes = data.attributes();
        if (attributes == null) throw new LexiangProtocolException("获取知识详情", "缺少 data.attributes");
        return new LexiangEntryDetail(
                requireEntryId(data.id()),
                requireRemoteName(attributes.name()),
                requireEntryType(attributes.entryType()),
                normalizeRemoteVersion(attributes.updatedAt()),
                attributes.hasChildren(),
                response.links() == null ? null : trimToNull(response.links().download())
        );
    }

    public void replaceFile(String entryId, String name, byte[] content, LexiangEntryType entryType) {
        requireKnowledgeConfigured();
        String normalizedEntryId = requireEntryId(entryId);
        validateNameAndContent(name, content);
        PreparedUpload upload = uploadBinary(name, content, entryType);
        authenticated("重新上传知识文件", token -> {
            restClient.put()
                    .uri(builder -> builder.path(ENTRY_PATH + "/{entryId}/upload")
                            .queryParam("state", upload.state())
                            .build(normalizedEntryId))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("x-staff-id", properties.knowledgeStaffId().trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        throw mapHttpException("重新上传知识文件", httpResponse);
                    })
                    .toBodilessEntity();
            return null;
        });
    }

    public void rename(String entryId, String name) {
        requireKnowledgeConfigured();
        String normalizedEntryId = requireEntryId(entryId);
        validateName(name);
        authenticated("更名知识节点", token -> {
            restClient.put()
                    .uri(ENTRY_PATH + "/{entryId}/rename", normalizedEntryId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("x-staff-id", properties.knowledgeStaffId().trim())
                    .body(new RenameEntryRequest(new RenameEntryData(new RenameAttributes(name.trim()))))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        throw mapHttpException("更名知识节点", httpResponse);
                    })
                    .toBodilessEntity();
            return null;
        });
    }

    public void setEnabled(String entryId, boolean enabled) {
        requireKnowledgeConfigured();
        String normalizedEntryId = requireEntryId(entryId);
        authenticated("设置知识有效期", token -> {
            restClient.put()
                    .uri(ENTRY_PATH + "/{entryId}/validity", normalizedEntryId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("x-staff-id", properties.knowledgeStaffId().trim())
                    .body(new ValidityRequest(new ValidityData(
                            "kb_entry",
                            new ValidityAttributes(enabled ? "permanent" : "force_expire")
                    )))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        throw mapHttpException("设置知识有效期", httpResponse);
                    })
                    .toBodilessEntity();
            return null;
        });
    }

    public void delete(String entryId) {
        requireKnowledgeConfigured();
        String normalizedEntryId = requireEntryId(entryId);
        authenticated("删除知识节点", token -> {
            restClient.delete()
                    .uri(ENTRY_PATH + "/{entryId}", normalizedEntryId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("x-staff-id", "system-bot")
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        throw mapHttpException("删除知识节点", httpResponse);
                    })
                    .toBodilessEntity();
            return null;
        });
    }

    private PreparedUpload uploadBinary(String name, byte[] content, LexiangEntryType entryType) {
        UploadParamsResponse response = authenticated("申请知识文件上传", token -> restClient.post()
                .uri(UPLOAD_PARAMS_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("x-staff-id", properties.knowledgeStaffId().trim())
                .body(new UploadParamsRequest(name.trim(), entryType.mediaType()))
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                    throw mapHttpException("申请知识文件上传", httpResponse);
                })
                .body(UploadParamsResponse.class));
        UploadObject object = response == null ? null : response.object();
        String state = object == null ? null : trimToNull(object.state());
        URI uploadUri = object == null ? null : validateUploadUri(object.uploadUrl());
        String securityToken = object == null || object.auth() == null
                ? null
                : trimToNull(object.auth().securityToken());
        if (state == null || uploadUri == null || securityToken == null) {
            throw new LexiangProtocolException("申请知识文件上传", "缺少 state、upload_url 或临时安全令牌");
        }

        Map<String, String> dynamicHeaders = object.headers() == null ? Map.of() : Map.copyOf(object.headers());
        try {
            var uploadResponse = restClient.put()
                    .uri(uploadUri)
                    .headers(headers -> dynamicHeaders.forEach(headers::set))
                    .header("x-cos-security-token", securityToken)
                    .body(content)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                        throw mapHttpException("上传知识文件二进制", httpResponse);
                    })
                    .toBodilessEntity();
            if (trimToNull(uploadResponse.getHeaders().getETag()) == null) {
                throw new LexiangProtocolException("上传知识文件二进制", "COS 响应缺少 ETag");
            }
        } catch (LexiangClientException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new LexiangClientException("乐享知识文件二进制上传通信失败", "上传知识文件二进制", exception);
        }
        return new PreparedUpload(state);
    }

    private <T> T authenticated(String operation, AuthenticatedCall<T> call) {
        String token = getAccessToken();
        try {
            return call.execute(token);
        } catch (LexiangAuthenticationException exception) {
            invalidateCachedToken(token);
            throw exception;
        } catch (LexiangClientException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new LexiangClientException("乐享通信失败（操作：" + operation + "）", operation, exception);
        }
    }

    private String getAccessToken() {
        Instant now = clock.instant();
        CachedToken current = cachedToken;
        if (current != null && current.validAt(now)) return current.value();
        synchronized (tokenMonitor) {
            now = clock.instant();
            current = cachedToken;
            if (current != null && current.validAt(now)) return current.value();
            TokenResponse response;
            try {
                response = restClient.post()
                        .uri(TOKEN_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(new TokenRequest("client_credentials", properties.appKey(), properties.appSecret()))
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, (request, httpResponse) -> {
                            throw mapHttpException("获取 access_token", httpResponse);
                        })
                        .body(TokenResponse.class);
            } catch (LexiangClientException exception) {
                throw exception;
            } catch (RestClientException exception) {
                throw new LexiangClientException("乐享 access_token 通信失败", "获取 access_token", exception);
            }
            String token = response == null ? null : trimToNull(response.accessToken());
            if (token == null) throw new LexiangProtocolException("获取 access_token", "缺少 access_token");
            long ttl = response.expiresIn() == null || response.expiresIn() <= 0
                    ? DEFAULT_TOKEN_TTL_SECONDS
                    : response.expiresIn();
            long safetySeconds = Math.min(120, Math.max(1, ttl / 10));
            cachedToken = new CachedToken(token, now.plusSeconds(Math.max(1, ttl - safetySeconds)));
            return token;
        }
    }

    private void invalidateCachedToken(String rejectedToken) {
        synchronized (tokenMonitor) {
            if (cachedToken != null && cachedToken.value().equals(rejectedToken)) cachedToken = null;
        }
    }

    private void requireKnowledgeConfigured() {
        if (!properties.knowledgeConfigured()) {
            throw new IllegalStateException("乐享知识库未启用，或知识库成员帐号、AppKey/AppSecret 未配置");
        }
    }

    private static URI validateUploadUri(String rawUrl) {
        String value = trimToNull(rawUrl);
        if (value == null) return null;
        URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException exception) {
            throw new LexiangProtocolException("申请知识文件上传", "upload_url 不是有效 URI");
        }
        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(uri.getScheme())
                || host == null
                || !host.toLowerCase(Locale.ROOT).endsWith(".myqcloud.com")
                || uri.getRawUserInfo() != null
                || uri.getRawFragment() != null) {
            throw new LexiangProtocolException("申请知识文件上传", "upload_url 不在受信任的腾讯云 COS HTTPS 域名");
        }
        return uri;
    }

    private static String requireEntryId(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || !normalized.matches("[A-Za-z0-9_-]{8,128}")) {
            throw new IllegalArgumentException("乐享知识节点 ID 无效");
        }
        return normalized;
    }

    private static String requireRemoteId(String value, String field) {
        String normalized = trimToNull(value);
        if (normalized == null || normalized.length() > 128 || !normalized.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("乐享 " + field + " 无效");
        }
        return normalized;
    }

    private static String validatePageToken(String value) {
        String normalized = trimToNull(value);
        if (normalized != null && (normalized.length() > 2048 || normalized.chars().anyMatch(Character::isISOControl))) {
            throw new IllegalArgumentException("乐享 pageToken 无效");
        }
        return normalized;
    }

    private static LexiangEntrySummary toSummary(EntryResource resource) {
        if (resource == null || resource.attributes() == null) {
            throw new LexiangProtocolException("获取知识列表", "知识节点缺少属性");
        }
        return new LexiangEntrySummary(
                requireEntryId(resource.id()),
                requireRemoteName(resource.attributes().name()),
                requireEntryType(resource.attributes().entryType()),
                normalizeRemoteVersion(resource.attributes().updatedAt()),
                resource.attributes().hasChildren()
        );
    }

    private static String requireRemoteName(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || normalized.codePointCount(0, normalized.length()) > 255
                || normalized.chars().anyMatch(Character::isISOControl)) {
            throw new LexiangProtocolException("读取知识节点", "知识节点名称无效");
        }
        return normalized;
    }

    private static String requireEntryType(String value) {
        String normalized = trimToNull(value);
        if (normalized == null || !normalized.matches("[a-z_]{1,32}")) {
            throw new LexiangProtocolException("读取知识节点", "知识节点类型无效");
        }
        return normalized;
    }

    private static String normalizeRemoteVersion(String value) {
        String normalized = trimToNull(value);
        if (normalized != null && normalized.length() > 32) {
            throw new LexiangProtocolException("读取知识节点", "知识节点更新时间无效");
        }
        return normalized;
    }

    private static void validateNameAndContent(String name, byte[] content) {
        validateName(name);
        if (content == null || content.length == 0) throw new IllegalArgumentException("同步文件不能为空");
    }

    private static void validateName(String name) {
        String normalized = trimToNull(name);
        if (normalized == null || normalized.codePointCount(0, normalized.length()) > 150) {
            throw new IllegalArgumentException("乐享知识节点名称长度必须为 1 到 150 个字符");
        }
    }

    private static LexiangClientException mapHttpException(String operation, ClientHttpResponse response) throws IOException {
        int statusCode = response.getStatusCode().value();
        if (statusCode == 401) return new LexiangAuthenticationException(operation);
        if (statusCode == 403) return new LexiangAuthorizationException(operation);
        if (statusCode == 429) {
            return new LexiangRateLimitException(operation, parseRetryAfter(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)));
        }
        if (statusCode >= 500) return new LexiangServerException(operation, statusCode);
        return new LexiangRequestException(operation, statusCode);
    }

    private static Long parseRetryAfter(String value) {
        if (value == null) return null;
        try {
            long seconds = Long.parseLong(value.trim());
            return seconds >= 0 ? seconds : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @FunctionalInterface
    private interface AuthenticatedCall<T> {
        T execute(String token);
    }

    public enum LexiangEntryType {
        FILE("file", "file"),
        AUDIO("audio", "audio"),
        VIDEO("video", "video");

        private final String mediaType;
        private final String apiValue;

        LexiangEntryType(String mediaType, String apiValue) {
            this.mediaType = mediaType;
            this.apiValue = apiValue;
        }

        String mediaType() { return mediaType; }
        String apiValue() { return apiValue; }
    }

    public record LexiangEntryPage(List<LexiangEntrySummary> entries, String nextPageToken) {
        public LexiangEntryPage {
            entries = entries == null ? List.of() : List.copyOf(entries);
        }
    }

    public record LexiangEntrySummary(
            String id,
            String name,
            String entryType,
            String remoteUpdatedAt,
            boolean hasChildren
    ) {
        public boolean isFolder() { return "folder".equals(entryType); }
        public boolean isFile() { return "file".equals(entryType); }
    }

    public record LexiangEntryDetail(
            String id,
            String name,
            String entryType,
            String remoteUpdatedAt,
            boolean hasChildren,
            String downloadUrl
    ) {
        public boolean isFile() { return "file".equals(entryType); }
    }

    private record CachedToken(String value, Instant expiresAt) {
        private boolean validAt(Instant instant) { return instant.isBefore(expiresAt); }
    }

    private record PreparedUpload(String state) {}

    private record TokenRequest(
            @JsonProperty("grant_type") String grantType,
            @JsonProperty("app_key") String appKey,
            @JsonProperty("app_secret") String appSecret
    ) {
        @Override public String toString() {
            return "TokenRequest[grantType=" + grantType + ", appKey=<redacted>, appSecret=<redacted>]";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn
    ) {}

    private record UploadParamsRequest(String name, @JsonProperty("media_type") String mediaType) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UploadParamsResponse(UploadObject object) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UploadObject(
            String state,
            @JsonProperty("upload_url") String uploadUrl,
            Map<String, String> headers,
            UploadAuth auth
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UploadAuth(@JsonProperty("XCosSecurityToken") String securityToken) {}

    private record CreateEntryRequest(EntryData data) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record EntryData(String type, EntryAttributes attributes, EntryRelationships relationships) {}
    private record EntryAttributes(String name, @JsonProperty("entry_type") String entryType) {}
    private record EntryRelationships(@JsonProperty("parent_entry") ParentEntryRelationship parentEntry) {}
    private record ParentEntryRelationship(RelatedEntry data) {}
    private record RelatedEntry(String type, String id) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CreateEntryResponse(CreatedEntryData data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CreatedEntryData(String id) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ListEntriesResponse(List<EntryResource> data, PageMeta meta) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DescribeEntryResponse(EntryResource data, EntryLinks links) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record EntryResource(String id, EntryResourceAttributes attributes) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record EntryResourceAttributes(
            String name,
            @JsonProperty("entry_type") String entryType,
            @JsonProperty("updated_at") String updatedAt,
            @JsonProperty("has_children") boolean hasChildren
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PageMeta(@JsonProperty("page_token") String pageToken) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record EntryLinks(String download) {}

    private record RenameEntryRequest(RenameEntryData data) {}
    private record RenameEntryData(RenameAttributes attributes) {}
    private record RenameAttributes(String name) {}

    private record ValidityRequest(ValidityData data) {}
    private record ValidityData(String type, ValidityAttributes attributes) {}
    private record ValidityAttributes(@JsonProperty("validity_type") String validityType) {}
}
