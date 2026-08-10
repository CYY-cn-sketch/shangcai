package com.sufe.ai.workspace.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class ExpertHandoffValidationException extends RuntimeException {
    public ExpertHandoffValidationException(String message) {
        super(message);
    }
}
