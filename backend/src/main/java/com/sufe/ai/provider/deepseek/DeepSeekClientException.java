package com.sufe.ai.provider.deepseek;

import org.springframework.http.HttpStatus;

public class DeepSeekClientException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus responseStatus;

    public DeepSeekClientException(String errorCode, String message, HttpStatus responseStatus) {
        super(message);
        this.errorCode = errorCode;
        this.responseStatus = responseStatus;
    }

    public DeepSeekClientException(String errorCode, String message, HttpStatus responseStatus, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.responseStatus = responseStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public HttpStatus getResponseStatus() {
        return responseStatus;
    }
}
