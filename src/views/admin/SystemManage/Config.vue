<template>
  <div class="system-config-page">
    <n-card :bordered="false" title="系统全局配置">
      <template #header-extra>
        <n-space align="center">
          <span v-if="gmtModified" class="tip-text">上次更新：{{ formatFullTime(gmtModified) }}</span>
          <n-button type="primary" :loading="loading" @click="saveConfig">
            <template #icon>
              <n-icon><SaveOutline /></n-icon>
            </template>
            保存配置
          </n-button>
        </n-space>
      </template>

      <n-alert v-if="error" type="error" :bordered="false" class="mb-4">{{ error }}</n-alert>

      <n-tabs type="segment" animated>
        <!-- 站点基础设置 -->
        <n-tab-pane name="website" tab="网站设置">
          <div class="tab-content">
            <n-form label-placement="left" label-width="120" :model="config" require-mark-placement="right-hanging">
              <n-divider title-placement="left">基础信息</n-divider>
              <n-form-item label="网站名称" path="websiteName">
                <n-input v-model:value="config.websiteName" placeholder="HnieOJ" />
              </n-form-item>
              <n-form-item label="Logo 链接" path="logoUrl">
                <n-input v-model:value="config.logoUrl" placeholder="https://..." />
              </n-form-item>
              <n-form-item label="ICP 备案号" path="icpCode">
                <n-input v-model:value="config.icpCode" placeholder="例如：湘ICP备..." />
              </n-form-item>

              <n-divider title-placement="left">注册控制</n-divider>
              <n-alert type="warning" :bordered="false" class="mb-3">
                开放、邮箱后缀与邀请码注册均由服务端在提交时校验。邀请码一次性使用，有效期为 7 天。
              </n-alert>
              <n-form-item label="允许注册" path="allowRegister">
                <n-space vertical align="start">
                  <n-space align="center">
                    <n-switch v-model:value="config.allowRegister" />
                    <n-select v-if="config.allowRegister" v-model:value="config.registerMode"
                      :options="registerModeOptions" style="width: 220px" size="small" />
                  </n-space>
                  <div v-if="config.allowRegister" class="tip-text">
                    可选注册模式：OPEN / EMAIL_SUFFIX / INVITE_CODE。
                  </div>
                  <n-dynamic-tags v-if="config.allowRegister && config.registerMode === 'EMAIL_SUFFIX'"
                    v-model:value="config.allowedEmailSuffixes" />
                  <div v-if="config.allowRegister && config.registerMode === 'EMAIL_SUFFIX'" class="tip-text">
                    请输入允许注册的邮箱后缀（如 @hnie.edu.cn），按回车添加
                  </div>
                </n-space>
              </n-form-item>
              <template v-if="config.allowRegister && config.registerMode === 'INVITE_CODE'">
                <n-divider title-placement="left">注册邀请码</n-divider>
                <n-space align="center" style="margin-bottom: 12px">
                  <n-button type="primary" :loading="invitesLoading" @click="handleCreateInvite">生成一次性邀请码</n-button>
                  <n-button :disabled="invitesLoading" @click="loadInvites">刷新列表</n-button>
                </n-space>
                <n-alert v-if="newInviteCode" type="success" style="margin-bottom: 12px">
                  新邀请码只显示这一次，请现在复制：{{ newInviteCode }}
                </n-alert>
                <n-alert v-if="invitesError" type="error" style="margin-bottom: 12px">{{ invitesError }}</n-alert>
                <n-data-table :columns="inviteColumns" :data="invites" :loading="invitesLoading"
                  :row-key="(row: InviteCodeVo) => row.id" size="small" />
              </template>
            </n-form>
          </div>
        </n-tab-pane>

        <!-- 邮件服务配置 -->
        <n-tab-pane name="smtp" tab="SMTP设置">
          <div class="tab-content">
            <n-alert type="info" show-icon class="mb-4">
              配置邮件服务用于发送注册验证码、密码重置邮件及系统通知。密码仅保存不回显。
            </n-alert>
            <n-form label-placement="left" label-width="120" :model="config">
              <n-grid :cols="2" :x-gap="24">
                <n-form-item-gi label="SMTP 主机" path="smtpHost">
                  <n-input v-model:value="config.smtpHost" placeholder="smtp.example.com" />
                </n-form-item-gi>
                <n-form-item-gi label="SMTP 端口" path="smtpPort">
                  <n-input-number v-model:value="config.smtpPort" :show-button="false" style="width: 100%" />
                </n-form-item-gi>
                <n-form-item-gi label="发件人邮箱" path="smtpEmail">
                  <n-input v-model:value="config.smtpEmail" placeholder="noreply@example.com" />
                </n-form-item-gi>
                <n-form-item-gi label="发件人昵称" path="smtpNickname">
                  <n-input v-model:value="config.smtpNickname" placeholder="HnieOJ System" />
                </n-form-item-gi>
                <n-form-item-gi label="邮箱密码" path="smtpPassword">
                  <n-input type="password" show-password-on="click" v-model:value="config.smtpPassword"
                    placeholder="留空表示不修改" />
                </n-form-item-gi>
              </n-grid>
            </n-form>
          </div>
        </n-tab-pane>

        <!-- 远程评测账号 -->
        <n-tab-pane name="judge" tab="评测配置">
          <div class="tab-content">
            <n-alert type="info" show-icon class="mb-4">
              判题节点凭证（逐节点签发）请在「系统管理 → 服务管理」中操作，不再使用共享主 Token。
            </n-alert>
            <n-divider title-placement="left">远程评测账号 (Remote Judge)</n-divider>
            <div class="account-toolbar">
              <n-button type="primary" size="small" :disabled="accountSaving" @click="openCreateAccountModal">
                <template #icon><n-icon><AddOutline /></n-icon></template>
                新建账号
              </n-button>
            </div>
            <n-alert v-if="accountsError" type="error" :bordered="false" class="mb-2">
              {{ accountsError }}
              <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchRemoteJudgeAccounts">
                重试
              </n-button>
            </n-alert>
            <div class="tip-text mb-2">密码只写不读：编辑时密码始终为空，留空表示保留原密码，新密码原样保存。</div>
            <n-data-table
              :columns="accountColumns"
              :data="remoteJudgeAccounts"
              :loading="accountsLoading"
              :row-key="(row: RemoteJudgeAccount) => String(row.id)"
              size="small"
              :bordered="false"
            />
            <div v-if="!accountsLoading && !accountsError && remoteJudgeAccounts.length === 0" class="tip-text empty-tip">
              暂无远程评测账号，可点击「新建账号」添加。
            </div>
          </div>
        </n-tab-pane>

        <!-- 安全与性能 -->
        <n-tab-pane name="advanced" tab="高级设置">
          <div class="tab-content">
            <n-form label-placement="left" label-width="140" :model="config">
              <n-divider title-placement="left">限制策略</n-divider>
              <n-form-item label="提交间隔限制" path="submissionInterval">
                <n-input-number v-model:value="config.submissionInterval" :min="0">
                  <template #suffix>秒</template>
                </n-input-number>
                <div class="tip-text ml-2">限制同一用户连续提交代码的最小时间间隔</div>
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <n-modal
      :show="showAccountModal"
      @update:show="handleAccountModalShowChange"
      preset="card"
      :title="accountModalMode === 'create' ? '新建远程评测账号' : '编辑远程评测账号'"
      style="width: 520px"
      :mask-closable="false"
    >
      <n-form :model="accountForm" label-placement="left" label-width="90">
        <n-form-item label="OJ" required>
          <n-input
            v-model:value="accountForm.oj"
            :maxlength="ACCOUNT_OJ_MAX"
            placeholder="如 codeforces"
            :disabled="accountSaving"
          />
        </n-form-item>
        <n-form-item label="账号" required>
          <n-input
            v-model:value="accountForm.username"
            :maxlength="ACCOUNT_USERNAME_MAX"
            :disabled="accountSaving"
          />
        </n-form-item>
        <n-form-item label="密码" :required="accountModalMode === 'create'">
          <n-input
            v-model:value="accountForm.password"
            type="password"
            show-password-on="click"
            :maxlength="ACCOUNT_PASSWORD_MAX"
            :placeholder="accountModalMode === 'create' ? '新增必填' : '留空表示不修改'"
            :disabled="accountSaving"
          />
        </n-form-item>
        <n-form-item label="状态" required>
          <n-radio-group v-model:value="accountForm.status" :disabled="accountSaving">
            <n-radio-button :value="1">正常</n-radio-button>
            <n-radio-button :value="0">禁用</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="最大并发" required>
          <n-input-number
            v-model:value="accountForm.maxConcurrency"
            :min="ACCOUNT_CONCURRENCY_MIN"
            :max="ACCOUNT_CONCURRENCY_MAX"
            :precision="0"
            :disabled="accountSaving"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="accountSaving" @click="closeAccountModal">取消</n-button>
          <n-button type="primary" :loading="accountSaving" :disabled="accountSaving" @click="handleAccountSubmit">
            提交
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { NButton, NPopconfirm, NSpace, NTag, useMessage, type DataTableColumns } from 'naive-ui';
import { AddOutline, SaveOutline } from '@vicons/ionicons5';
import { useSystemConfig, type RemoteJudgeAccount } from '@/composables/admin/useSystemConfig';
import { createInviteCode, getInviteCodes, revokeInviteCode, type InviteCodeVo } from '@/utils/api';

const {
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
} = useSystemConfig();

const message = useMessage();
const invites = ref<InviteCodeVo[]>([]);
const invitesLoading = ref(false);
const invitesError = ref<string | null>(null);
const newInviteCode = ref<string | null>(null);

async function loadInvites() {
  invitesLoading.value = true;
  invitesError.value = null;
  try {
    invites.value = await getInviteCodes();
  } catch (error) {
    invitesError.value = error instanceof Error ? error.message : '邀请码加载失败';
  } finally {
    invitesLoading.value = false;
  }
}

async function handleCreateInvite() {
  invitesLoading.value = true;
  newInviteCode.value = null;
  try {
    newInviteCode.value = await createInviteCode(Date.now() + 7 * 24 * 60 * 60 * 1000);
    message.success('邀请码已生成');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '邀请码生成失败');
  } finally {
    invitesLoading.value = false;
  }
  await loadInvites();
}

async function handleRevokeInvite(id: number) {
  try {
    await revokeInviteCode(id);
    message.success('邀请码已撤销');
    await loadInvites();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '邀请码撤销失败');
  }
}

const inviteColumns: DataTableColumns<InviteCodeVo> = [
  { title: '编号', key: 'id', width: 80 },
  { title: '签发人', key: 'createdBy' },
  { title: '到期时间', key: 'expiresAt', render: (row) => formatFullTime(row.expiresAt) },
  { title: '使用者', key: 'usedUid', render: (row) => row.usedUid || '未使用' },
  { title: '状态', key: 'status', render: (row) => row.usedUid ? '已使用'
    : row.status === 0 ? '已撤销' : new Date(row.expiresAt).getTime() <= Date.now() ? '已过期' : '可用' },
  { title: '操作', key: 'actions', render: (row) => row.status === 1 && !row.usedUid
    ? h(NPopconfirm, { onPositiveClick: () => handleRevokeInvite(row.id) }, {
      trigger: () => h(NButton, { size: 'tiny', type: 'error', secondary: true }, { default: () => '撤销' }),
      default: () => '确定撤销该邀请码？',
    }) : null },
];

onMounted(() => { void loadInvites(); });

const accountStatusText = (status: number) => {
  if (status === 0) return '禁用';
  if (status === 1) return '正常';
  return String(status);
};

const accountColumns: DataTableColumns<RemoteJudgeAccount> = [
  { title: 'OJ', key: 'oj', width: 140 },
  { title: '用户名', key: 'username', minWidth: 140, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row: RemoteJudgeAccount) {
      return h(NTag, { type: row.status === 1 ? 'success' : 'default', bordered: false, size: 'small' },
        { default: () => accountStatusText(row.status) });
    },
  },
  { title: '最大并发', key: 'maxConcurrency', width: 100 },
  {
    title: '创建时间',
    key: 'gmtCreate',
    width: 180,
    render: (row: RemoteJudgeAccount) => formatFullTime(row.gmtCreate),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render(row: RemoteJudgeAccount) {
      return h(NSpace, { align: 'center' }, {
        default: () => [
          h(NButton, { size: 'tiny', secondary: true, type: 'primary', disabled: accountSaving.value, onClick: () => openEditAccountModal(row) },
            { default: () => '编辑' }),
          h(NPopconfirm, { onPositiveClick: () => handleDeleteAccount(row) }, {
            trigger: () => h(NButton, { size: 'tiny', secondary: true, type: 'error' },
              { default: () => '删除' }),
            default: () => '确定删除该远程评测账号吗？',
          }),
        ],
      });
    },
  },
];
</script>

<style scoped lang="less">
.system-config-page {
  margin: 0 auto;
}

.tab-content {
  padding: 20px 0;
}

.tip-text {
  font-size: 12px;
  color: #999;
}

.ml-2 {
  margin-left: 8px;
}

.account-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.empty-tip {
  text-align: center;
  padding: 16px 0 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-3 {
  margin-bottom: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
