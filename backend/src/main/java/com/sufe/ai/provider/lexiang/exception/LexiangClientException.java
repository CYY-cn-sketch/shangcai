package com.sufe.ai.provider.lexiang.exception;

public class LexiangClientException extends RuntimeException {

    private final String operation;
    private final Integer statusCode;

    public LexiangClientException(String message, String operation, Throwable cause) {
        this(message, operation, null, cause);
    }

    protected LexiangClientException(String message, String operation, Integer statusCode) {
        this(message, operation, statusCode, null);
    }

    private LexiangClientException(String message, String operation, Integer statusCode, Throwable cause) {
        super(message, cause);
        this.operation = operation;
        this.statusCode = statusCode;
    }

    public String getOperation() {
        return operation;
    }

    public Integer getStatusCode() {
        return statusCode;
    }
}
