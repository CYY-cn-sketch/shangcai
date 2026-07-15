package com.sufe.ai.defense.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.defense.domain.DefensePracticeRecord;
import com.sufe.ai.defense.service.DefensePracticeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/student/defense-practices")
@Validated
public class StudentDefensePracticeController {

    private final DefensePracticeService practiceService;
    private final ObjectMapper objectMapper;

    public StudentDefensePracticeController(DefensePracticeService practiceService, ObjectMapper objectMapper) {
        this.practiceService = practiceService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public List<DefensePracticeResponse> list(Authentication authentication) {
        return practiceService.listOwned(authentication.getName()).stream()
                .map(this::toResponse)
                .toList();
    }

    @PutMapping("/{clientPracticeId}")
    public DefensePracticeResponse save(
            Authentication authentication,
            @PathVariable @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,64}") String clientPracticeId,
            @Valid @RequestBody SaveDefensePracticeRequest request
    ) {
        return toResponse(practiceService.save(
                authentication.getName(),
                clientPracticeId,
                request.ideaId(),
                request.content().toString(),
                request.visibility()
        ));
    }

    private DefensePracticeResponse toResponse(DefensePracticeRecord practice) {
        try {
            return new DefensePracticeResponse(
                    practice.getClientPracticeId(),
                    practice.getIdeaId(),
                    practice.getVisibility(),
                    objectMapper.readTree(practice.getContentJson()),
                    practice.getCreatedAt(),
                    practice.getUpdatedAt()
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据库中的答辩记录 JSON 无法解析", exception);
        }
    }

    public record SaveDefensePracticeRequest(
            @NotBlank @Size(max = 36) String ideaId,
            @NotBlank @Pattern(regexp = "self|teacher") String visibility,
            @NotNull JsonNode content
    ) {
        @AssertTrue(message = "content 不能超过 15000 个字符")
        public boolean isContentSizeValid() {
            return content == null || content.toString().length() <= 15_000;
        }
    }

    public record DefensePracticeResponse(
            String id,
            String ideaId,
            String visibility,
            JsonNode content,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
