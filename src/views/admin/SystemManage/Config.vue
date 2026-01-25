<template>
  <div class="system-config-page">
    <n-card :bordered="false" title="系统全局配置">
      <template #header-extra>
        <n-button type="primary" :loading="loading" @click="saveConfig">
          <template #icon>
            <n-icon>
              <SaveOutline />
            </n-icon>
          </template>
          保存配置
        </n-button>
      </template>

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

              <n-divider title-placement="left">状态控制</n-divider>
              <n-form-item label="允许注册" path="allowRegister">
                <n-space vertical align="start">
                  <n-space align="center">
                    <n-switch v-model:value="config.allowRegister" />
                    <n-select v-if="config.allowRegister" v-model:value="config.registerMode"
                      :options="registerModeOptions" style="width: 160px" size="small" />
                  </n-space>
                  <n-dynamic-tags v-if="config.allowRegister && config.registerMode === 'EMAIL_SUFFIX'"
                    v-model:value="config.allowedEmailSuffixes" />
                  <div v-if="config.allowRegister && config.registerMode === 'EMAIL_SUFFIX'" class="tip-text">
                    请输入允许注册的邮箱后缀（如 @hnie.edu.cn），按回车添加
                  </div>
                </n-space>
              </n-form-item>
              <n-form-item label="仅内网访问" path="intranetAccessOnly">
                <n-switch v-model:value="config.intranetAccessOnly">
                  <template #checked>开启</template>
                  <template #unchecked>关闭</template>
                </n-switch>
              </n-form-item>
              <n-form-item label="维护模式" path="maintenanceMode">
                <n-switch v-model:value="config.maintenanceMode">
                  <template #checked>维护中</template>
                  <template #unchecked>正常运行</template>
                </n-switch>
                <div class="tip-text ml-2">开启后，用户访问将看到统一维护页面</div>
              </n-form-item>

              <n-divider title-placement="left">比赛模式</n-divider>
              <n-form-item label="开启比赛模式" path="contestMode">
                <n-switch v-model:value="config.contestMode"
                  @update:value="(val: boolean) => !val && (config.contestId = '')" />
              </n-form-item>
              <n-collapse-transition :show="config.contestMode">
                <n-form-item label="关联比赛 ID" path="contestId" required
                  :validation-status="contestIdValidation.status" :feedback="contestIdValidation.message">
                  <n-input v-model:value="config.contestId" placeholder="请输入比赛 ID" style="width: 200px"
                    @blur="checkContestId" @input="() => { contestIdValidation.status = undefined; contestIdValidation.message = '' }" :loading="contestIdValidation.loading" />
                  <div class="tip-text ml-2">开启后仅该比赛及相关功能可用</div>
                </n-form-item>
              </n-collapse-transition>
            </n-form>
          </div>
        </n-tab-pane>

        <!-- 邮件服务配置 -->
        <n-tab-pane name="smtp" tab="SMTP设置">
          <div class="tab-content">
            <n-alert type="info" show-icon class="mb-4">
              配置邮件服务用于发送注册验证码、密码重置邮件及系统通知。
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
                    placeholder="密码或授权码" />
                </n-form-item-gi>
                <n-form-item-gi label="安全协议" path="smtpSecurity">
                  <n-radio-group v-model:value="config.smtpSecurity">
                    <n-space>
                      <n-radio v-for="opt in smtpSecurityOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item-gi>
              </n-grid>

              <n-divider />
              <n-form-item label="测试邮件">
                <n-input-group>
                  <n-input v-model:value="testEmailRecipient" placeholder="请输入接收测试邮件的邮箱" style="width: 300px" />
                  <n-button type="primary" :loading="sendingEmail" @click="sendTestEmail">
                    <template #icon>
                      <n-icon>
                        <MailOutline />
                      </n-icon>
                    </template>
                    发送测试
                  </n-button>
                </n-input-group>
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>

        <!-- 评测资源管理 -->
        <n-tab-pane name="judge" tab="评测配置">
          <div class="tab-content">
            <n-form label-placement="left" label-width="120" :model="config">
              <n-divider title-placement="left">判题机 (Judger) 全局配置</n-divider>
              <n-form-item label="Judge Token">
                <n-input-group>
                  <n-input v-model:value="config.judgeToken" readonly placeholder="用于判题机连接的 Token" />
                  <n-button @click="copyToken">
                    <template #icon>
                      <n-icon>
                        <CopyOutline />
                      </n-icon>
                    </template>
                    复制
                  </n-button>
                  <n-button type="warning" ghost @click="regenerateToken">
                    <template #icon>
                      <n-icon>
                        <RefreshOutline />
                      </n-icon>
                    </template>
                    重新生成
                  </n-button>
                </n-input-group>
              </n-form-item>
              <n-grid :cols="2" :x-gap="24">
                <n-form-item-gi label="默认时间限制">
                  <n-input-number v-model:value="config.defaultTimeLimit" :min="100" :step="100">
                    <template #suffix>ms</template>
                  </n-input-number>
                </n-form-item-gi>
                <n-form-item-gi label="默认空间限制">
                  <n-input-number v-model:value="config.defaultMemoryLimit" :min="16" :step="16">
                    <template #suffix>MB</template>
                  </n-input-number>
                </n-form-item-gi>
              </n-grid>

              <n-divider title-placement="left">远程评测账号 (Remote Judge)</n-divider>
              <n-grid :cols="2" :x-gap="16" :y-gap="16">
                <n-grid-item v-for="platform in platformOptions" :key="platform.value">
                  <n-card size="small" :title="platform.label">
                    <template #header-extra>
                      <n-button size="tiny" secondary type="primary" @click="openAccountModal('add', platform.value)">
                        <template #icon>
                          <n-icon>
                            <AddOutline />
                          </n-icon>
                        </template>
                        添加
                      </n-button>
                    </template>
                    <n-data-table :columns="columns"
                      :data="config.remoteJudgeAccounts.filter(acc => acc.platform === platform.value)"
                      :row-key="(row: RemoteJudgeAccount) => row.id" size="small" :bordered="false" />
                  </n-card>
                </n-grid-item>
              </n-grid>
            </n-form>
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

              <n-divider title-placement="left">存储配置</n-divider>
              <n-form-item label="上传文件大小限制" path="maxUploadSize">
                <n-input-number v-model:value="config.maxUploadSize" :min="1">
                  <template #suffix>MB</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="存储驱动" path="storageDriver">
                <n-radio-group v-model:value="config.storageDriver">
                  <n-space>
                    <n-radio v-for="opt in storageDriverOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </n-radio>
                  </n-space>
                </n-radio-group>
              </n-form-item>
              <n-alert v-if="config.storageDriver !== 'LOCAL'" type="warning" class="mt-2">
                选择 OSS/OBS 后，请确保已在服务端正确配置相应的 AccessKey 和 SecretKey。
              </n-alert>
            </n-form>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 远程评测账号弹窗 -->
    <n-modal v-model:show="showAccountModal" preset="card" :title="accountFormType === 'add' ? '添加远程账号' : '编辑远程账号'"
      style="width: 500px">
      <n-form label-placement="left" label-width="80" :model="accountFormModel">
        <n-form-item label="OJ 平台" required>
          <n-input :value="accountFormModel.platform" readonly disabled />
        </n-form-item>
        <n-form-item label="用户名" required>
          <n-input v-model:value="accountFormModel.username" />
        </n-form-item>
        <n-form-item label="密码" :required="accountFormType === 'add'">
          <n-input type="password" show-password-on="click" v-model:value="accountFormModel.password"
            :placeholder="accountFormType === 'add' ? '请输入密码' : '如不修改请留空'" />
        </n-form-item>
        <n-form-item label="并发限制">
          <n-input-number v-model:value="accountFormModel.maxConcurrency" :min="1" />
        </n-form-item>
        <n-form-item label="启用状态">
          <n-switch v-model:value="accountFormModel.status" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAccountModal = false">取消</n-button>
          <n-button type="primary" :loading="loading" @click="handleAccountSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import {
  NButton, NIcon, NTag, NSpace, type DataTableColumns
} from 'naive-ui';
import {
  SaveOutline, MailOutline, CopyOutline, RefreshOutline,
  AddOutline, CreateOutline, TrashOutline
} from '@vicons/ionicons5';
import { useSystemConfig, type RemoteJudgeAccount } from '@/composables/admin/useSystemConfig';

const {
  config, loading, sendingEmail, testEmailRecipient,
  showAccountModal, accountFormType, accountFormModel,
  contestIdValidation,
  registerModeOptions, smtpSecurityOptions, storageDriverOptions, platformOptions,
  saveConfig, checkContestId, sendTestEmail,
  openAccountModal, handleAccountSubmit, deleteAccount,
  regenerateToken, copyToken
} = useSystemConfig();

const columns: DataTableColumns<RemoteJudgeAccount> = [
  { title: '用户名', key: 'username' },
  { title: '并发', key: 'maxConcurrency', width: 70 },
  {
    title: '状态',
    key: 'status',
    width: 70,
    render(row: RemoteJudgeAccount) {
      return h(NTag, { type: row.status ? 'success' : 'error', bordered: false, size: 'small' },
        { default: () => row.status ? '启用' : '禁用' }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row: RemoteJudgeAccount) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'tiny',
            type: 'primary',
            secondary: true,
            onClick: () => openAccountModal('edit', row.platform, row)
          }, { icon: () => h(CreateOutline) }),
          h(NButton, {
            size: 'tiny',
            type: 'error',
            secondary: true,
            onClick: () => deleteAccount(row)
          }, { icon: () => h(TrashOutline) })
        ]
      });
    }
  }
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

.mb-2 {
  margin-bottom: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-2 {
  margin-top: 8px;
}
</style>
