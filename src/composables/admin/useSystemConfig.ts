import { ref, reactive, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';

export interface RemoteJudgeAccount {
  id: string;
  platform: string;
  username: string;
  password?: string; // Optional for display
  maxConcurrency: number;
  status: boolean;
}

export interface SystemConfig {
  // Website Settings
  websiteName: string;
  logoUrl: string;
  icpCode: string;
  allowRegister: boolean;
  registerMode: 'PUBLIC' | 'EMAIL_SUFFIX';
  allowedEmailSuffixes: string[]; // For EMAIL_SUFFIX mode
  maintenanceMode: boolean;
  intranetAccessOnly: boolean;
  contestMode: boolean;
  contestId: string;

  // SMTP Settings
  smtpHost: string;
  smtpPort: number;
  smtpEmail: string;
  smtpNickname: string;
  smtpPassword: string;
  smtpSecurity: 'NONE' | 'SSL' | 'TLS';

  // Judge Settings
  judgeToken: string;
  defaultTimeLimit: number;
  defaultMemoryLimit: number;
  remoteJudgeAccounts: RemoteJudgeAccount[];

  // Advanced Settings
  submissionInterval: number;
  maxUploadSize: number;
  storageDriver: 'LOCAL' | 'OSS' | 'OBS';
}

export function useSystemConfig() {
  const message = useMessage();
  const dialog = useDialog();
  const loading = ref(false);
  const sendingEmail = ref(false);
  
  // Test Email State
  const testEmailRecipient = ref('');

  // Remote Judge Account Modal State
  const showAccountModal = ref(false);
  const accountFormType = ref<'add' | 'edit'>('add');
  const accountFormModel = reactive({
    id: '',
    platform: '',
    username: '',
    password: '',
    maxConcurrency: 1,
    status: true
  });

  // Contest ID Validation State
  const contestIdValidation = reactive({
    status: undefined as 'success' | 'error' | 'warning' | undefined,
    message: '',
    loading: false
  });

  // Config State
  const config = reactive<SystemConfig>({
    websiteName: '',
    logoUrl: '',
    icpCode: '',
    allowRegister: true,
    registerMode: 'PUBLIC',
    allowedEmailSuffixes: [],
    maintenanceMode: false,
    intranetAccessOnly: false,
    contestMode: false,
    contestId: '',

    smtpHost: '',
    smtpPort: 465,
    smtpEmail: '',
    smtpNickname: 'HnieOJ',
    smtpPassword: '',
    smtpSecurity: 'SSL',

    judgeToken: '',
    defaultTimeLimit: 1000,
    defaultMemoryLimit: 256,
    remoteJudgeAccounts: [],

    submissionInterval: 5,
    maxUploadSize: 10,
    storageDriver: 'LOCAL'
  });

  // Options
  const registerModeOptions = [
    { label: '公开注册', value: 'PUBLIC' },
    { label: '邮箱后缀限制', value: 'EMAIL_SUFFIX' }
  ];

  const smtpSecurityOptions = [
    { label: '无', value: 'NONE' },
    { label: 'SSL', value: 'SSL' },
    { label: 'TLS', value: 'TLS' }
  ];

  const storageDriverOptions = [
    { label: '本地存储', value: 'LOCAL' },
    { label: '阿里云 OSS', value: 'OSS' },
    { label: '华为云 OBS', value: 'OBS' }
  ];

  const platformOptions = [
    { label: 'Codeforces', value: 'Codeforces' },
    { label: 'AtCoder', value: 'AtCoder' },
    { label: 'Vjudge', value: 'Vjudge' },
    { label: 'POJ', value: 'POJ' }
  ];

  // Mock API: Fetch Config
  const fetchConfig = async () => {
    loading.value = true;
    try {
      console.log('API: Fetching system config...');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock Data
      Object.assign(config, {
        websiteName: 'HnieOJ Online Judge',
        logoUrl: 'https://example.com/logo.png',
        icpCode: '湘ICP备12345678号',
        allowRegister: true,
        registerMode: 'PUBLIC',
        allowedEmailSuffixes: ['@hnie.edu.cn', '@stu.hnie.edu.cn'],
        maintenanceMode: false,
        intranetAccessOnly: false,
        contestMode: false,
        contestId: '',

        smtpHost: 'smtp.exmail.qq.com',
        smtpPort: 465,
        smtpEmail: 'no-reply@hnie.edu.cn',
        smtpNickname: 'HnieOJ Admin',
        smtpPassword: 'password_placeholder',
        smtpSecurity: 'SSL',

        judgeToken: 'd83j9d2-j92d-92jd-92jd-92jd92jd92jd',
        defaultTimeLimit: 1000,
        defaultMemoryLimit: 256,
        remoteJudgeAccounts: [
          { id: '1', platform: 'Codeforces', username: 'bot01', maxConcurrency: 1, status: true },
          { id: '2', platform: 'AtCoder', username: 'bot02', maxConcurrency: 2, status: false }
        ],

        submissionInterval: 10,
        maxUploadSize: 50,
        storageDriver: 'LOCAL'
      });
    } catch (_error) {
      message.error('加载配置失败');
    } finally {
      loading.value = false;
    }
  };

  // Mock API: Save Config
  const saveConfig = async () => {
    loading.value = true;
    try {
      console.log('API: Saving system config...', JSON.parse(JSON.stringify(config)));
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('配置保存成功');
    } catch (_error) {
      message.error('保存配置失败');
    } finally {
      loading.value = false;
    }
  };

  // Mock API: Check Contest ID
  const checkContestId = async () => {
    if (!config.contestId) {
      contestIdValidation.status = undefined;
      contestIdValidation.message = '';
      return;
    }
    contestIdValidation.loading = true;
    try {
      console.log(`API: Checking contest ID ${config.contestId}...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (config.contestId === '1001') {
        contestIdValidation.status = 'success';
        contestIdValidation.message = '有效比赛: HnieOJ 2024 程序设计竞赛';
      } else {
        contestIdValidation.status = 'error';
        contestIdValidation.message = '比赛不存在或无效';
      }
    } catch (_error) {
      contestIdValidation.status = 'error';
      contestIdValidation.message = '验证请求失败';
    } finally {
      contestIdValidation.loading = false;
    }
  };

  // Mock API: Send Test Email
  const sendTestEmail = async () => {
    if (!testEmailRecipient.value) {
      message.warning('请输入接收邮箱');
      return;
    }
    sendingEmail.value = true;
    try {
      console.log(`API: Sending test email to ${testEmailRecipient.value}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      message.success('测试邮件发送成功');
    } catch (_error) {
      message.error('测试邮件发送失败');
    } finally {
      sendingEmail.value = false;
    }
  };

  // Remote Judge Account Actions
  const openAccountModal = (type: 'add' | 'edit', platform?: string, row?: RemoteJudgeAccount) => {
    accountFormType.value = type;
    if (type === 'edit' && row) {
      Object.assign(accountFormModel, { ...row, password: '' });
    } else {
      Object.assign(accountFormModel, {
        id: '',
        platform: platform || 'Codeforces',
        username: '',
        password: '',
        maxConcurrency: 1,
        status: true
      });
    }
    showAccountModal.value = true;
  };

  const handleAccountSubmit = async () => {
    if (!accountFormModel.username) {
      message.warning('请填写用户名');
      return;
    }

    if (accountFormType.value === 'add' && !accountFormModel.password) {
      message.warning('请填写密码');
      return;
    }

    loading.value = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (accountFormType.value === 'add') {
        console.log('API: POST remote judge account...', accountFormModel);
        config.remoteJudgeAccounts.push({
          ...accountFormModel,
          id: Date.now().toString()
        });
        message.success('添加成功');
      } else {
        console.log('API: PUT remote judge account...', accountFormModel);
        const index = config.remoteJudgeAccounts.findIndex(a => a.id === accountFormModel.id);
        if (index !== -1) {
          config.remoteJudgeAccounts[index] = { ...accountFormModel };
          message.success('更新成功');
        }
      }
      showAccountModal.value = false;
    } finally {
      loading.value = false;
    }
  };

  const deleteAccount = (row: RemoteJudgeAccount) => {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除 ${row.platform} 账号 ${row.username} 吗？`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        loading.value = true;
        try {
          console.log(`API: Deleting account ${row.id}...`);
          await new Promise(resolve => setTimeout(resolve, 300));
          config.remoteJudgeAccounts = config.remoteJudgeAccounts.filter(a => a.id !== row.id);
          message.success('删除成功');
        } finally {
          loading.value = false;
        }
      }
    });
  };

  // Judger Token Actions
  const regenerateToken = () => {
    dialog.warning({
      title: '重置 Token',
      content: '重置 Token 后，所有判题机需更新配置才能正常工作，确定继续吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        loading.value = true;
        try {
          console.log('API: Regenerating token...');
          await new Promise(resolve => setTimeout(resolve, 500));
          config.judgeToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
          message.success('Token 已重置');
        } finally {
          loading.value = false;
        }
      }
    });
  };

  const copyToken = () => {
    if (config.judgeToken) {
      navigator.clipboard.writeText(config.judgeToken);
      message.success('Token 已复制到剪贴板');
    }
  };

  onMounted(() => {
    fetchConfig();
  });

  return {
    config,
    loading,
    sendingEmail,
    testEmailRecipient,
    showAccountModal,
    accountFormType,
    accountFormModel,
    contestIdValidation,
    registerModeOptions,
    smtpSecurityOptions,
    storageDriverOptions,
    platformOptions,
    fetchConfig,
    saveConfig,
    checkContestId,
    sendTestEmail,
    openAccountModal,
    handleAccountSubmit,
    deleteAccount,
    regenerateToken,
    copyToken
  };
}
