package com.sufe.ai.artifact.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ArtifactFileValidationException extends RuntimeException {
    public ArtifactFileValidationException(String message) {
        super(message);
    }
}
