package com.sufe.ai.provider.workbuddy;

import com.fasterxml.jackson.databind.JsonNode;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Objects;

@Component
public class WorkBuddyClient {

    private static final String REQUEST_HEADER = "X-CodeBuddy-Request";

    private final RestClient restClient;

    public WorkBuddyClient(WorkBuddyProperties properties, RestClient.Builder restClientBuilder) {
        Objects.requireNonNull(properties, "properties 不能为空");
        this.restClient = restClientBuilder
                .baseUrl(Objects.requireNonNull(properties.baseUrl(), "WorkBuddy baseUrl 不能为空").toString())
                .defaultHeader(REQUEST_HEADER, "1")
                .build();
    }

    public RunSubmission submit(String text, Sender sender) {
        SubmitRunRequest request = new SubmitRunRequest(
                requireText(text, "text"),
                Objects.requireNonNull(sender, "sender 不能为空")
        );
        JsonNode data = restClient.post()
                .uri("/api/v1/runs")
                .body(request)
                .exchange((httpRequest, response) -> extractData(response.getStatusCode(), response.bodyTo(JsonNode.class)));

        String runId = textValue(data, "runId");
        if (runId == null) {
            throw new IllegalStateException("WorkBuddy 响应缺少 runId");
        }
        return new RunSubmission(runId);
    }

    public RunStatus getRun(String runId) {
        String normalizedRunId = requireText(runId, "runId");
        JsonNode data = restClient.get()
                .uri("/api/v1/runs/{runId}", normalizedRunId)
                .exchange((httpRequest, response) -> extractData(response.getStatusCode(), response.bodyTo(JsonNode.class)));
        return new RunStatus(normalizedRunId, data);
    }

    private static JsonNode extractData(HttpStatusCode statusCode, JsonNode envelope) {
        if (envelope == null || !envelope.isObject()) {
            throw new IllegalStateException("WorkBuddy 响应不是有效的 envelope");
        }

        JsonNode error = envelope.get("error");
        if (error != null && !error.isNull()) {
            throw new WorkBuddyApiException(
                    statusCode.value(),
                    textValue(error, "code"),
                    textValue(error, "message")
            );
        }
        if (!statusCode.is2xxSuccessful()) {
            throw new WorkBuddyApiException(statusCode.value(), null, "WorkBuddy 请求失败");
        }

        JsonNode data = envelope.get("data");
        if (data == null || data.isNull()) {
            throw new IllegalStateException("WorkBuddy 响应缺少 data");
        }
        return data;
    }

    private static String textValue(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        if (value == null || !value.isTextual() || value.textValue().isBlank()) {
            return null;
        }
        return value.textValue();
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private record SubmitRunRequest(String text, Sender sender) {
    }

    public record Sender(String id, String name) {
        public Sender {
            id = requireText(id, "sender.id");
            name = requireText(name, "sender.name");
        }
    }

    public record RunSubmission(String runId) {
    }

    public record RunStatus(String runId, JsonNode data) {
    }
}
