import { ref } from 'vue';
import { get, post } from '@/utils/api';

// 对应后端 JudgeNodeTokenVo（节点注册事实 + 心跳审计）。
// 只暴露 VO 真实字段：实体内部字段（authorizationUntil、draining 等）不在响应中。
export interface JudgeNode {
  id: number;
  tokenId: string;
  nodeId: string | null;
  nodeName: string | null;
  nodeType: string | null;
  status: string | null;
  expireTime: string | null;
  lastUsedTime: string | null;
  lastHeartbeatTime: string | null;
  online: boolean;
  maxConcurrency: number | null;
  runningTasks: number | null;
  cpuCore: number | null;
  version: string | null;
  supportedJudgeModes: string[] | null;
  cacheUsedBytes: number | null;
  cacheProblemCount: number | null;
  diskTotalBytes: number | null;
  diskFreeBytes: number | null;
  gmtCreate: string | null;
}

// 对应后端 CreateNodeBootstrapRequest：正式/临时节点共用同一签发接口。
export interface CreateBootstrapTokenPayload {
  nodeType: 'formal' | 'temp';
  nodeName?: string;
  maxConcurrency: number;
  supportedJudgeModes?: string[];
  weight?: number;
  /** Bootstrap 明文注册凭据过期时间（epoch 毫秒，必须为未来且不超过 30 天）。 */
  expiresAt: number;
  /** 节点硬授权截止（epoch 毫秒）；temp 必填且必须大于当前时间。 */
  authorizationUntil?: number;
  remark?: string;
}

// 对应后端 NodeBootstrapVo：明文 bootstrapToken 只在签发响应中出现一次。
export interface NodeBootstrap {
  authCodeId: number | null;
  bootstrapToken: string;
  nodeType: string | null;
  expiresAt: number;
}

export interface RemoteJudgeAccount {
  id: number;
  oj: string;
  username: string;
  status: number;
  maxConcurrency: number | null;
  gmtCreate: string | null;
}

// 后端 NodeProtocolConstants 的节点状态取值。
export const JUDGE_NODE_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  DRAINING: 'draining',
  REVOKED: 'revoked',
} as const;

// 后端 judgeNodeSecurityService.normalizeModes 仅接受这三个模式。
export const JUDGE_MODES = ['default', 'spj', 'interactive'] as const;

// Bootstrap 凭据有效期上限：后端 MAX_BOOTSTRAP_TTL_MILLIS = 30 天。
export const MAX_BOOTSTRAP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// 节点硬到期判定：VO 只有 expireTime，以其为准。
export const isNodeExpired = (row: Pick<JudgeNode, 'expireTime'>): boolean => {
  if (!row.expireTime) return false;
  const deadline = new Date(row.expireTime).getTime();
  return Number.isFinite(deadline) && deadline <= Date.now();
};

// 列表读取结果：
// - ok    = 本次响应为当前会话/最新一次请求，已写入状态；
// - stale = 被会话切换或同列表更新的请求取代，调用方不得据此判断成功/失败；
// - error = 读取失败，error 已更新，调用方应给出「刷新失败」而非确认成功的反馈。
export type JudgeReadOutcome = 'ok' | 'stale' | 'error';

export function useJudgeNodes() {
  const nodes = ref<JudgeNode[]>([]);
  const tokens = ref<JudgeNode[]>([]);
  const remoteAccounts = ref<RemoteJudgeAccount[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 会话代号：账号切换/路由离开时递增，丢弃在途旧响应，避免污染切换后的会话。
  let sessionEpoch = 0;
  const isCurrentSession = (epoch: number) => epoch === sessionEpoch;

  // 每个列表各自的请求序号：同一会话内并发读取时，只有最新一次请求可以写入
  // 状态/loading/error，避免迟到的旧响应覆盖更新的列表。
  let nodesSerial = 0;
  let tokensSerial = 0;
  let accountsSerial = 0;

  const resetSession = () => {
    sessionEpoch += 1;
    nodes.value = [];
    tokens.value = [];
    remoteAccounts.value = [];
    loading.value = false;
    error.value = null;
  };

  const fetchNodes = async (status?: string): Promise<JudgeReadOutcome> => {
    const epoch = sessionEpoch;
    const serial = ++nodesSerial;
    loading.value = true;
    error.value = null;
    try {
      const data = (await get<JudgeNode[]>('/api/admin/judge/nodes', { status })) ?? [];
      if (!isCurrentSession(epoch) || serial !== nodesSerial) return 'stale';
      nodes.value = data;
      return 'ok';
    } catch (err) {
      if (!isCurrentSession(epoch) || serial !== nodesSerial) return 'stale';
      nodes.value = [];
      error.value = err instanceof Error ? err.message : '判题节点加载失败';
      return 'error';
    } finally {
      if (isCurrentSession(epoch) && serial === nodesSerial) loading.value = false;
    }
  };

  const fetchTokens = async (status?: string): Promise<JudgeReadOutcome> => {
    const epoch = sessionEpoch;
    const serial = ++tokensSerial;
    loading.value = true;
    error.value = null;
    try {
      const data = (await get<JudgeNode[]>('/api/admin/judge/nodes/tokens', { status })) ?? [];
      if (!isCurrentSession(epoch) || serial !== tokensSerial) return 'stale';
      tokens.value = data;
      return 'ok';
    } catch (err) {
      if (!isCurrentSession(epoch) || serial !== tokensSerial) return 'stale';
      tokens.value = [];
      error.value = err instanceof Error ? err.message : '节点凭证加载失败';
      return 'error';
    } finally {
      if (isCurrentSession(epoch) && serial === tokensSerial) loading.value = false;
    }
  };

  const fetchRemoteAccounts = async (oj?: string, status?: number): Promise<JudgeReadOutcome> => {
    const epoch = sessionEpoch;
    const serial = ++accountsSerial;
    loading.value = true;
    error.value = null;
    try {
      const data =
        (await get<RemoteJudgeAccount[]>('/api/admin/judge/account', { oj, status })) ?? [];
      if (!isCurrentSession(epoch) || serial !== accountsSerial) return 'stale';
      remoteAccounts.value = data;
      return 'ok';
    } catch (err) {
      if (!isCurrentSession(epoch) || serial !== accountsSerial) return 'stale';
      remoteAccounts.value = [];
      error.value = err instanceof Error ? err.message : '远程评测账号加载失败';
      return 'error';
    } finally {
      if (isCurrentSession(epoch) && serial === accountsSerial) loading.value = false;
    }
  };

  // 正式/临时节点统一通过 Bootstrap 一次性签发注册凭据。
  const createBootstrapToken = async (
    payload: CreateBootstrapTokenPayload,
  ): Promise<NodeBootstrap> => {
    return post<NodeBootstrap>('/api/admin/judge/nodes/bootstrap-tokens', {
      nodeType: payload.nodeType,
      nodeName: payload.nodeName || undefined,
      maxConcurrency: payload.maxConcurrency,
      supportedJudgeModes: payload.supportedJudgeModes?.length
        ? payload.supportedJudgeModes
        : undefined,
      weight: payload.weight,
      expiresAt: payload.expiresAt,
      authorizationUntil: payload.authorizationUntil,
      remark: payload.remark || undefined,
    });
  };

  const revokeToken = async (tokenId: string): Promise<void> => {
    await post(`/api/admin/judge/nodes/tokens/${encodeURIComponent(tokenId)}/revoke`);
  };

  // 排空：停止新调度，保留在途续租/结果。
  const drainNode = async (tokenId: string): Promise<JudgeNode> => {
    return post<JudgeNode>(`/api/admin/judge/nodes/tokens/${encodeURIComponent(tokenId)}/drain`);
  };

  // 恢复：吊销/硬到期节点后端拒绝启用，调用方需先做 UI 侧判定。
  const enableNode = async (tokenId: string): Promise<JudgeNode> => {
    return post<JudgeNode>(`/api/admin/judge/nodes/tokens/${encodeURIComponent(tokenId)}/enable`);
  };

  return {
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
  };
}
