package com.sufe.ai.knowledge.service;

public class ExpertSkillConfirmationException extends RuntimeException {

    private final Kind kind;
    private final String code;

    public ExpertSkillConfirmationException(Kind kind, String code, String message) {
        super(message);
        this.kind = kind;
        this.code = code;
    }

    public Kind getKind() { return kind; }
    public String getCode() { return code; }

    public enum Kind {
        INVALID,
        NOT_FOUND,
        CONFLICT,
        STORAGE
    }
}
