package com.sufe.ai.provider.deepseek;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.config.DeepSeekProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class DeepSeekChatClient {

    private static final String CHAT_COMPLETIONS_PATH = "/chat/completions";

    private final DeepSeekProperties properties;
    private final RestClient restClient;

    @Autowired
    public DeepSeekChatClient(DeepSeekProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = Objects.requireNonNull(properties, "properties 不能为空");
        Objects.requireNonNull(restClientBuilder, "restClientBuilder 不能为空");
        this.restClient = restClientBuilder.baseUrl(properties.apiBase().toString()).build();
    }

    public DeepSeekChatResult chat(DeepSeekChatCommand command) {
        Objects.requireNonNull(command, "command 不能为空");
        if (!properties.configured()) {
            throw new DeepSeekClientException(
                    "DEEPSEEK_DISABLED",
                    "DeepSeek 网关未启用或凭据未配置",
                    HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        ChatRequest request = new ChatRequest(
                command.model(),
                command.messages(),
                new Thinking(
                        command.thinkingEnabled() ? "enabled" : "disabled",
                        command.thinkingEnabled() ? command.reasoningEffort() : null
                ),
                false,
                properties.maxOutputTokens(),
                command.userId()
        );
        ChatResponse response;
        try {
            response = restClient.post()
                    .uri(CHAT_COMPLETIONS_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (httpRequest, httpResponse) -> {
                        throw mapHttpException(httpResponse);
                    })
                    .body(ChatResponse.class);
        } catch (DeepSeekClientException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new DeepSeekClientException(
                    "DEEPSEEK_UNAVAILABLE",
                    "DeepSeek 服务暂时不可用，请稍后重试",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    exception
            );
        }
        return toResult(response);
    }

    private DeepSeekClientException mapHttpException(ClientHttpResponse response) throws IOException {
        int status = response.getStatusCode().value();
        if (status == 401 || status == 403) {
            return new DeepSeekClientException(
                    "DEEPSEEK_AUTH_FAILED",
                    "DeepSeek 服务凭据校验失败，请联系管理员",
                    HttpStatus.BAD_GATEWAY
            );
        }
        if (status == 429) {
            return new DeepSeekClientException(
                    "DEEPSEEK_RATE_LIMITED",
                    "DeepSeek 当前请求较多，请稍后重试",
                    HttpStatus.SERVICE_UNAVAILABLE
            );
        }
        if (status >= 500) {
            return new DeepSeekClientException(
                    "DEEPSEEK_UPSTREAM_ERROR",
                    "DeepSeek 服务暂时不可用，请稍后重试",
                    HttpStatus.SERVICE_UNAVAILABLE
            );
        }
        return new DeepSeekClientException(
                "DEEPSEEK_REQUEST_REJECTED",
                "DeepSeek 拒绝了当前请求，请调整输入后重试",
                HttpStatus.BAD_GATEWAY
        );
    }

    private DeepSeekChatResult toResult(ChatResponse response) {
        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw protocolError("响应缺少 choices");
        }
        ChatChoice choice = response.choices().getFirst();
        if (choice == null || choice.message() == null || choice.message().content() == null
                || choice.message().content().isBlank()) {
            if (choice != null && choice.message() != null
                    && ((choice.message().reasoningContent() != null && !choice.message().reasoningContent().isBlank())
                    || "length".equals(choice.finishReason()))) {
                throw new DeepSeekClientException(
                        "DEEPSEEK_OUTPUT_EXHAUSTED",
                        "DeepSeek 本轮思考占满了输出长度，没有形成正式回复；请重新发送或改用 Auto/快速生成",
                        HttpStatus.BAD_GATEWAY
                );
            }
            throw protocolError("响应缺少生成内容");
        }

        Optional<VerifiedProviderUsage> verifiedUsage = Optional.empty();
        Usage usage = response.usage();
        if (response.id() != null && !response.id().isBlank() && usage != null
                && usage.promptTokens() != null && usage.completionTokens() != null
                && usage.promptTokens() >= 0 && usage.completionTokens() >= 0) {
            verifiedUsage = Optional.of(new VerifiedProviderUsage(
                    response.id(),
                    response.model(),
                    usage.promptTokens(),
                    usage.completionTokens()
            ));
        }
        return new DeepSeekChatResult(choice.message().content(), response.model(), verifiedUsage);
    }

    private static DeepSeekClientException protocolError(String detail) {
        return new DeepSeekClientException(
                "DEEPSEEK_PROTOCOL_ERROR",
                "DeepSeek 返回了无法识别的响应：" + detail,
                HttpStatus.BAD_GATEWAY
        );
    }

    private record ChatRequest(
            String model,
            List<DeepSeekMessage> messages,
            Thinking thinking,
            boolean stream,
            @JsonProperty("max_tokens") int maxTokens,
            @JsonProperty("user_id") String userId
    ) {
        @Override
        public String toString() {
            return "ChatRequest[model=" + model + ", messageCount=" + messages.size()
                    + ", thinking=" + thinking.type() + ", maxTokens=" + maxTokens + "]";
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record Thinking(String type, @JsonProperty("reasoning_effort") String reasoningEffort) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ChatResponse(
            String id,
            String model,
            List<ChatChoice> choices,
            Usage usage
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ChatChoice(ChatMessage message, @JsonProperty("finish_reason") String finishReason) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ChatMessage(
            String content,
            @JsonProperty("reasoning_content") String reasoningContent
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Usage(
            @JsonProperty("prompt_tokens") Long promptTokens,
            @JsonProperty("completion_tokens") Long completionTokens
    ) {
    }
}
