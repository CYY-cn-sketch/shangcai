package com.sufe.ai.provider.workbuddy;

public class WorkBuddyApiException extends RuntimeException {

    private final int statusCode;
    private final String errorCode;

    public WorkBuddyApiException(int statusCode, String errorCode, String message) {
        super(message == null || message.isBlank() ? "WorkBuddy 请求失败" : message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
