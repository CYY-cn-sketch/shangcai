package com.sufe.ai.account.api;

import com.sufe.ai.account.domain.AccountPermissionDenial;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.domain.UserStatus;
import com.sufe.ai.account.repository.AccountPermissionDenialRepository;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.audit.service.AuditLogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
public class AdminAccountController {

    private final UserAccountRepository userAccountRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final AccountPermissionDenialRepository accountPermissionDenialRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final FindByIndexNameSessionRepository<?> sessionRepository;

    public AdminAccountController(
            UserAccountRepository userAccountRepository,
            ProjectGroupRepository projectGroupRepository,
            GroupMembershipRepository groupMembershipRepository,
            AccountPermissionDenialRepository accountPermissionDenialRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            FindByIndexNameSessionRepository<?> sessionRepository
    ) {
        this.userAccountRepository = userAccountRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.accountPermissionDenialRepository = accountPermissionDenialRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.sessionRepository = sessionRepository;
    }

    @GetMapping("/accounts")
    public List<AccountResponse> listAccounts() {
        return userAccountRepository.findAll().stream()
                .sorted(Comparator.comparing(UserAccount::getCreatedAt))
                .map(this::toAccountResponse)
                .toList();
    }

    @PostMapping("/accounts")
    @Transactional
    public ResponseEntity<?> createAccount(
            Authentication authentication,
            @Valid @RequestBody CreateAccountRequest request
    ) {
        if (userAccountRepository.findByAccountIgnoreCase(request.account()).isPresent()) {
            return conflict("ACCOUNT_EXISTS", "账号已存在");
        }
        if (request.role() == UserRole.STUDENT && !hasText(request.groupId())) {
            return badRequest("GROUP_REQUIRED", "学生账号必须选择项目小组");
        }
        if (hasText(request.groupId()) && projectGroupRepository.findById(request.groupId().trim()).isEmpty()) {
            return badRequest("GROUP_NOT_FOUND", "项目小组不存在");
        }

        UserAccount user = UserAccount.register(
                request.account(),
                passwordEncoder.encode(request.password()),
                request.role(),
                request.displayName(),
                request.title(),
                request.quotaRemaining()
        );
        try {
            user = userAccountRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            return conflict("ACCOUNT_EXISTS", "账号已存在");
        }
        replaceMembership(user.getId(), request.role(), request.groupId());
        auditLogService.record(
                authentication.getName(),
                "ACCOUNT_CREATE",
                "ACCOUNT",
                user.getId(),
                "创建账号 " + user.getAccount()
        );
        return ResponseEntity.created(URI.create("/api/admin/accounts/" + user.getId()))
                .body(toAccountResponse(user));
    }

    @PatchMapping("/accounts/{accountId}")
    @Transactional
    public ResponseEntity<?> updateAccount(
            Authentication authentication,
            @PathVariable String accountId,
            @Valid @RequestBody UpdateAccountRequest request
    ) {
        UserAccount user = userAccountRepository.findById(accountId).orElse(null);
        if (user == null) {
            return notFound("ACCOUNT_NOT_FOUND", "账号不存在");
        }
        if (user.getAccount().equalsIgnoreCase(authentication.getName()) && request.status() == UserStatus.DISABLED) {
            return badRequest("CANNOT_DISABLE_SELF", "不能停用当前登录账号");
        }
        if (request.role() == UserRole.STUDENT && !hasText(request.groupId())) {
            return badRequest("GROUP_REQUIRED", "学生账号必须选择项目小组");
        }
        if (hasText(request.groupId()) && projectGroupRepository.findById(request.groupId().trim()).isEmpty()) {
            return badRequest("GROUP_NOT_FOUND", "项目小组不存在");
        }

        user.updateAdminProfile(
                request.role(),
                request.displayName(),
                request.title(),
                request.quotaRemaining(),
                request.status()
        );
        user = userAccountRepository.saveAndFlush(user);
        replaceMembership(user.getId(), request.role(), request.groupId());
        replacePermissionDenials(user.getId(), request.disabledPermissions());
        if (user.getStatus() == UserStatus.DISABLED) {
            invalidateSessions(user.getAccount());
        }
        auditLogService.record(
                authentication.getName(),
                "ACCOUNT_UPDATE",
                "ACCOUNT",
                user.getId(),
                "更新账号 " + user.getAccount() + " 的资料、状态或权限"
        );
        return ResponseEntity.ok(toAccountResponse(user));
    }

    @DeleteMapping("/accounts/{accountId}")
    @Transactional
    public ResponseEntity<?> deleteAccount(Authentication authentication, @PathVariable String accountId) {
        UserAccount user = userAccountRepository.findById(accountId).orElse(null);
        if (user == null) {
            return notFound("ACCOUNT_NOT_FOUND", "账号不存在");
        }
        if (user.getAccount().equalsIgnoreCase(authentication.getName())) {
            return badRequest("CANNOT_DELETE_SELF", "不能删除当前登录账号");
        }
        groupMembershipRepository.deleteByUserId(user.getId());
        accountPermissionDenialRepository.deleteByUserId(user.getId());
        invalidateSessions(user.getAccount());
        userAccountRepository.delete(user);
        auditLogService.record(
                authentication.getName(),
                "ACCOUNT_DELETE",
                "ACCOUNT",
                accountId,
                "删除账号 " + user.getAccount()
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/groups")
    public List<GroupResponse> listGroups() {
        return projectGroupRepository.findAll().stream()
                .sorted(Comparator.comparing(ProjectGroup::getGroupLabel))
                .map(this::toGroupResponse)
                .toList();
    }

    @PostMapping("/groups")
    @Transactional
    public ResponseEntity<GroupResponse> createGroup(
            Authentication authentication,
            @Valid @RequestBody CreateGroupRequest request
    ) {
        ProjectGroup group = projectGroupRepository.saveAndFlush(ProjectGroup.create(request.groupLabel(), request.projectName()));
        auditLogService.record(
                authentication.getName(),
                "GROUP_CREATE",
                "GROUP",
                group.getId(),
                "创建项目小组 " + group.getGroupLabel() + " / " + group.getProjectName()
        );
        return ResponseEntity.created(URI.create("/api/admin/groups/" + group.getId()))
                .body(toGroupResponse(group));
    }

    @PatchMapping("/groups/{groupId}")
    @Transactional
    public ResponseEntity<?> updateGroup(
            Authentication authentication,
            @PathVariable String groupId,
            @Valid @RequestBody UpdateGroupRequest request
    ) {
        ProjectGroup group = projectGroupRepository.findById(groupId).orElse(null);
        if (group == null) {
            return notFound("GROUP_NOT_FOUND", "项目小组不存在");
        }
        group.updateDetails(request.groupLabel(), request.projectName(), request.active());
        group = projectGroupRepository.saveAndFlush(group);
        auditLogService.record(
                authentication.getName(),
                "GROUP_UPDATE",
                "GROUP",
                group.getId(),
                "更新项目小组 " + group.getGroupLabel() + " / " + group.getProjectName()
        );
        return ResponseEntity.ok(toGroupResponse(group));
    }

    @DeleteMapping("/groups/{groupId}")
    @Transactional
    public ResponseEntity<?> deleteGroup(Authentication authentication, @PathVariable String groupId) {
        ProjectGroup group = projectGroupRepository.findById(groupId).orElse(null);
        if (group == null) {
            return notFound("GROUP_NOT_FOUND", "项目小组不存在");
        }
        if (groupMembershipRepository.countByGroupId(groupId) > 0) {
            return conflict("GROUP_HAS_MEMBERS", "项目小组已有成员，不能删除");
        }
        projectGroupRepository.delete(group);
        auditLogService.record(
                authentication.getName(),
                "GROUP_DELETE",
                "GROUP",
                groupId,
                "删除项目小组 " + group.getGroupLabel() + " / " + group.getProjectName()
        );
        return ResponseEntity.noContent().build();
    }

    private void replaceMembership(String userId, UserRole role, String groupId) {
        groupMembershipRepository.deleteByUserId(userId);
        groupMembershipRepository.flush();
        if (role == UserRole.STUDENT && hasText(groupId)) {
            groupMembershipRepository.save(GroupMembership.create(userId, groupId.trim()));
        }
    }

    private void replacePermissionDenials(String userId, List<String> disabledPermissions) {
        accountPermissionDenialRepository.deleteByUserId(userId);
        accountPermissionDenialRepository.flush();
        normalizePermissionKeys(disabledPermissions).forEach(permission ->
                accountPermissionDenialRepository.save(AccountPermissionDenial.create(userId, permission))
        );
    }

    private void invalidateSessions(String account) {
        sessionRepository.findByPrincipalName(account).keySet().forEach(sessionRepository::deleteById);
    }

    private static List<String> normalizePermissionKeys(List<String> permissions) {
        if (permissions == null) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        permissions.stream()
                .filter(AdminAccountController::hasText)
                .map(String::trim)
                .forEach(normalized::add);
        return List.copyOf(normalized);
    }

    private AccountResponse toAccountResponse(UserAccount user) {
        ProjectGroup group = groupMembershipRepository.findByUserId(user.getId())
                .map(GroupMembership::getGroupId)
                .flatMap(projectGroupRepository::findById)
                .orElse(null);
        return new AccountResponse(
                user.getId(),
                user.getAccount(),
                user.getRole(),
                user.getDisplayName(),
                user.getTitle(),
                user.getStatus(),
                user.getQuotaRemaining(),
                accountPermissionDenialRepository.findByUserIdOrderByPermissionKey(user.getId()).stream()
                        .map(AccountPermissionDenial::getPermissionKey)
                        .toList(),
                group == null ? null : group.getId(),
                group == null ? null : group.getGroupLabel(),
                group == null ? null : group.getProjectName()
        );
    }

    private GroupResponse toGroupResponse(ProjectGroup group) {
        return new GroupResponse(
                group.getId(),
                group.getGroupLabel(),
                group.getProjectName(),
                group.isActive(),
                groupMembershipRepository.countByGroupId(group.getId())
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static ResponseEntity<ErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> conflict(String code, String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> notFound(String code, String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(code, message));
    }

    public record AccountResponse(
            String id,
            String account,
            UserRole role,
            String displayName,
            String title,
            UserStatus status,
            int quotaRemaining,
            List<String> disabledPermissions,
            String groupId,
            String groupLabel,
            String groupName
    ) {
    }

    public record GroupResponse(
            String id,
            String groupLabel,
            String projectName,
            boolean active,
            long memberCount
    ) {
    }

    public record CreateAccountRequest(
            @NotBlank @Size(max = 190) String account,
            @NotBlank @Size(min = 8, max = 200) String password,
            @NotNull UserRole role,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(max = 150) String title,
            @Min(0) int quotaRemaining,
            @Size(max = 36) String groupId
    ) {
        public CreateAccountRequest {
            if (account != null) {
                account = account.trim().toLowerCase(Locale.ROOT);
            }
        }
    }

    public record UpdateAccountRequest(
            @NotNull UserRole role,
            @NotBlank @Size(max = 100) String displayName,
            @NotBlank @Size(max = 150) String title,
            @NotNull UserStatus status,
            @Min(0) int quotaRemaining,
            @Size(max = 64) List<@NotBlank @Size(max = 100) String> disabledPermissions,
            @Size(max = 36) String groupId
    ) {
    }

    public record CreateGroupRequest(
            @NotBlank @Size(max = 50) String groupLabel,
            @NotBlank @Size(max = 150) String projectName
    ) {
    }

    public record UpdateGroupRequest(
            @NotBlank @Size(max = 50) String groupLabel,
            @NotBlank @Size(max = 150) String projectName,
            boolean active
    ) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
