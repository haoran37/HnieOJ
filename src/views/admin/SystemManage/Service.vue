<template>
  <div class="judge-service-page">
    <div class="page-header">
      <h2 class="title">判题服务管理</h2>
      <n-space>
        <n-button size="small" :loading="loading" @click="refreshAll">刷新</n-button>
        <n-button size="small" type="primary" @click="openIssueModal">签发节点凭证</n-button>
        <n-button size="small" secondary @click="openAuthCodeModal">生成临时授权码</n-button>
      </n-space>
    </div>

    <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">{{ error }}</n-alert>

    <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab-pane name="nodes" tab="节点状态">
        <n-data-table
          :columns="nodeColumns"
          :data="nodes"
          :loading="loading"
          :row-key="(row: JudgeNode) => row.tokenId || row.nodeId || String(row.id)"
          :scroll-x="1300"
          size="small"
        />
      </n-tab-pane>

      <n-tab-pane name="tokens" tab="短期 Token">
        <n-data-table
          :columns="nodeColumns"
          :data="tokens"
          :loading="loading"
          :row-key="(row: JudgeNode) => row.tokenId || String(row.id)"
          :scroll-x="1300"
          size="small"
        />
      </n-tab-pane>

      <n-tab-pane name="accounts" tab="远程评测账号">
        <n-data-table
          :columns="accountColumns"
          :data="remoteAccounts"
          :loading="loading"
          :row-key="(row: RemoteJudgeAccount) => String(row.id)"
          size="small"
        />
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="showIssueModal" preset="card" title="签发判题节点正式凭证" style="width: 520px">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="节点名称">
          <n-input v-model:value="issueForm.nodeName" placeholder="如 judge-node-01" />
        </n-form-item>
        <n-form-item label="最大并发">
          <n-input-number v-model:value="issueForm.maxConcurrency" :min="1" :max="10000" />
        </n-form-item>
        <n-form-item label="支持判题模式">
          <n-select
            v-model:value="issueForm.supportedJudgeModes"
            multiple
            filterable
            tag
            :options="judgeModeOptions"
            placeholder="默认 default；可输入自定义模式"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showIssueModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleIssue">签发</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showAuthCodeModal" preset="card" title="生成临时节点授权码" style="width: 520px">
      <n-form label-placement="left" label-width="120">
        <n-form-item label="节点名称">
          <n-input v-model:value="authForm.nodeName" placeholder="可选" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="authForm.remark" placeholder="可选" />
        </n-form-item>
        <n-form-item label="有效期(秒)">
          <n-input-number v-model:value="authForm.expireSeconds" :min="60" />
        </n-form-item>
        <n-form-item label="可兑换次数">
          <n-input-number v-model:value="authForm.maxExchangeCount" :min="1" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAuthCodeModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleCreateAuthCode">生成</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showSecretModal"
      preset="card"
      :title="secretTitle"
      style="width: 560px"
      @after-leave="clearSecret"
    >
      <n-alert type="warning" :bordered="false" style="margin-bottom: 12px">
        该凭证仅在签发成功时展示一次，关闭后无法再次查看，请立即复制并妥善保管。
      </n-alert>
      <n-input :value="secretValue" readonly type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
      <template #footer>
        <n-space justify="end">
          <n-button type="primary" @click="copySecret">复制凭证</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NSwitch, NTag, useDialog, useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import {
  useJudgeNodes,
  type JudgeNode,
  type RemoteJudgeAccount,
} from '@/composables/admin/useJudgeNodes';

const message = useMessage();
const dialog = useDialog();

const {
  nodes,
  tokens,
  remoteAccounts,
  loading,
  error,
  fetchNodes,
  fetchTokens,
  fetchRemoteAccounts,
  issueFormalToken,
  createAuthCode,
  revokeToken,
  setDraining,
} = useJudgeNodes();

const activeTab = ref('nodes');
const submitting = ref(false);

const showIssueModal = ref(false);
const showAuthCodeModal = ref(false);
const showSecretModal = ref(false);
const secretTitle = ref('节点凭证');
const secretValue = ref('');

const issueForm = reactive({
  nodeName: '',
  maxConcurrency: 1,
  supportedJudgeModes: [] as string[],
});

const authForm = reactive({
  nodeName: '',
  remark: '',
  expireSeconds: 3600,
  maxExchangeCount: 1,
});

const judgeModeOptions = [
  { label: 'default（普通判题）', value: 'default' },
  { label: 'spj（特殊判题）', value: 'spj' },
  { label: 'interactive（交互题）', value: 'interactive' },
];

// 返回真实 Promise：签发/吊销/排空后的 await refreshAll 必须等到重新请求完成
const handleTabChange = (name: string): Promise<void> => {
  if (name === 'nodes') return fetchNodes();
  if (name === 'tokens') return fetchTokens();
  return fetchRemoteAccounts();
};

const refreshAll = (): Promise<void> => handleTabChange(activeTab.value);

const clearSecret = () => {
  secretValue.value = '';
};

const copySecret = async () => {
  if (!secretValue.value) return;
  try {
    await navigator.clipboard.writeText(secretValue.value);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败，请手动选择复制');
  }
};

const openIssueModal = () => {
  issueForm.nodeName = '';
  issueForm.maxConcurrency = 1;
  issueForm.supportedJudgeModes = [];
  showIssueModal.value = true;
};

const openAuthCodeModal = () => {
  authForm.nodeName = '';
  authForm.remark = '';
  authForm.expireSeconds = 3600;
  authForm.maxExchangeCount = 1;
  showAuthCodeModal.value = true;
};

const handleIssue = async () => {
  if (!issueForm.nodeName.trim()) {
    message.warning('请填写节点名称');
    return;
  }
  if (!issueForm.maxConcurrency) {
    message.warning('请填写最大并发');
    return;
  }
  submitting.value = true;
  try {
    const result = await issueFormalToken({
      nodeName: issueForm.nodeName.trim(),
      maxConcurrency: issueForm.maxConcurrency,
      supportedJudgeModes: issueForm.supportedJudgeModes,
    });
    if (!result?.token) {
      throw new Error('签发成功但未返回凭证');
    }
    showIssueModal.value = false;
    secretTitle.value = '节点正式凭证';
    secretValue.value = result.token;
    showSecretModal.value = true;
    await refreshAll();
  } catch (err) {
    message.error(err instanceof Error ? err.message : '签发节点凭证失败');
  } finally {
    submitting.value = false;
  }
};

const handleCreateAuthCode = async () => {
  if (!authForm.expireSeconds || authForm.expireSeconds < 60) {
    message.warning('有效期不能小于 60 秒');
    return;
  }
  if (!authForm.maxExchangeCount || authForm.maxExchangeCount < 1) {
    message.warning('可兑换次数至少为 1');
    return;
  }
  submitting.value = true;
  try {
    const result = await createAuthCode({
      nodeName: authForm.nodeName.trim(),
      remark: authForm.remark.trim(),
      expireSeconds: authForm.expireSeconds,
      maxExchangeCount: authForm.maxExchangeCount,
    });
    if (!result?.authCode) {
      throw new Error('生成成功但未返回授权码');
    }
    showAuthCodeModal.value = false;
    secretTitle.value = '临时节点授权码';
    secretValue.value = result.authCode;
    showSecretModal.value = true;
  } catch (err) {
    message.error(err instanceof Error ? err.message : '生成授权码失败');
  } finally {
    submitting.value = false;
  }
};

const confirmRevoke = (row: JudgeNode) => {
  const tokenId = row.tokenId;
  if (!tokenId) return;
  dialog.warning({
    title: '吊销凭证',
    content: `确定吊销节点 ${row.nodeName || row.nodeId || tokenId} 的凭证吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await revokeToken(tokenId);
        message.success('已吊销');
        await refreshAll();
      } catch (err) {
        message.error(err instanceof Error ? err.message : '吊销失败');
      }
    },
  });
};

const toggleDraining = async (row: JudgeNode, value: boolean) => {
  if (!row.tokenId) return;
  try {
    await setDraining(row.tokenId, value);
    message.success(value ? '已进入排空状态' : '已恢复接收任务');
    await refreshAll();
  } catch (err) {
    message.error(err instanceof Error ? err.message : '更新排空状态失败');
  }
};

const nodeColumns: DataTableColumns<JudgeNode> = [
  { title: '节点名称', key: 'nodeName', width: 150, render: (row) => row.nodeName || row.nodeId || '-' },
  { title: '类型', key: 'nodeType', width: 90, render: (row) => row.nodeType || '-' },
  { title: '状态', key: 'status', width: 100, render: (row) => row.status || '-' },
  {
    title: '在线',
    key: 'online',
    width: 80,
    render(row) {
      return h(NTag, { type: row.online ? 'success' : 'default', size: 'small', bordered: false },
        { default: () => (row.online ? '在线' : '离线') });
    },
  },
  {
    title: '并发(运行/最大)',
    key: 'runningTasks',
    width: 140,
    render: (row) => `${row.runningTasks ?? 0} / ${row.approvedMaxConcurrency ?? row.maxConcurrency ?? '-'}`,
  },
  { title: '版本', key: 'version', width: 100, render: (row) => row.version || '-' },
  { title: '最后心跳', key: 'lastHeartbeatTime', width: 170, render: (row) => formatFullTime(row.lastHeartbeatTime) },
  { title: '授权到期', key: 'authorizationUntil', width: 170, render: (row) => formatFullTime(row.authorizationUntil || row.expireTime) },
  {
    title: '支持模式',
    key: 'supportedJudgeModes',
    width: 160,
    render: (row) => (row.supportedJudgeModes?.length ? row.supportedJudgeModes.join(', ') : '-'),
  },
  {
    title: '排空',
    key: 'draining',
    width: 90,
    render(row) {
      return h(NSwitch, {
        value: !!row.draining,
        size: 'small',
        onUpdateValue: (value: boolean) => { void toggleDraining(row, value); },
      });
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row) {
      return h(NButton, {
        text: true,
        type: 'error',
        onClick: () => confirmRevoke(row),
      }, { default: () => '吊销' });
    },
  },
];

const remoteStatusText = (status: number) => {
  if (status === 0) return '禁用';
  if (status === 1) return '正常';
  return String(status);
};

const accountColumns: DataTableColumns<RemoteJudgeAccount> = [
  { title: 'OJ', key: 'oj', width: 160 },
  { title: '用户名', key: 'username', width: 200 },
  { title: '状态', key: 'status', width: 100, render: (row) => remoteStatusText(row.status) },
  { title: '最大并发', key: 'maxConcurrency', width: 120, render: (row) => row.maxConcurrency ?? '-' },
  { title: '创建时间', key: 'gmtCreate', width: 180, render: (row) => formatFullTime(row.gmtCreate) },
];

onMounted(() => {
  void fetchNodes();
});
</script>

<style scoped lang="less">
.judge-service-page {
  background-color: #fff;
  border-radius: 4px;
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
  }
}
</style>
