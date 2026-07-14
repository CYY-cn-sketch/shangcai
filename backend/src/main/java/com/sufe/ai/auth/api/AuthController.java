package com.sufe.ai.auth.api;

import com.sufe.ai.account.domain.AccountPermissionDenial;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.AccountPermissionDenialRepository;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserAccountRepository userAccountRepository;
    private final AccountPermissionDenialRepository accountPermissionDenialRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            UserAccountRepository userAccountRepository,
            AccountPermissionDenialRepository accountPermissionDenialRepository,
            GroupMembershipRepository groupMembershipRepository,
            ProjectGroupRepository projectGroupRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.userAccountRepository = userAccountRepository;
        this.accountPermissionDenialRepository = accountPermissionDenialRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            loginRequest.account().trim().toLowerCase(Locale.ROOT),
                            loginRequest.password()
                    )
            );
            if (request.getSession(false) != null) {
                request.changeSessionId();
            }
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            return ResponseEntity.ok(buildResponse(authentication.getName()));
        } catch (AuthenticationException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("INVALID_CREDENTIALS", "账号或密码不正确，或账号已停用"));
        }
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        return buildResponse(authentication.getName());
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @RequestBody UpdateProfileRequest updateRequest
    ) {
        if (updateRequest == null) {
            return badRequest("INVALID_REQUEST", "请求内容不能为空");
        }

        String displayName = null;
        if (updateRequest.displayName() != null) {
            displayName = updateRequest.displayName().trim();
            if (displayName.isEmpty()) {
                return badRequest("INVALID_DISPLAY_NAME", "姓名或昵称不能为空");
            }
            if (displayName.length() > 100) {
                return badRequest("INVALID_DISPLAY_NAME", "姓名或昵称不能超过 100 个字符");
            }
        }

        boolean hasCurrentPassword = hasText(updateRequest.currentPassword());
        boolean hasNewPassword = hasText(updateRequest.newPassword());
        if (hasCurrentPassword != hasNewPassword) {
            return badRequest("INCOMPLETE_PASSWORD_CHANGE", "修改密码时必须同时提供原密码和新密码");
        }
        if (hasNewPassword && updateRequest.newPassword().length() < 8) {
            return badRequest("NEW_PASSWORD_TOO_SHORT", "新密码至少需要 8 位");
        }
        if (hasNewPassword && updateRequest.newPassword().length() > 200) {
            return badRequest("NEW_PASSWORD_TOO_LONG", "新密码不能超过 200 个字符");
        }
        if (displayName == null && !hasNewPassword) {
            return badRequest("INVALID_REQUEST", "至少需要提供一项要更新的个人资料");
        }

        UserAccount user = userAccountRepository.findByAccountIgnoreCase(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse("ACCOUNT_NOT_FOUND", "登录账号不存在"));
        }
        if (hasNewPassword && !passwordEncoder.matches(updateRequest.currentPassword(), user.getPasswordHash())) {
            return badRequest("INVALID_CURRENT_PASSWORD", "原密码不正确");
        }

        if (displayName != null) {
            user.updateDisplayName(displayName);
        }
        if (hasNewPassword) {
            user.updatePasswordHash(passwordEncoder.encode(updateRequest.newPassword()));
        }
        userAccountRepository.save(user);
        return ResponseEntity.ok(buildResponse(user.getAccount()));
    }

    private static ResponseEntity<ErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(new ErrorResponse(code, message));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableRequestBody() {
        return badRequest("INVALID_REQUEST", "请求内容不是有效的 JSON");
    }

    private AuthResponse buildResponse(String accountName) {
        UserAccount user = userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("登录账号不存在"));
        ProjectGroup group = groupMembershipRepository.findByUserId(user.getId())
                .map(GroupMembership::getGroupId)
                .flatMap(projectGroupRepository::findById)
                .orElse(null);
        return new AuthResponse(
                user.getId(),
                user.getRole().name().toLowerCase(Locale.ROOT),
                user.getDisplayName(),
                user.getAccount(),
                user.getTitle(),
                group == null ? null : group.getId(),
                group == null ? null : group.getGroupLabel(),
                group == null ? null : group.getProjectName(),
                user.getQuotaRemaining(),
                accountPermissionDenialRepository.findByUserIdOrderByPermissionKey(user.getId()).stream()
                        .map(AccountPermissionDenial::getPermissionKey)
                        .toList()
        );
    }

    public record LoginRequest(
            @NotBlank @Size(max = 190) String account,
            @NotBlank @Size(max = 200) String password
    ) {
    }

    public record UpdateProfileRequest(
            String displayName,
            String currentPassword,
            String newPassword
    ) {
    }

    public record AuthResponse(
            String id,
            String role,
            String name,
            String account,
            String title,
            String groupId,
            String groupLabel,
            String groupName,
            int quota,
            List<String> disabledPermissions
    ) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
