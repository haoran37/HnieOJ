<template>
  <div class="judge-service-page">
    <div class="page-header">
      <h2 class="title">判题服务管理</h2>
      <n-space>
        <n-button size="small" :loading="loading" @click="refreshAll">刷新</n-button>
        <n-button size="small" type="primary" @click="openBootstrapModal">签发注册凭据</n-button>
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

    <n-modal
      v-model:show="showBootstrapModal"
      preset="card"
      title="签发节点注册凭据"
      style="width: 600px"
      @update:show="onBootstrapShowUpdate"
    >
      <n-alert type="info" :bordered="false" style="margin-bottom: 12px">
        正式节点与临时节点都通过 Bootstrap 接口一次性签发注册凭据；明文凭据只在签发成功后展示一次。
      </n-alert>
      <n-form label-placement="left" label-width="150">
        <n-form-item label="节点类型">
          <n-select v-model:value="bootstrapForm.nodeType" :options="nodeTypeOptions" />
        </n-form-item>
        <n-form-item label="节点名称">
          <n-input v-model:value="bootstrapForm.nodeName" placeholder="如 judge-node-01" />
        </n-form-item>
        <n-form-item label="最大并发">
          <n-input-number v-model:value="bootstrapForm.maxConcurrency" :min="1" :max="1000" />
        </n-form-item>
        <n-form-item label="支持判题模式">
          <n-select
            v-model:value="bootstrapForm.supportedJudgeModes"
            multiple
            :options="judgeModeOptions"
            placeholder="默认 default；仅可选 default/spj/interactive"
          />
        </n-form-item>
        <n-form-item label="权重">
          <n-input-number v-model:value="bootstrapForm.weight" :min="1" :max="100" placeholder="默认 10" />
        </n-form-item>
        <n-form-item label="注册凭据有效期">
          <div class="field-with-hint">
            <n-date-picker
              v-model:value="bootstrapForm.expiresAt"
              type="datetime"
              clearable
              style="width: 100%"
            />
            <n-text depth="3" class="field-hint">注册凭据本身的过期时间（最长 30 天），过期后不能再注册</n-text>
          </div>
        </n-form-item>
        <n-form-item
          :label="bootstrapForm.nodeType === 'temp' ? '节点授权截止（必填）' : '节点授权截止（可选）'"
        >
          <div class="field-with-hint">
            <n-date-picker
              v-model:value="bootstrapForm.authorizationUntil"
              type="datetime"
              clearable
              style="width: 100%"
            />
            <n-text depth="3" class="field-hint">节点可被调度的硬截止时间；临时节点必填且必须晚于当前时间</n-text>
          </div>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="bootstrapForm.remark" placeholder="可选" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="submitting" @click="closeBootstrapModal">取消</n-button>
          <n-button type="primary" :loading="submitting" :disabled="submitting" @click="handleBootstrap">
            签发
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showSecretModal"
      preset="card"
      :title="secretTitle"
      style="width: 560px"
      @update:show="onSecretShowUpdate"
      @after-leave="clearSecret"
    >
      <n-alert type="warning" :bordered="false" style="margin-bottom: 12px">
        该注册凭据仅在签发成功时展示一次；关闭弹窗、离开本页或切换账号后无法再次查看，请立即复制并通过受控渠道交给节点运维。
      </n-alert>
      <n-input :value="secretValue" readonly type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
      <template #footer>
        <n-space justify="end">
          <n-button type="primary" :disabled="!secretValue" @click="copySecret">复制凭据</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, onUnmounted, reactive, ref, watch, type VNode } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';
import { useUserStore } from '@/stores/userStore';
import {
  JUDGE_MODES,
  JUDGE_NODE_STATUS,
  MAX_BOOTSTRAP_TTL_MS,
  isNodeExpired,
  useJudgeNodes,
  type JudgeNode,
  type JudgeReadOutcome,
  type RemoteJudgeAccount,
} from '@/composables/admin/useJudgeNodes';

const message = useMessage();
const dialog = useDialog();
const userStore = useUserStore();

const {
  nodes,
  tokens,
  remoteAccounts,
  loading,
  error,
  fetchNodes,
  fetchTokens,
  fetchRemoteAccounts,
  resetSession,
  createBootstrapToken,
  revokeToken,
  drainNode,
  enableNode,
} = useJudgeNodes();

const activeTab = ref('nodes');
const submitting = ref(false);

const showBootstrapModal = ref(false);
const showSecretModal = ref(false);
const secretTitle = ref('节点注册凭据');
const secretValue = ref('');

// 生命周期操作去重：同一 token 请求在途期间只发一次
const pendingTokenIds = reactive(new Set<string>());

// 组件会话代号：账号切换/路由离开/卸载时递增，作废所有在途请求的后续副作用，
// 不能只依赖 composable 的列表读取守卫。
let sessionEpoch = 0;
const isCurrentSession = (epoch: number) => epoch === sessionEpoch;

// 签发弹窗代次：关闭/重新打开/切换会话都会递增，作废在途签发结果，
// 避免关闭弹窗或换账号后迟到响应又弹出一次性凭据。
let bootstrapEpoch = 0;
const invalidateBootstrap = () => {
  bootstrapEpoch += 1;
  submitting.value = false;
};

const defaultExpiresAt = () => Date.now() + 60 * 60 * 1000;

// 正式/临时节点合并为同一表单；nodeType 用 string 承接 n-select，提交前归一为 formal/temp
const bootstrapForm = reactive({
  nodeType: 'formal' as string,
  nodeName: '',
  maxConcurrency: 1,
  supportedJudgeModes: ['default'] as string[],
  weight: 10 as number | null,
  expiresAt: defaultExpiresAt() as number | null,
  authorizationUntil: null as number | null,
  remark: '',
});

const resetBootstrapForm = () => {
  bootstrapForm.nodeType = 'formal';
  bootstrapForm.nodeName = '';
  bootstrapForm.maxConcurrency = 1;
  bootstrapForm.supportedJudgeModes = ['default'];
  bootstrapForm.weight = 10;
  bootstrapForm.expiresAt = defaultExpiresAt();
  bootstrapForm.authorizationUntil = null;
  bootstrapForm.remark = '';
};

const nodeTypeOptions = [
  { label: '正式节点（formal）', value: 'formal' },
  { label: '临时节点（temp）', value: 'temp' },
];

const JUDGE_MODE_LABELS: Record<(typeof JUDGE_MODES)[number], string> = {
  default: 'default（普通判题）',
  spj: 'spj（特殊判题）',
  interactive: 'interactive（交互题）',
};

const judgeModeOptions = JUDGE_MODES.map((mode) => ({
  label: JUDGE_MODE_LABELS[mode],
  value: mode,
}));

// 返回本次回读结果（而非只返回 Promise<void> 或写入共享变量）：签发/吊销/排空/恢复
// 必须检查自己这次 await 到的 ok/stale/error，避免被并发旧读取覆盖后误报成功。
const handleTabChange = (name: string): Promise<JudgeReadOutcome> => {
  if (name === 'nodes') return fetchNodes();
  if (name === 'tokens') return fetchTokens();
  return fetchRemoteAccounts();
};

const refreshAll = (): Promise<JudgeReadOutcome> => handleTabChange(activeTab.value);

const clearSecret = () => {
  secretValue.value = '';
};

// 关闭秘钥弹窗时同步清空明文：只依赖 @after-leave 在离场动画/rAF 挂起时可能不触发，
// 导致明文凭据残留在 DOM 中。
const onSecretShowUpdate = (show: boolean) => {
  if (!show) clearSecret();
};

// 路由离开/账号变更/卸载：清空一次性凭据、复位在途状态并作废所有旧请求，
// 避免切换后的会话被迟到响应污染。
const handleSessionReset = () => {
  sessionEpoch += 1;
  invalidateBootstrap();
  clearSecret();
  showSecretModal.value = false;
  showBootstrapModal.value = false;
  resetBootstrapForm();
  pendingTokenIds.clear();
  resetSession();
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

// 关闭/取消签发弹窗：立即作废在途签发，迟到响应不得再弹出一次性凭据
const closeBootstrapModal = () => {
  invalidateBootstrap();
  showBootstrapModal.value = false;
};

const onBootstrapShowUpdate = (show: boolean) => {
  if (!show) closeBootstrapModal();
};

const openBootstrapModal = () => {
  invalidateBootstrap();
  resetBootstrapForm();
  showBootstrapModal.value = true;
};

const validateBootstrap = (): string | null => {
  const form = bootstrapForm;
  if (form.nodeType !== 'formal' && form.nodeType !== 'temp') return '节点类型必须为 formal 或 temp';
  if (!form.nodeName.trim()) return '请填写节点名称';
  if (!Number.isInteger(form.maxConcurrency) || form.maxConcurrency < 1 || form.maxConcurrency > 1000) {
    return '最大并发需为 1..1000 的整数';
  }
  if (form.weight != null && (!Number.isInteger(form.weight) || form.weight < 1 || form.weight > 100)) {
    return '权重需为 1..100 的整数';
  }
  if (!form.expiresAt) return '请选择注册凭据有效期';
  const now = Date.now();
  if (form.expiresAt <= now) return '注册凭据有效期必须晚于当前时间';
  if (form.expiresAt > now + MAX_BOOTSTRAP_TTL_MS) return '注册凭据有效期最长 30 天';
  if (form.nodeType === 'temp' && !form.authorizationUntil) {
    return '临时节点必须填写节点授权截止';
  }
  if (form.authorizationUntil != null && form.authorizationUntil <= now) {
    return '节点授权截止必须晚于当前时间';
  }
  const invalidMode = form.supportedJudgeModes.find(
    (mode) => !(JUDGE_MODES as readonly string[]).includes(mode),
  );
  if (invalidMode) return `不支持的判题模式：${invalidMode}`;
  return null;
};

const handleBootstrap = async () => {
  if (submitting.value) return;
  const invalid = validateBootstrap();
  if (invalid) {
    message.warning(invalid);
    return;
  }
  const epoch = sessionEpoch;
  const requestEpoch = bootstrapEpoch;
  submitting.value = true;
  try {
    const result = await createBootstrapToken({
      nodeType: bootstrapForm.nodeType as 'formal' | 'temp',
      nodeName: bootstrapForm.nodeName.trim(),
      maxConcurrency: bootstrapForm.maxConcurrency,
      supportedJudgeModes: bootstrapForm.supportedJudgeModes,
      weight: bootstrapForm.weight ?? undefined,
      expiresAt: bootstrapForm.expiresAt as number,
      authorizationUntil: bootstrapForm.authorizationUntil ?? undefined,
      remark: bootstrapForm.remark.trim() || undefined,
    });
    // 切换账号/关闭弹窗后到达的响应必须整体作废，不得回填凭据或弹窗
    if (!isCurrentSession(epoch) || requestEpoch !== bootstrapEpoch) return;
    if (!result?.bootstrapToken) {
      throw new Error('签发成功但未返回注册凭据');
    }
    showBootstrapModal.value = false;
    secretTitle.value = result.nodeType === 'temp' ? '临时节点注册凭据' : '正式节点注册凭据';
    secretValue.value = result.bootstrapToken;
    showSecretModal.value = true;
    const outcome = await refreshAll();
    if (!isCurrentSession(epoch)) return;
    if (outcome === 'error') {
      message.warning('注册凭据已签发，但节点列表刷新失败，请手动刷新确认');
    }
  } catch (err) {
    if (!isCurrentSession(epoch) || requestEpoch !== bootstrapEpoch) return;
    message.error(err instanceof Error ? err.message : '签发节点注册凭据失败');
  } finally {
    if (isCurrentSession(epoch) && requestEpoch === bootstrapEpoch) submitting.value = false;
  }
};

const runLifecycle = async (
  row: JudgeNode,
  request: (tokenId: string) => Promise<unknown>,
  successText: string,
  failText: string,
): Promise<void> => {
  const tokenId = row.tokenId;
  if (!tokenId || pendingTokenIds.has(tokenId)) return;
  const epoch = sessionEpoch;
  pendingTokenIds.add(tokenId);
  try {
    await request(tokenId);
    if (!isCurrentSession(epoch)) return;
    const outcome = await refreshAll();
    if (!isCurrentSession(epoch)) return;
    if (outcome === 'error') {
      // 请求已提交但回读失败：不得声称状态已确认
      message.warning(`${successText}，但列表刷新失败，请手动刷新确认`);
    } else if (outcome === 'ok') {
      message.success(successText);
    }
    // outcome === 'stale'：回读被更新的请求取代，不确认成功也不误报失败。
  } catch (err) {
    if (!isCurrentSession(epoch)) return;
    message.error(err instanceof Error ? err.message : failText);
  } finally {
    // 旧会话的 finally 不得删除新会话同 token 的在途标记
    if (isCurrentSession(epoch)) pendingTokenIds.delete(tokenId);
  }
};

const confirmRevoke = (row: JudgeNode) => {
  const tokenId = row.tokenId;
  if (!tokenId || row.status === JUDGE_NODE_STATUS.REVOKED || pendingTokenIds.has(tokenId)) return;
  const epoch = sessionEpoch;
  dialog.warning({
    title: '吊销凭证',
    content: `确定吊销节点 ${row.nodeName || row.nodeId || tokenId} 的凭证吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      // 弹窗确认可能在切换账号后才回调，此时不得再发起请求
      if (!isCurrentSession(epoch)) return;
      await runLifecycle(row, revokeToken, '已吊销', '吊销失败');
    },
  });
};

// 仅 active 且未硬到期可排空；后端对 revoked/disabled 排空返回 403
const canDrain = (row: JudgeNode) =>
  row.status === JUDGE_NODE_STATUS.ACTIVE && !isNodeExpired(row);

// 已吊销/硬到期节点后端拒绝启用，UI 不提供“恢复”入口，避免假成功
const canEnable = (row: JudgeNode) =>
  row.status !== JUDGE_NODE_STATUS.REVOKED && !isNodeExpired(row);

const handleDrain = (row: JudgeNode) => {
  if (!canDrain(row) || pendingTokenIds.has(row.tokenId)) return;
  return runLifecycle(row, drainNode, '已排空，节点停止接收新任务', '排空失败');
};

const handleEnable = (row: JudgeNode) => {
  if (!canEnable(row) || pendingTokenIds.has(row.tokenId)) return;
  return runLifecycle(row, enableNode, '已恢复接收任务', '恢复失败');
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
    render: (row) => `${row.runningTasks ?? 0} / ${row.maxConcurrency ?? '-'}`,
  },
  { title: '版本', key: 'version', width: 100, render: (row) => row.version || '-' },
  { title: '最后心跳', key: 'lastHeartbeatTime', width: 170, render: (row) => formatFullTime(row.lastHeartbeatTime) },
  { title: '到期', key: 'expireTime', width: 170, render: (row) => formatFullTime(row.expireTime) },
  {
    title: '支持模式',
    key: 'supportedJudgeModes',
    width: 160,
    render: (row) => (row.supportedJudgeModes?.length ? row.supportedJudgeModes.join(', ') : '-'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 190,
    render(row) {
      const pending = pendingTokenIds.has(row.tokenId);
      const actions: VNode[] = [];
      if (row.status === JUDGE_NODE_STATUS.DRAINING || row.status === JUDGE_NODE_STATUS.DISABLED) {
        actions.push(h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          disabled: !canEnable(row) || pending,
          onClick: () => handleEnable(row),
        }, { default: () => '恢复' }));
      } else if (row.status === JUDGE_NODE_STATUS.ACTIVE) {
        actions.push(h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          disabled: !canDrain(row) || pending,
          onClick: () => handleDrain(row),
        }, { default: () => '排空' }));
      }
      actions.push(h(NButton, {
        text: true,
        type: 'error',
        size: 'small',
        disabled: row.status === JUDGE_NODE_STATUS.REVOKED || pending,
        onClick: () => confirmRevoke(row),
      }, { default: () => '吊销' }));
      return h(NSpace, { size: 12, align: 'center' }, { default: () => actions });
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

// 账号变化（登录/登出/切换）时作废旧会话数据并清理一次性凭据
watch(
  () => userStore.token,
  () => {
    handleSessionReset();
    if (userStore.token) void refreshAll();
  },
);

onBeforeRouteLeave(() => {
  handleSessionReset();
});

onUnmounted(() => {
  handleSessionReset();
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

  .field-with-hint {
    width: 100%;

    .field-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      line-height: 1.4;
    }
  }
}
</style>
