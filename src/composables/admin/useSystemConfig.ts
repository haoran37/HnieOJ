import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import {
  createRemoteJudgeAccount,
  deleteRemoteJudgeAccount,
  getAdminSystemConfig,
  getRemoteJudgeAccounts,
  saveAdminSystemConfig,
  updateRemoteJudgeAccount,
  type AdminSystemConfigSaveRequest,
  type AdminSystemConfigVo,
  type RemoteJudgeAccountCreateRequest,
  type RemoteJudgeAccountUpdateRequest,
  type RemoteJudgeAccountVo,
} from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

// 后端 SystemConfigConstant.REGISTER_MODE_SET 的合法取值（区分大小写，必须原样提交）
export const REGISTER_MODES = ['OPEN', 'EMAIL_SUFFIX', 'INVITE_CODE'] as const;
export type RegisterMode = (typeof REGISTER_MODES)[number];

// 对应后端 SystemConfigVo / SystemConfigSaveRequest
export interface SystemConfig {
  websiteName: string;
  logoUrl: string;
  icpCode: string;
  allowRegister: boolean;
  // 原样保存后端返回值，不做任何隐式转换
  registerMode: string;
  allowedEmailSuffixes: string[];

  smtpHost: string;
  smtpPort: number;
  smtpEmail: string;
  smtpNickname: string;
  // smtpPassword 只写不读（后端 VO 不返回），留空表示不修改
  smtpPassword: string;

  submissionInterval: number;
}

/** 对应后端 RemoteJudgeAccountVo（无 password） */
export type RemoteJudgeAccount = RemoteJudgeAccountVo;

// 远程评测账号字段上限（与后端 DTO 校验一致）
export const ACCOUNT_OJ_MAX = 20;
export const ACCOUNT_USERNAME_MAX = 100;
export const ACCOUNT_PASSWORD_MAX = 255;
export const ACCOUNT_CONCURRENCY_MIN = 1;
export const ACCOUNT_CONCURRENCY_MAX = 100;

export interface RemoteJudgeAccountForm {
  id: number;
  oj: string;
  username: string;
  /** 只写不读：编辑永远初始为空，从不回显/缓存后端密码 */
  password: string;
  status: number;
  maxConcurrency: number;
}

const createDefaultConfig = (): SystemConfig => ({
  websiteName: '',
  logoUrl: '',
  icpCode: '',
  allowRegister: true,
  registerMode: 'OPEN',
  allowedEmailSuffixes: [],
  smtpHost: '',
  smtpPort: 465,
  smtpEmail: '',
  smtpNickname: '',
  smtpPassword: '',
  submissionInterval: 5,
});

const createDefaultAccountForm = (): RemoteJudgeAccountForm => ({
  id: 0,
  oj: '',
  username: '',
  password: '',
  status: 1,
  maxConcurrency: 1,
});

/** 后端 VO -> 表单。registerMode 原样保留（绝不把 OPEN/INVITE_CODE 静默改写成其它值） */
export function toSystemConfig(data: Partial<AdminSystemConfigVo> | null | undefined): SystemConfig {
  const fallback = createDefaultConfig();
  if (!data) return fallback;
  return {
    websiteName: data.websiteName ?? '',
    logoUrl: data.logoUrl ?? '',
    icpCode: data.icpCode ?? '',
    allowRegister: data.allowRegister ?? true,
    registerMode: data.registerMode ?? fallback.registerMode,
    allowedEmailSuffixes: data.allowedEmailSuffixes ?? [],
    smtpHost: data.smtpHost ?? '',
    smtpPort: data.smtpPort ?? 465,
    smtpEmail: data.smtpEmail ?? '',
    smtpNickname: data.smtpNickname ?? '',
    // 后端不回显密码，始终置空，避免把旧值当新值提交
    smtpPassword: '',
    submissionInterval: data.submissionInterval ?? 5,
  };
}

/** 表单 -> 后端 SaveRequest；smtpPassword 为空时整键省略，后端 resolveSmtpPassword 保留旧值 */
export function toSaveRequest(config: SystemConfig): AdminSystemConfigSaveRequest {
  const request: AdminSystemConfigSaveRequest = {
    websiteName: config.websiteName,
    logoUrl: config.logoUrl,
    icpCode: config.icpCode,
    allowRegister: config.allowRegister,
    registerMode: config.registerMode,
    allowedEmailSuffixes: config.allowedEmailSuffixes,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpEmail: config.smtpEmail,
    smtpNickname: config.smtpNickname,
    submissionInterval: config.submissionInterval,
  };
  const password = config.smtpPassword.trim();
  if (password) {
    request.smtpPassword = password;
  }
  return request;
}

export function useSystemConfig() {
  const message = useMessage();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const gmtModified = ref<string | null>(null);

  const config = reactive<SystemConfig>(createDefaultConfig());
  const remoteJudgeAccounts = ref<RemoteJudgeAccount[]>([]);

  const accountsLoading = ref(false);
  const accountsError = ref<string | null>(null);
  const accountSaving = ref(false);
  const showAccountModal = ref(false);
  const accountModalMode = ref<'create' | 'edit'>('create');
  const accountForm = reactive<RemoteJudgeAccountForm>(createDefaultAccountForm());

  let accountsSeq = 0;

  const registerModeOptions = [
    { label: '公开注册 (OPEN)', value: 'OPEN' },
    { label: '邮箱后缀限制 (EMAIL_SUFFIX)', value: 'EMAIL_SUFFIX' },
    { label: '邀请码 (INVITE_CODE)', value: 'INVITE_CODE' },
  ];

  const fetchConfig = async () => {
    loading.value = true;
    error.value = null;
    try {
      const data = await getAdminSystemConfig();
      Object.assign(config, toSystemConfig(data));
      gmtModified.value = data?.gmtModified ?? null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载系统配置失败';
    } finally {
      loading.value = false;
    }
  };

  const fetchRemoteJudgeAccounts = async () => {
    const seq = ++accountsSeq;
    accountsLoading.value = true;
    accountsError.value = null;
    try {
      const list = await getRemoteJudgeAccounts();
      if (seq !== accountsSeq) return;
      remoteJudgeAccounts.value = list ?? [];
    } catch (err) {
      if (seq !== accountsSeq) return;
      // 列表加载失败不得伪装成“没有账号”：保留旧数据并明确报错供重试
      accountsError.value = err instanceof Error ? err.message : '远程评测账号加载失败';
    } finally {
      if (seq === accountsSeq) accountsLoading.value = false;
    }
  };

  const resetAccountForm = () => {
    Object.assign(accountForm, createDefaultAccountForm());
  };

  const openCreateAccountModal = () => {
    // 保存进行中禁止切换到新建，避免在途请求结果写入另一份表单
    if (accountSaving.value) return;
    accountModalMode.value = 'create';
    resetAccountForm();
    showAccountModal.value = true;
  };

  const openEditAccountModal = (row: RemoteJudgeAccount) => {
    if (accountSaving.value) return;
    accountModalMode.value = 'edit';
    accountForm.id = row.id;
    accountForm.oj = row.oj ?? '';
    accountForm.username = row.username ?? '';
    // 密码永远初始为空；留空即保留原密码
    accountForm.password = '';
    accountForm.status = row.status === 0 ? 0 : 1;
    accountForm.maxConcurrency = row.maxConcurrency ?? 1;
    showAccountModal.value = true;
  };

  // 正常关闭：清空只写不读的密码，避免下次打开回显或误提交
  const closeAccountModal = () => {
    if (accountSaving.value) return;
    accountForm.password = '';
    showAccountModal.value = false;
  };

  // Naive UI 右上关闭与 Esc 都走 update:show，保存期间必须被忽略
  const handleAccountModalShowChange = (value: boolean) => {
    if (value) {
      showAccountModal.value = true;
      return;
    }
    closeAccountModal();
  };

  const handleAccountSubmit = async () => {
    if (accountSaving.value) return;

    const mode = accountModalMode.value;
    const id = accountForm.id;
    const oj = accountForm.oj.trim();
    const username = accountForm.username.trim();
    const password = accountForm.password;
    const status = accountForm.status;
    const maxConcurrency = accountForm.maxConcurrency;

    if (!oj) {
      message.warning('请输入 OJ 名称');
      return;
    }
    if (oj.length > ACCOUNT_OJ_MAX) {
      message.warning(`OJ 名称不能超过 ${ACCOUNT_OJ_MAX} 个字符`);
      return;
    }
    if (!username) {
      message.warning('请输入账号');
      return;
    }
    if (username.length > ACCOUNT_USERNAME_MAX) {
      message.warning(`账号不能超过 ${ACCOUNT_USERNAME_MAX} 个字符`);
      return;
    }
    if (mode === 'create' && password.trim() === '') {
      message.warning('新增账号必须填写密码');
      return;
    }
    if (password.length > ACCOUNT_PASSWORD_MAX) {
      message.warning(`密码不能超过 ${ACCOUNT_PASSWORD_MAX} 个字符`);
      return;
    }
    if (status !== 0 && status !== 1) {
      message.warning('状态只能为 0（禁用）或 1（正常）');
      return;
    }
    if (
      !Number.isInteger(maxConcurrency) ||
      maxConcurrency < ACCOUNT_CONCURRENCY_MIN ||
      maxConcurrency > ACCOUNT_CONCURRENCY_MAX
    ) {
      message.warning(`最大并发必须是 ${ACCOUNT_CONCURRENCY_MIN}..${ACCOUNT_CONCURRENCY_MAX} 的整数`);
      return;
    }

    // 在 await 前捕获 id 与 payload 快照，保存期间切换编辑不会串号
    const common = { oj, username, status, maxConcurrency };
    const createPayload: RemoteJudgeAccountCreateRequest = { ...common, password };
    const updatePayload: RemoteJudgeAccountUpdateRequest = { ...common };
    if (password !== '') {
      // 非空密码原样提交，不做 trim；留空则整键省略，后端保留原密码
      updatePayload.password = password;
    }

    accountSaving.value = true;
    try {
      if (mode === 'create') {
        await createRemoteJudgeAccount(createPayload);
        message.success('账号已创建');
      } else {
        await updateRemoteJudgeAccount(id, updatePayload);
        message.success('账号已保存');
      }
      showAccountModal.value = false;
      // 成功后清空密码，绝不缓存到下一次打开；失败路径保留输入
      accountForm.password = '';
      // 创建/编辑后重新读取真实列表
      await fetchRemoteJudgeAccounts();
    } catch (err) {
      // 失败保留表单输入（含密码），不关闭弹窗
      message.error(err instanceof Error ? err.message : '保存远程评测账号失败');
    } finally {
      accountSaving.value = false;
    }
  };

  const handleDeleteAccount = async (row: RemoteJudgeAccount) => {
    try {
      await deleteRemoteJudgeAccount(row.id);
      message.success('账号已删除');
      // 删除后重新读取列表，确认真实状态
      await fetchRemoteJudgeAccounts();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除远程评测账号失败');
    }
  };

  const saveConfig = async () => {
    if (!REGISTER_MODES.includes(config.registerMode as RegisterMode)) {
      message.error(
        `registerMode 仅支持 ${REGISTER_MODES.join(' / ')}，当前值「${config.registerMode}」无法保存`,
      );
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await saveAdminSystemConfig(toSaveRequest(config));
      message.success('配置保存成功');
      // 保存成功后重新读取后端数据，确认真正落库
      await fetchConfig();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    void fetchConfig();
    void fetchRemoteJudgeAccounts();
  });

  return {
    config,
    remoteJudgeAccounts,
    accountsLoading,
    accountsError,
    accountSaving,
    showAccountModal,
    accountModalMode,
    accountForm,
    loading,
    error,
    gmtModified,
    registerModeOptions,
    fetchConfig,
    fetchRemoteJudgeAccounts,
    openCreateAccountModal,
    openEditAccountModal,
    closeAccountModal,
    handleAccountModalShowChange,
    handleAccountSubmit,
    handleDeleteAccount,
    saveConfig,
    formatFullTime,
    ACCOUNT_OJ_MAX,
    ACCOUNT_USERNAME_MAX,
    ACCOUNT_PASSWORD_MAX,
    ACCOUNT_CONCURRENCY_MIN,
    ACCOUNT_CONCURRENCY_MAX,
  };
}
