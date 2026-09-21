<template>
  <div class="user-list-page setting-page">
    <template v-if="!isSelf">
      <n-result
        status="warning"
        title="无法编辑他人资料"
        description="资料设置与密码修改仅本人可操作；请前往本人的设置页。"
      >
        <template v-if="ownUid" #footer>
          <n-button type="primary" @click="goOwnSettings">前往我的设置</n-button>
        </template>
      </n-result>
    </template>

    <template v-else>
      <!-- 基本信息 -->
      <div class="setting-card">
        <div class="card-header">
          <div class="title">基本信息</div>
        </div>
        <n-alert v-if="profileError" type="error" :bordered="false" style="margin-bottom: 12px">
          {{ profileError }}
          <template #action>
            <n-button size="small" @click="loadProfile">重试</n-button>
          </template>
        </n-alert>
        <n-spin :show="profileLoading">
          <n-form label-placement="left" label-width="110" size="small">
            <n-grid :cols="2" :x-gap="24" responsive="screen" item-responsive>
              <n-form-item-gi span="2 m:1" label="学号（只读）">
                <n-input :value="profile.uid" disabled />
              </n-form-item-gi>
              <n-form-item-gi span="2 m:1" label="邮箱（只读）">
                <n-input :value="profile.email || '未绑定'" disabled />
              </n-form-item-gi>
              <n-form-item-gi span="2 m:1" label="用户名">
                <n-input
                  v-model:value="profile.username"
                  :maxlength="20"
                  show-count
                  placeholder="2-20 个字符"
                />
              </n-form-item-gi>
              <n-form-item-gi span="2 m:1" label="头像地址">
                <n-input
                  v-model:value="profile.avatar"
                  :maxlength="500"
                  placeholder="http(s) 链接或以 / 开头的站内路径"
                />
              </n-form-item-gi>
              <n-form-item-gi span="2 m:1" label="QQ">
                <n-input v-model:value="profile.qq" placeholder="5-11 位数字，可留空清除" />
              </n-form-item-gi>
              <n-form-item-gi span="2 m:1" label="GitHub">
                <n-input v-model:value="profile.github" placeholder="https://github.com/..." />
              </n-form-item-gi>
              <n-form-item-gi span="2" label="博客">
                <n-input v-model:value="profile.blog" placeholder="https://..." />
              </n-form-item-gi>
            </n-grid>
          </n-form>
        </n-spin>
        <div class="compact-grid">
          <div class="compact-item">
            <span class="label">实名</span>
            <span class="value">{{ profile.realname || '未填写' }}</span>
          </div>
          <div class="compact-item">
            <span class="label">学院</span>
            <span class="value">{{ profile.college || '未填写' }}</span>
          </div>
          <div class="compact-item">
            <span class="label">年级</span>
            <span class="value">{{ profile.grade || '未填写' }}</span>
          </div>
          <div class="compact-item">
            <span class="label">班级</span>
            <span class="value">{{ profile.class || '未填写' }}</span>
          </div>
        </div>
        <n-alert type="info" :bordered="false" style="margin: 12px 0">
          实名、学院、年级、班级不可直接编辑，需通过下方「资料变更申请」提交审核。
        </n-alert>
        <div class="form-actions">
          <n-button
            type="primary"
            :loading="savingProfile"
            :disabled="savingProfile || !profileLoaded"
            @click="handleSaveProfile"
          >
            保存资料
          </n-button>
        </div>
      </div>

      <!-- 资料变更申请（合并后的唯一资料变更流程：身份 + 联系/社交字段） -->
      <div class="setting-card">
        <div class="card-header">
          <div class="title">资料变更申请</div>
        </div>
        <n-alert v-if="hasPending" type="warning" :bordered="false" style="margin-bottom: 12px">
          已有待审核的变更申请，请等待管理员处理后再提交新的申请。
        </n-alert>
        <n-alert v-else type="info" :bordered="false" style="margin-bottom: 12px">
          可申请变更实名、学院、年级、班级与联系/社交信息；提交后需管理员审核，UID 不可变更。
        </n-alert>
        <n-form label-placement="left" label-width="90" size="small">
          <n-form-item label="实名" required>
            <n-input v-model:value="identity.realname" :maxlength="50" placeholder="请输入实名" />
          </n-form-item>
          <n-form-item label="学院" required>
            <n-select
              :value="identity.collegeId"
              :options="identityCollegeOptions"
              placeholder="选择学院"
              clearable
              @update:value="handleIdentityCollegeChange"
            />
          </n-form-item>
          <n-form-item label="年级" required>
            <n-select
              :value="identity.grade"
              :options="identityGradeOptions"
              :disabled="!identity.collegeId"
              placeholder="选择年级"
              clearable
              @update:value="handleIdentityGradeChange"
            />
          </n-form-item>
          <n-form-item label="班级" required>
            <n-select
              :value="identity.classId"
              :options="identityClassOptions"
              :disabled="!identity.grade"
              placeholder="选择班级"
              clearable
              @update:value="(value: number | null) => (identity.classId = value)"
            />
          </n-form-item>

          <n-divider style="margin: 4px 0 12px">
            <span style="font-size: 12px; color: #888">以下选填，留空表示不修改</span>
          </n-divider>

          <n-form-item label="邮箱">
            <n-input v-model:value="identity.email" :maxlength="255" placeholder="留空表示不修改邮箱" />
          </n-form-item>
          <n-form-item label="手机号">
            <n-input v-model:value="identity.phone" :maxlength="20" placeholder="留空表示不修改手机号" />
          </n-form-item>
          <n-form-item label="QQ">
            <n-input v-model:value="identity.qq" :maxlength="20" placeholder="留空表示不修改 QQ" />
          </n-form-item>
          <n-form-item label="Codeforces">
            <n-input v-model:value="identity.cfUsername" :maxlength="100" placeholder="留空表示不修改" />
          </n-form-item>
          <n-form-item label="GitHub">
            <n-input v-model:value="identity.github" :maxlength="255" placeholder="留空表示不修改" />
          </n-form-item>
          <n-form-item label="博客">
            <n-input v-model:value="identity.blog" :maxlength="255" placeholder="留空表示不修改" />
          </n-form-item>

          <n-form-item label="变更原因" required>
            <n-input
              v-model:value="identity.reason"
              type="textarea"
              :maxlength="1000"
              show-count
              :autosize="{ minRows: 2, maxRows: 6 }"
              placeholder="请说明变更原因"
            />
          </n-form-item>
        </n-form>
        <div class="form-actions">
          <n-button
            type="primary"
            :loading="submittingIdentity"
            :disabled="submittingIdentity || hasPending"
            @click="handleSubmitIdentity"
          >
            提交申请
          </n-button>
        </div>

        <n-divider />

        <n-alert v-if="requestsError" type="error" :bordered="false" style="margin-bottom: 12px">
          {{ requestsError }}
          <template #action>
            <n-button size="small" @click="fetchMyRequests">重试</n-button>
          </template>
        </n-alert>

        <n-data-table
          remote
          size="small"
          :columns="requestColumns"
          :data="myRequests"
          :loading="requestsLoading"
          :row-key="(row: ProfileChangeVo) => row.id"
          :pagination="false"
          :scroll-x="760"
        />
        <div class="pagination-wrapper">
          <n-pagination
            :page="requestsPage"
            :page-size="requestsPageSize"
            :item-count="requestsTotal"
            @update:page="handleRequestsPageChange"
            @update:page-size="handleRequestsPageSizeChange"
          />
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="setting-card">
        <div class="card-header">
          <div class="title">修改密码</div>
        </div>
        <n-alert type="warning" :bordered="false" style="margin-bottom: 12px">
          修改成功后服务端会失效全部旧会话，需要重新登录。
        </n-alert>
        <n-form label-placement="left" label-width="110" size="small">
          <n-form-item label="当前密码" required>
            <n-input
              v-model:value="passwordForm.oldPassword"
              type="password"
              show-password-on="click"
              placeholder="请输入当前密码"
            />
          </n-form-item>
          <n-form-item label="新密码" required>
            <n-input
              v-model:value="passwordForm.newPassword"
              type="password"
              show-password-on="click"
              placeholder="至少 6 位"
            />
          </n-form-item>
          <n-form-item label="确认新密码" required>
            <n-input
              v-model:value="passwordForm.confirmPassword"
              type="password"
              show-password-on="click"
              placeholder="再次输入新密码"
            />
          </n-form-item>
        </n-form>
        <div class="form-actions">
          <n-button
            type="primary"
            :loading="changingPassword"
            :disabled="changingPassword"
            @click="handleChangePassword"
          >
            修改密码
          </n-button>
        </div>
      </div>

      <!-- 成就认证申请（真实 multipart 上传，保留原行为） -->
      <div class="setting-card">
        <div class="card-header">
          <div class="title">成就认证申请</div>
        </div>
        <n-form label-placement="left" label-width="100" size="small">
          <n-form-item label="比赛名称" required>
            <n-input v-model:value="form.title" placeholder="请输入比赛名称" />
          </n-form-item>
          <n-form-item label="说明">
            <n-input
              v-model:value="form.description"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="可补充成绩、链接等说明"
            />
          </n-form-item>
          <n-form-item label="证明文件" required>
            <n-upload
              v-model:file-list="fileList"
              :default-upload="false"
              :max="1"
              @change="handleFileChange"
            >
              <n-button secondary>选择文件</n-button>
            </n-upload>
          </n-form-item>
          <div class="form-actions">
            <n-button type="primary" :loading="submitting" @click="handleSubmit">提交申请</n-button>
          </div>
        </n-form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, type DataTableColumns, type UploadFileInfo } from 'naive-ui';
import { submitAchievementApply, PROFILE_CHANGE_FIELDS } from '@/utils/api';
import type { ProfileChangeVo } from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';
import { useUserSettings } from '@/composables/oj/useUserSettings';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const ownUid = computed(() => userStore.userInfo?.id || '');
const isSelf = computed(
  () => !!ownUid.value && String(route.params.uid) === String(ownUid.value),
);

const {
  profile,
  profileLoading,
  profileError,
  profileLoaded,
  savingProfile,
  loadProfile,
  saveProfile,
  passwordForm,
  changingPassword,
  submitPassword,
  identity,
  identityCollegeOptions,
  identityGradeOptions,
  identityClassOptions,
  submittingIdentity,
  handleIdentityCollegeChange,
  handleIdentityGradeChange,
  myRequests,
  requestsLoading,
  requestsError,
  requestsTotal,
  requestsPage,
  requestsPageSize,
  hasPending,
  fetchMyRequests,
  handleRequestsPageChange,
  handleRequestsPageSizeChange,
  submitIdentity,
  loadAll,
  reset,
} = useUserSettings({ isActive: () => isSelf.value });

const goOwnSettings = () => {
  if (!ownUid.value) return;
  void router.push({ name: 'UserSetting', params: { uid: ownUid.value } });
};

const handleSaveProfile = async () => {
  const ok = await saveProfile();
  if (ok) {
    // 同步 Pinia：顶部用户名等依赖 userStore 展示
    try {
      await userStore.loadProfile();
    } catch {
      // 资料保存已成功；顶部同步失败不改变保存结果
    }
  }
};

const handleChangePassword = async () => {
  const ok = await submitPassword();
  if (!ok) return;
  // 仅成功后清理本地会话并跳转登录；旧密码错误时不清会话
  userStore.logout();
  void router.replace('/login');
};

const handleSubmitIdentity = async () => {
  await submitIdentity();
};

// ---------------- 成就认证上传（保留原 multipart 行为） ----------------
const form = reactive({ title: '', description: '' });
const file = ref<File | null>(null);
// 受控文件列表：提交成功后必须清空，否则 n-upload 仍显示上一次的文件而 max=1 会阻止重选
const fileList = ref<UploadFileInfo[]>([]);
const submitting = ref(false);

const handleFileChange = (data: { fileList: UploadFileInfo[] }) => {
  const list = data.fileList;
  const info = list && list.length > 0 ? list[list.length - 1] : null;
  file.value = info?.file ?? null;
};

const handleSubmit = async () => {
  if (!form.title.trim()) {
    message.warning('请输入比赛名称');
    return;
  }
  if (!file.value) {
    message.warning('请上传证明文件');
    return;
  }
  const fd = new FormData();
  fd.append('title', form.title.trim());
  if (form.description.trim()) fd.append('description', form.description.trim());
  fd.append('file', file.value);

  submitting.value = true;
  try {
    await submitAchievementApply(fd);
    message.success('申请提交成功');
    form.title = '';
    form.description = '';
    // 成功后才清空受控列表与已选文件；失败时两者都保留，用户可重试
    file.value = null;
    fileList.value = [];
  } catch (err) {
    message.error(err instanceof Error ? err.message : '申请提交失败');
  } finally {
    submitting.value = false;
  }
};

// ---------------- 本人申请列表展示 ----------------
const requestStatusText = (status: string | null) => {
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已驳回';
  return '待处理';
};

/**
 * 只展示本次申请真正发生变化的字段（口径与后端 changedFields 一致）。
 * 历史申请（合并前只含 4 个身份字段）的其余字段两侧同为 null，不会被列出来。
 */
const identityText = (row: ProfileChangeVo) => {
  const original = row.original;
  const proposed = row.proposed;
  const lines: string[] = [];
  for (const field of PROFILE_CHANGE_FIELDS) {
    const before = original ? original[field.key] : null;
    const after = proposed ? proposed[field.key] : null;
    if (before === after) continue;
    lines.push(`${field.label}：${displaySnapshotValue(before)} → ${displaySnapshotValue(after)}`);
  }
  return lines.length > 0 ? lines : ['无字段变更'];
};

const displaySnapshotValue = (value: string | number | null) => {
  if (value === null || value === undefined || value === '') return '未填写';
  return String(value);
};

const requestColumns: DataTableColumns<ProfileChangeVo> = [
  { title: '申请ID', key: 'id', width: 80 },
  {
    title: '变更内容（原值 → 目标值）',
    key: 'diff',
    minWidth: 260,
    render: (row) =>
      h(
        'div',
        { class: 'diff-cell' },
        identityText(row).map((line) => h('div', line)),
      ),
  },
  { title: '原因', key: 'reason', width: 140, className: 'cell-wrap' },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => requestStatusText(row.status),
  },
  {
    title: '审核意见',
    key: 'reviewReason',
    minWidth: 120,
    className: 'cell-wrap',
    render: (row) => row.reviewReason || '-',
  },
  {
    title: '提交时间',
    key: 'gmtCreate',
    width: 160,
    render: (row) => formatFullTime(row.gmtCreate),
  },
];

const reload = () => {
  if (!isSelf.value) return;
  void loadAll();
};

watch(
  () => [route.params.uid, ownUid.value] as const,
  () => {
    // 切换他人 route / 账号：先清空并作废在途读取与 mutation，绝不用他人资料填本人表单
    reset();
    if (isSelf.value) {
      void loadAll();
    }
  },
  { flush: 'sync' },
);

onMounted(reload);
onBeforeUnmount(() => reset());
</script>

<style scoped lang="less">
.setting-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.setting-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.card-header {
  margin-bottom: 16px;
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}
.compact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.compact-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  .label {
    color: #888;
  }
  .value {
    color: #333;
    font-weight: 500;
  }
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
:deep(.cell-wrap) {
  white-space: normal;
  word-break: break-word;
}
:deep(.diff-cell div) {
  line-height: 1.6;
  word-break: break-word;
}
</style>
