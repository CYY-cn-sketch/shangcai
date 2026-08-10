package com.sufe.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SufeAiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SufeAiApplication.class, args);
    }
}
