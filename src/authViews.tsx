import { type FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ClipboardCheck, GraduationCap, LogOut, ShieldCheck, X } from "lucide-react";
import {
  LoginThreeScene,
  StudentCartoonAvatar,
  SufeSeal,
} from "./visuals";
import { studentAvatarOptions } from "./studentAvatars";

type Role = "student" | "teacher" | "admin";
type StudentAvatarId = "student-boy" | "student-girl" | "business-student" | "founder-student" | "defense-student" | "creative-girl";
type AuthSession = {
  role: Role;
  name: string;
  account: string;
  title: string;
  groupLabel?: string;
  groupName?: string;
};
type AccountRecord = AuthSession & {
  status: "已开通" | "已停用" | "待后端开通";
};
function LogoutConfirmModal(props: { accountName: string; onCancel: () => void; onConfirm: () => void | Promise<void> }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal logout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
        <header>
          <div>
            <span className="eyebrow">退出登录</span>
            <h3 id="logout-confirm-title">确认退出当前账号吗？</h3>
            <p>退出后将返回登录页，已经保存到服务器的数据会继续保留。</p>
          </div>
          <button type="button" aria-label="关闭退出确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="logout-confirm-body">
          <div className="logout-confirm-icon">
            <LogOut size={22} />
          </div>
          <div>
            <strong>{props.accountName}</strong>
            <p>是否现在退出登录？</p>
          </div>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button" type="button" onClick={props.onConfirm}>
            确认退出
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProfileSettingsModal(props: {
  auth: AuthSession;
  account?: AccountRecord;
  avatarId: StudentAvatarId;
  onClose: () => void;
  onSave: (nextProfile: {
    name: string;
    currentPassword?: string;
    newPassword?: string;
    avatarId: StudentAvatarId;
  }) => Promise<void>;
}) {
  const { onClose } = props;
  const groupLabel = props.account?.groupLabel || props.auth.groupLabel;
  const groupName = props.account?.groupName || props.auth.groupName;
  const [nameDraft, setNameDraft] = useState(props.account?.name || props.auth.name);
  const [avatarDraft, setAvatarDraft] = useState<StudentAvatarId>(props.avatarId);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const nextName = nameDraft.trim();
    const isPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);
    if (!nextName) {
      setError("姓名或昵称不能为空。");
      return;
    }
    if (isPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError("修改密码时请完整填写原密码、新密码和确认密码。");
        return;
      }
      if (newPassword.length < 8) {
        setError("新密码至少需要 8 位。");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("两次输入的新密码不一致。");
        return;
      }
    }
    setIsSaving(true);
    setError("");
    try {
      await props.onSave({
        name: nextName,
        currentPassword: isPasswordChange ? currentPassword : undefined,
        newPassword: isPasswordChange ? newPassword : undefined,
        avatarId: avatarDraft,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "个人资料保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return createPortal(
    <div
      className="modal-backdrop preview-modal-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isSaving) props.onClose();
      }}
    >
      <form
        className="media-modal profile-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header>
          <div>
            <span className="eyebrow">个人资料</span>
            <h3 id="profile-settings-title">个人资料设置</h3>
            <p>设置头像、昵称和登录密码；账号作为登录标识，正式版不建议学生自行修改。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭个人资料设置" onClick={props.onClose} disabled={isSaving}>
            <X size={18} />
          </button>
        </header>
        <div className="profile-settings-body">
          <aside className="profile-avatar-panel">
            <div className="profile-avatar-large">
              <StudentCartoonAvatar avatarId={avatarDraft} size={96} />
              <strong>{nameDraft.trim() || props.auth.name}</strong>
              <span>{props.auth.title}</span>
            </div>
            <div className="profile-avatar-grid" aria-label="选择头像">
              {studentAvatarOptions.map((option) => (
                <button
                  className={avatarDraft === option.id ? "active" : ""}
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setAvatarDraft(option.id);
                    setError("");
                  }}
                  aria-label={option.label}
                  aria-pressed={avatarDraft === option.id}
                >
                  <StudentCartoonAvatar avatarId={option.id} size={40} />
                </button>
              ))}
            </div>
            <div className="profile-meta-list">
              <div>
                <span>当前身份</span>
                <strong>学生端</strong>
              </div>
              <div>
                <span>当前小组</span>
                <strong>{groupLabel ? (groupName ? `${groupLabel} · ${groupName}` : groupLabel) : "未分组"}</strong>
              </div>
            </div>
          </aside>
          <section className="profile-form-panel">
            <label>
              <span>姓名 / 昵称</span>
              <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
            </label>
            <label>
              <span>登录账号</span>
              <input value={props.auth.account} readOnly aria-readonly="true" />
              <em>登录账号用于关联小组、提交记录和审核日志，暂不支持学生自行修改。</em>
            </label>
            <div className="profile-password-grid">
              <label>
                <span>原密码</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
              </label>
              <label>
                <span>新密码</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
              </label>
              <label>
                <span>确认新密码</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <div className="profile-password-note">
              <ShieldCheck size={16} />
              <span>不修改密码时可留空；填写新密码时需要先输入原密码。</span>
            </div>
            {error && <p className="profile-error" role="alert">{error}</p>}
          </section>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onClose} disabled={isSaving}>
            取消
          </button>
          <button className="primary-button" type="submit" disabled={isSaving} aria-busy={isSaving}>
            <CheckCircle2 size={16} />
            {isSaving ? "正在保存..." : "保存设置"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function SystemNoticeModal(props: { notice: { title: string; message: string }; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props]);

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section
        className="media-modal system-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-notice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">系统提示</span>
            <h3 id="system-notice-title">{props.notice.title}</h3>
            <p>{props.notice.message}</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭提示" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>
        <footer>
          <button className="primary-button" type="button" onClick={props.onClose}>
            我知道了
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function AuthLoadingView() {
  return (
    <main className="login-page">
      <LoginThreeScene />
      <div className="brand-block login-brand">
        <SufeSeal />
        <div>
          <p>上海财经大学商学院</p>
          <h1>AI 赋能创业实践教学示范平台</h1>
        </div>
      </div>
      <section className="login-panel auth-loading-panel" aria-live="polite">
        <ShieldCheck size={24} />
        <strong>正在验证登录状态</strong>
        <span>正在连接教学平台服务...</span>
      </section>
    </main>
  );
}

function LoginView(props: {
  accountRecords: AccountRecord[];
  onLogin: (account: string, password: string) => Promise<void>;
}) {
  const visibleLoginRoles: Array<Extract<Role, "student" | "teacher">> = ["student", "teacher"];
  const [selectedRole, setSelectedRole] = useState<Extract<Role, "student" | "teacher">>("student");
  const loginAccounts = props.accountRecords.filter((account) => account.status !== "待后端开通");
  const roleAccounts = loginAccounts.filter((account) => account.role === selectedRole);
  const [accountInput, setAccountInput] = useState(roleAccounts[0]?.account || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const selectedAccount =
    loginAccounts.find((account) => account.account === accountInput.trim()) ||
    roleAccounts[0] ||
    loginAccounts[0] || { name: "平台用户", account: accountInput.trim() || "未选择账号", title: "请输入平台账号登录" };

  function handleRoleSelect(role: Extract<Role, "student" | "teacher">) {
    const firstAccount = loginAccounts.find((account) => account.role === role) || loginAccounts[0];
    setSelectedRole(role);
    setAccountInput(firstAccount?.account || "");
    setPasswordInput("");
    setLoginError("");
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoggingIn) return;
    if (!accountInput.trim() || !passwordInput) {
      setLoginError("请输入账号和密码。");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      await props.onLogin(accountInput.trim(), passwordInput);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "登录失败，请稍后重试。");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="login-page">
      <LoginThreeScene />
      <div className="brand-block login-brand">
        <SufeSeal />
        <div>
          <p>上海财经大学商学院</p>
          <h1>AI 赋能创业实践教学示范平台</h1>
        </div>
      </div>
      <section className="login-hero">
        <h2>
          <span>把学生生成、教师审核和成果</span>
          <span>沉淀连成一个可演示的教学闭环。</span>
        </h2>
        <div className="login-proof">
          <article>
            <GraduationCap size={20} />
            <strong>学生路径</strong>
            <span>通过 AI 聊天完成头脑风暴、定位、BP、PPT、答辩和多媒体物料。</span>
          </article>
          <article>
            <ClipboardCheck size={20} />
            <strong>教师路径</strong>
            <span>按成果类型查看提交，进行通过或退回修改，并把意见反馈给学生。</span>
          </article>
        </div>
      </section>

      <section className="login-panel">
        <div className={`login-role-tabs ${selectedRole === "teacher" ? "is-teacher" : "is-student"}`}>
          {visibleLoginRoles.map((role) => (
            <button
              className={selectedRole === role ? "active" : ""}
              key={role}
              type="button"
              onClick={() => handleRoleSelect(role)}
            >
              {role === "student" && <GraduationCap size={16} />}
              {role === "teacher" && <ClipboardCheck size={16} />}
              {role === "student" ? "学生端" : "教师端"}
            </button>
          ))}
        </div>
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <label htmlFor="login-account">账号</label>
          <input
            id="login-account"
            value={accountInput}
            onChange={(event) => setAccountInput(event.target.value)}
            placeholder="请输入账号"
          />
          <label htmlFor="login-password">密码</label>
          <input
            id="login-password"
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="请输入密码"
          />
          <div className="login-account-card">
            <strong>{selectedAccount.name}</strong>
            <span>{selectedAccount.account}</span>
            <p>{selectedAccount.title}</p>
          </div>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary-button full" type="submit" aria-busy={isLoggingIn}>
            <ShieldCheck size={17} />
            {isLoggingIn ? "正在登录..." : "登录进入系统"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PermissionBanner(props: { accountDisabled: boolean; disabledPermissions: string[] }) {
  if (!props.accountDisabled && props.disabledPermissions.length === 0) return null;
  return (
    <section className="permission-banner" aria-live="polite">
      <ShieldCheck size={18} />
      <div>
        <strong>{props.accountDisabled ? "当前账号已被管理员停用" : "部分功能权限已被管理员停用"}</strong>
        <p>
          {props.accountDisabled
            ? "系统会结束当前登录会话；请联系管理员确认账号状态后重新登录。"
            : `已停用权限：${props.disabledPermissions.join("、")}。对应入口会置灰，点击操作时会提示联系管理员。`}
        </p>
      </div>
    </section>
  );
}

export {
  AuthLoadingView,
  LoginView,
  LogoutConfirmModal,
  PermissionBanner,
  ProfileSettingsModal,
  SystemNoticeModal,
};

