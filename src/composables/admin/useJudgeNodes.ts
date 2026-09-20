import { ref } from 'vue';
import { get, post } from '@/utils/api';

// 后端 AdminJudgeNodeController / AdminJudgeController 的 VO
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
  authorizationUntil: string | null;
  approvedMaxConcurrency: number | null;
  draining: boolean;
  gmtCreate: string | null;
}

export interface JudgeAuthCode {
  id: number;
  authCode: string;
  nodeName: string | null;
  maxExchangeCount: number | null;
  expireTime: string | null;
}

export interface IssuedJudgeToken {
  token: string;
  tokenType: string | null;
  nodeId: string | null;
  tokenId: string | null;
  expireTime: string | null;
}

export interface RemoteJudgeAccount {
  id: number;
  oj: string;
  username: string;
  status: number;
  maxConcurrency: number | null;
  gmtCreate: string | null;
}

export interface CreateFormalTokenPayload {
  nodeName: string;
  maxConcurrency: number;
  supportedJudgeModes?: string[];
}

export interface CreateAuthCodePayload {
  nodeName?: string;
  remark?: string;
  expireSeconds: number;
  maxExchangeCount: number;
}

export function useJudgeNodes() {
  const nodes = ref<JudgeNode[]>([]);
  const tokens = ref<JudgeNode[]>([]);
  const remoteAccounts = ref<RemoteJudgeAccount[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchNodes = async (status?: string) => {
    loading.value = true;
    error.value = null;
    try {
      nodes.value = (await get<JudgeNode[]>('/api/admin/judge/nodes', { status })) ?? [];
    } catch (err) {
      nodes.value = [];
      error.value = err instanceof Error ? err.message : '判题节点加载失败';
    } finally {
      loading.value = false;
    }
  };

  const fetchTokens = async (status?: string) => {
    loading.value = true;
    error.value = null;
    try {
      tokens.value = (await get<JudgeNode[]>('/api/admin/judge/nodes/tokens', { status })) ?? [];
    } catch (err) {
      tokens.value = [];
      error.value = err instanceof Error ? err.message : '节点凭证加载失败';
    } finally {
      loading.value = false;
    }
  };

  const fetchRemoteAccounts = async (oj?: string, status?: number) => {
    loading.value = true;
    error.value = null;
    try {
      remoteAccounts.value =
        (await get<RemoteJudgeAccount[]>('/api/admin/judge/account', { oj, status })) ?? [];
    } catch (err) {
      remoteAccounts.value = [];
      error.value = err instanceof Error ? err.message : '远程评测账号加载失败';
    } finally {
      loading.value = false;
    }
  };

  // 逐节点签发正式凭证（废弃了共享主 Token）
  const issueFormalToken = async (payload: CreateFormalTokenPayload): Promise<IssuedJudgeToken> => {
    return post<IssuedJudgeToken>('/api/admin/judge/nodes/formal-tokens', {
      nodeName: payload.nodeName,
      maxConcurrency: payload.maxConcurrency,
      supportedJudgeModes: payload.supportedJudgeModes?.length ? payload.supportedJudgeModes : undefined,
    });
  };

  const createAuthCode = async (payload: CreateAuthCodePayload): Promise<JudgeAuthCode> => {
    return post<JudgeAuthCode>('/api/admin/judge/nodes/auth-codes', {
      nodeName: payload.nodeName || undefined,
      remark: payload.remark || undefined,
      expireSeconds: payload.expireSeconds,
      maxExchangeCount: payload.maxExchangeCount,
    });
  };

  const revokeToken = async (tokenId: string): Promise<void> => {
    await post(`/api/admin/judge/nodes/tokens/${encodeURIComponent(tokenId)}/revoke`);
  };

  const setDraining = async (tokenId: string, draining: boolean): Promise<void> => {
    await post(`/api/admin/judge/nodes/tokens/${encodeURIComponent(tokenId)}/draining`, { draining });
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
    issueFormalToken,
    createAuthCode,
    revokeToken,
    setDraining,
  };
}
