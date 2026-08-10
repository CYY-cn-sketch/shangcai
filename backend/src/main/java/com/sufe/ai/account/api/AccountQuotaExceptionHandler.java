package com.sufe.ai.account.api;

import com.sufe.ai.account.service.AccountQuotaExceededException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AccountQuotaExceptionHandler {

    @ExceptionHandler(AccountQuotaExceededException.class)
    public ResponseEntity<ErrorResponse> handleQuotaExceeded(AccountQuotaExceededException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponse(exception.getCode(), exception.getMessage()));
    }

    public record ErrorResponse(String code, String message) {
    }
}
