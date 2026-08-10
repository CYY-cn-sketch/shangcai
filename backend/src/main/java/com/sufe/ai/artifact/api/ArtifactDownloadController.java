package com.sufe.ai.artifact.api;

import com.sufe.ai.artifact.service.ArtifactService;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/artifacts")
public class ArtifactDownloadController {

    private final ArtifactService artifactService;

    public ArtifactDownloadController(ArtifactService artifactService) {
        this.artifactService = artifactService;
    }

    @GetMapping("/{artifactId}/download")
    public ResponseEntity<Resource> download(Authentication authentication, @PathVariable String artifactId) {
        ArtifactService.DownloadContent content = artifactService.prepareDownload(authentication.getName(), artifactId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(content.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(content.resource());
    }
}
