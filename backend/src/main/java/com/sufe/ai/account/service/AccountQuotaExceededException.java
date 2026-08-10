package com.sufe.ai.account.service;

public class AccountQuotaExceededException extends RuntimeException {

    private final String code;

    public AccountQuotaExceededException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
