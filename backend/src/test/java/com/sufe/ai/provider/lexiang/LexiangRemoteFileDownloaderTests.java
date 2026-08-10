package com.sufe.ai.provider.lexiang;

import com.sufe.ai.storage.FileStorageService;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LexiangRemoteFileDownloaderTests {

    private MockWebServer server;
    private LexiangRemoteFileDownloader downloader;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        downloader = new LexiangRemoteFileDownloader(
                HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build(),
                uri -> "http".equals(uri.getScheme())
                        && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()))
        );
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void downloadsValidatedFileWithoutFollowingRedirects() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "text/plain; charset=utf-8")
                .setHeader("ETag", "etag-1")
                .setBody("课程正文"));

        var file = downloader.download(server.url("/course.txt").toString(), "课程资料");

        assertThat(file.fileName()).isEqualTo("课程资料.txt");
        assertThat(file.content()).isNotEmpty();
        assertThat(file.etag()).isEqualTo("etag-1");

        server.enqueue(new MockResponse()
                .setResponseCode(302)
                .setHeader("Location", server.url("/redirected.txt")));
        assertThatThrownBy(() -> downloader.download(server.url("/source.txt").toString(), "课程资料.txt"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("拒绝重定向");
        assertThat(server.getRequestCount()).isEqualTo(2);
    }

    @Test
    void rejectsUntrustedUriUnsafeNameAndOversizedResponse() {
        assertThat(LexiangRemoteFileDownloader.isTrustedProductionUri(
                URI.create("https://bucket.cos.ap-shanghai.myqcloud.com/file.pdf")
        )).isTrue();
        assertThat(LexiangRemoteFileDownloader.isTrustedProductionUri(
                URI.create("https://bucket.cos.ap-shanghai.myqcloud.com.evil.test/file.pdf")
        )).isFalse();
        assertThatThrownBy(() -> downloader.download(server.url("/file.pdf").toString(), "../file.pdf"))
                .isInstanceOf(IllegalArgumentException.class);

        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/pdf")
                .setBody("x")
                .setHeader("Content-Length", FileStorageService.MAX_FILE_SIZE + 1));
        assertThatThrownBy(() -> downloader.download(server.url("/large.pdf").toString(), "large.pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("20 MB");
    }

    @Test
    void acceptsMarkdownFromTrustedDownloadPath() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "text/markdown")
                .setBody("# 第一课"));

        var file = downloader.download(server.url("/lesson.md").toString(), "第一课.md");

        assertThat(file.fileName()).isEqualTo("第一课.md");
        assertThat(file.contentType()).isEqualTo("text/markdown");
        assertThat(file.content()).isNotEmpty();
    }
}
