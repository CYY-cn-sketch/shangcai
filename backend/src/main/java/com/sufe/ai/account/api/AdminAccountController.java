package com.sufe.ai.account.api;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.domain.UserStatus;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
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
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
public class AdminAccountController {

    private final UserAccountRepository userAccountRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountController(
            UserAccountRepository userAccountRepository,
            ProjectGroupRepository projectGroupRepository,
            GroupMembershipRepository groupMembershipRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userAccountRepository = userAccountRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.passwordEncoder = passwordEncoder;
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
    public ResponseEntity<?> createAccount(@Valid @RequestBody CreateAccountRequest request) {
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
        userAccountRepository.delete(user);
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
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest request) {
        ProjectGroup group = projectGroupRepository.saveAndFlush(ProjectGroup.create(request.groupLabel(), request.projectName()));
        return ResponseEntity.created(URI.create("/api/admin/groups/" + group.getId()))
                .body(toGroupResponse(group));
    }

    @PatchMapping("/groups/{groupId}")
    @Transactional
    public ResponseEntity<?> updateGroup(@PathVariable String groupId, @Valid @RequestBody UpdateGroupRequest request) {
        ProjectGroup group = projectGroupRepository.findById(groupId).orElse(null);
        if (group == null) {
            return notFound("GROUP_NOT_FOUND", "项目小组不存在");
        }
        group.updateDetails(request.groupLabel(), request.projectName(), request.active());
        return ResponseEntity.ok(toGroupResponse(projectGroupRepository.saveAndFlush(group)));
    }

    @DeleteMapping("/groups/{groupId}")
    @Transactional
    public ResponseEntity<?> deleteGroup(@PathVariable String groupId) {
        ProjectGroup group = projectGroupRepository.findById(groupId).orElse(null);
        if (group == null) {
            return notFound("GROUP_NOT_FOUND", "项目小组不存在");
        }
        if (groupMembershipRepository.countByGroupId(groupId) > 0) {
            return conflict("GROUP_HAS_MEMBERS", "项目小组已有成员，不能删除");
        }
        projectGroupRepository.delete(group);
        return ResponseEntity.noContent().build();
    }

    private void replaceMembership(String userId, UserRole role, String groupId) {
        groupMembershipRepository.deleteByUserId(userId);
        if (role == UserRole.STUDENT && hasText(groupId)) {
            groupMembershipRepository.save(GroupMembership.create(userId, groupId.trim()));
        }
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
