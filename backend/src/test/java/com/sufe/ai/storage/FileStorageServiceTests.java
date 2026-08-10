package com.sufe.ai.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTests {

    @TempDir
    Path temporaryDirectory;

    @Test
    void rejectsDeletionOutsideConfiguredRoot() throws Exception {
        Path root = temporaryDirectory.resolve("root");
        Path outside = temporaryDirectory.resolve("outside.txt");
        Files.createDirectories(root);
        Files.writeString(outside, "must remain");
        FileStorageService service = new FileStorageService(root.toString());

        assertThatThrownBy(() -> service.delete("../outside.txt"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("文件存储标识无效");
        assertThat(Files.readString(outside)).isEqualTo("must remain");
    }
}
