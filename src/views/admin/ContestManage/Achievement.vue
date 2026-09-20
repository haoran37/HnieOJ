<template>
  <div class="contest-achievement-page">
    <n-card :bordered="false" title="比赛成就管理">
      <template #header-extra>
        <n-button type="primary" secondary @click="goUserAchievement">
          前往成就申请审核
        </n-button>
      </template>

      <!-- 用户查询：复用 /api/user/users，需显式选择用户 -->
      <n-space vertical :size="12">
        <n-space :size="12" align="center" wrap>
          <n-input
            v-model:value="searchKeyword"
            placeholder="输入 UID 或姓名"
            clearable
            style="width: 240px"
            @keyup.enter="handleUserSearch"
          />
          <n-button type="primary" :loading="searching" @click="handleUserSearch">
            查询用户
          </n-button>
        </n-space>

        <n-alert v-if="searchError" type="error" closable @close="searchError = ''">
          {{ searchError }}
        </n-alert>

        <template v-if="searched && !searchError">
          <n-empty v-if="userResults.length === 0" description="未找到匹配用户" />
          <template v-else>
            <n-data-table
              :columns="userColumns"
              :data="userResults"
              :row-key="(row: UserListVo) => row.uid"
              :bordered="false"
              size="small"
            />
            <n-pagination
              v-if="userTotal > userPageSize"
              :page="userPage"
              :page-size="userPageSize"
              :item-count="userTotal"
              size="small"
              style="justify-content: center; margin-top: 8px"
              @update:page="handleUserPageChange"
            />
          </template>
        </template>

        <n-alert v-if="selectedUser" type="info" :show-icon="false">
          当前用户：{{ selectedUser.realname || selectedUser.username || '-' }}（UID：{{
            selectedUser.uid
          }}）
        </n-alert>
        <n-text v-else depth="3">尚未选择用户，请先查询并选择。</n-text>
      </n-space>

      <n-divider />

      <!-- 添加成就：未选择用户时整体禁用，避免误写 -->
      <h4 class="section-title">添加成就</h4>
      <n-text depth="3">为选中的用户添加比赛成就记录。</n-text>
      <n-form
        :disabled="!selectedUser || submitting"
        label-placement="left"
        label-width="90"
        style="margin-top: 12px"
      >
        <n-form-item label="标题">
          <n-input v-model:value="form.title" placeholder="选填" clearable />
        </n-form-item>
        <n-form-item label="内容" required>
          <n-input
            v-model:value="form.content"
            type="textarea"
            :rows="3"
            placeholder="必填，描述该成就"
          />
        </n-form-item>
        <n-form-item label="证明链接">
          <n-input v-model:value="form.proofUrl" placeholder="选填，仅支持 http/https" clearable />
        </n-form-item>
        <n-form-item label="获得时间">
          <n-date-picker
            v-model:value="form.achieveTime"
            type="date"
            clearable
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item :show-label="false">
          <n-button
            type="primary"
            :loading="submitting"
            :disabled="!selectedUser"
            @click="handleAddAchievement"
          >
            添加成就
          </n-button>
        </n-form-item>
      </n-form>

      <n-divider />

      <!-- 成就记录：真实分页 -->
      <h4 class="section-title">成就记录</h4>
      <n-empty v-if="!selectedUser" description="请先查询并选择用户" />
      <template v-else>
        <n-alert v-if="achieveError" type="error" closable @close="achieveError = ''">
          {{ achieveError }}
        </n-alert>
        <n-spin :show="achieveLoading">
          <n-empty
            v-if="achieveLoaded && !achieveError && achievements.length === 0"
            description="该用户暂无成就记录"
          />
          <template v-else>
            <n-data-table
              :columns="achievementColumns"
              :data="achievements"
              :row-key="(row: UserAchievementVo) => String(row.id)"
              :bordered="false"
              size="small"
            />
            <n-pagination
              v-if="achieveTotal > achievePageSize"
              :page="achievePage"
              :page-size="achievePageSize"
              :item-count="achieveTotal"
              size="small"
              style="justify-content: center; margin-top: 8px"
              @update:page="handleAchievePageChange"
            />
          </template>
        </n-spin>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { h, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog, NButton, NText, type DataTableColumns } from 'naive-ui';
import {
  addUserAchievement,
  deleteUserAchievement,
  getUserAchievements,
  searchUsers,
  type UserAchievementVo,
  type UserListVo,
} from '@/utils/api';
import { formatFullTime } from '@/composables/useTime';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const userPageSize = 5;
const achievePageSize = 10;

// ---- 用户查询 / 选择 ----
const searchKeyword = ref('');
const searching = ref(false);
const searchError = ref('');
const searched = ref(false);
const userResults = ref<UserListVo[]>([]);
const userTotal = ref(0);
const userPage = ref(1);
const selectedUser = ref<UserListVo | null>(null);

// ---- 成就记录 ----
const achievements = ref<UserAchievementVo[]>([]);
const achieveLoading = ref(false);
const achieveError = ref('');
const achieveLoaded = ref(false);
const achieveTotal = ref(0);
const achievePage = ref(1);

// ---- 表单 ----
const form = reactive({
  title: '',
  content: '',
  proofUrl: '',
  achieveTime: null as number | null,
});
const submitting = ref(false);
const deleting = ref(false);

// 竞态保护：仅最新一次请求的响应可写入
let searchSeq = 0;
let achieveSeq = 0;

// 关键词一旦变化，旧结果与在途查询立即作废（同步刷新，先于后续查询/翻页生效），
// 避免旧响应回填到新搜索词下；已选用户保持不重置。
watch(
  searchKeyword,
  () => {
    searchSeq += 1;
    searching.value = false;
    searchError.value = '';
    searched.value = false;
    userResults.value = [];
    userTotal.value = 0;
    userPage.value = 1;
  },
  { flush: 'sync' },
);

/** 证明链接只接受 http(s)，其余 scheme 不呈现为可点击链接 */
const isHttpUrl = (url: string | null | undefined): boolean =>
  /^https?:\/\//i.test((url ?? '').trim());

const resetForm = () => {
  form.title = '';
  form.content = '';
  form.proofUrl = '';
  form.achieveTime = null;
};

const resetAchievementState = () => {
  achievements.value = [];
  achieveTotal.value = 0;
  achievePage.value = 1;
  achieveError.value = '';
  achieveLoaded.value = false;
};

// ---- 用户查询 ----
const loadUsers = async (targetPage: number) => {
  const seq = ++searchSeq;
  searching.value = true;
  searchError.value = '';
  try {
    const data = await searchUsers(searchKeyword.value.trim(), targetPage, userPageSize);
    if (seq !== searchSeq) return;
    userResults.value = data?.list ?? [];
    userTotal.value = data?.total ?? 0;
    userPage.value = targetPage;
    searched.value = true;
  } catch (err) {
    if (seq !== searchSeq) return;
    searchError.value = err instanceof Error ? err.message : '用户查询失败';
    userResults.value = [];
    userTotal.value = 0;
    searched.value = false;
  } finally {
    if (seq === searchSeq) searching.value = false;
  }
};

const handleUserSearch = async () => {
  if (!searchKeyword.value.trim()) {
    message.warning('请输入 UID 或姓名');
    return;
  }
  await loadUsers(1);
};

const handleUserPageChange = async (page: number) => {
  if (!searchKeyword.value.trim()) return;
  await loadUsers(page);
};

// ---- 成就记录 ----
const loadAchievements = async (uid: string, targetPage: number) => {
  if (!uid) return;
  const seq = ++achieveSeq;
  achieveLoading.value = true;
  achieveError.value = '';
  try {
    const data = await getUserAchievements(uid, targetPage, achievePageSize);
    // 迟到响应或已切换用户时丢弃，绝不写入当前用户
    if (seq !== achieveSeq || selectedUser.value?.uid !== uid) return;
    achievements.value = data?.list ?? [];
    achieveTotal.value = data?.total ?? 0;
    achievePage.value = targetPage;
    achieveLoaded.value = true;
  } catch (err) {
    if (seq !== achieveSeq || selectedUser.value?.uid !== uid) return;
    achieveError.value = err instanceof Error ? err.message : '成就记录加载失败';
  } finally {
    if (seq === achieveSeq) achieveLoading.value = false;
  }
};

const selectUser = async (user: UserListVo) => {
  if (!user?.uid || selectedUser.value?.uid === user.uid) return;
  selectedUser.value = user;
  resetForm();
  resetAchievementState();
  await loadAchievements(user.uid, 1);
};

const handleAchievePageChange = async (page: number) => {
  const uid = selectedUser.value?.uid;
  if (!uid) return;
  await loadAchievements(uid, page);
};

// ---- 添加成就 ----
const handleAddAchievement = async () => {
  const user = selectedUser.value;
  if (!user) {
    message.warning('请先选择用户');
    return;
  }
  if (submitting.value) return;
  const content = form.content.trim();
  if (!content) {
    message.warning('请填写成就内容');
    return;
  }
  const proofUrl = form.proofUrl.trim();
  if (proofUrl && !isHttpUrl(proofUrl)) {
    message.warning('证明链接仅支持 http/https');
    return;
  }
  const targetUid = user.uid;
  submitting.value = true;
  try {
    await addUserAchievement(targetUid, {
      title: form.title.trim() || undefined,
      content,
      proofUrl: proofUrl || undefined,
      achieveTime: form.achieveTime ?? undefined,
    });
    message.success('成就添加成功');
    // 请求期间若已切换用户，不把刷新写到新用户
    if (selectedUser.value?.uid === targetUid) {
      resetForm();
      resetAchievementState();
      await loadAchievements(targetUid, 1);
    }
  } catch (err) {
    // 失败保留表单内容，便于重试
    message.error(err instanceof Error ? err.message : '添加成就失败');
  } finally {
    submitting.value = false;
  }
};

// ---- 删除成就 ----
const removeAchievement = async (uid: string, achievementId: number) => {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await deleteUserAchievement(uid, achievementId);
    message.success('成就删除成功');
    if (selectedUser.value?.uid !== uid) return;
    // 删除当前页最后一条时回退到上一页，否则重载当前页
    const targetPage =
      achievements.value.length === 1 && achievePage.value > 1
        ? achievePage.value - 1
        : achievePage.value;
    await loadAchievements(uid, targetPage);
  } catch (err) {
    // 失败保留现有记录
    message.error(err instanceof Error ? err.message : '删除成就失败');
  } finally {
    deleting.value = false;
  }
};

const handleDeleteAchievement = (achievement: UserAchievementVo) => {
  const user = selectedUser.value;
  if (!user) {
    message.warning('请先选择用户');
    return;
  }
  // 点击时即绑定 UID 与 achievementId，弹窗期间切换用户也不会误删他人记录
  const targetUid = user.uid;
  const targetId = achievement.id;
  dialog.warning({
    title: '删除成就',
    content: `确定删除成就「${achievement.title || '未命名'}」吗？`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await removeAchievement(targetUid, targetId);
    },
  });
};

// ---- 渲染 ----
const renderProofLink = (proofUrl: string | null) => {
  const url = (proofUrl ?? '').trim();
  if (!url) return h(NText, { depth: 3 }, () => '无');
  if (!isHttpUrl(url)) return h(NText, { depth: 3 }, () => '链接无效');
  return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, '查看证明');
};

const userColumns: DataTableColumns<UserListVo> = [
  { title: 'UID', key: 'uid', width: 160, ellipsis: { tooltip: true } },
  {
    title: '姓名',
    key: 'username',
    width: 140,
    render: (row) => row.realname || row.username || '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) => {
      const active = selectedUser.value?.uid === row.uid;
      return h(
        NButton,
        {
          size: 'tiny',
          secondary: true,
          type: active ? 'primary' : 'default',
          onClick: () => {
            void selectUser(row);
          },
        },
        { default: () => (active ? '已选' : '选择') },
      );
    },
  },
];

const achievementColumns: DataTableColumns<UserAchievementVo> = [
  {
    title: '标题',
    key: 'title',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.title || '-',
  },
  {
    title: '内容',
    key: 'content',
    ellipsis: { tooltip: true },
    render: (row) => row.content || '-',
  },
  {
    title: '证明链接',
    key: 'proofUrl',
    width: 120,
    render: (row) => renderProofLink(row.proofUrl),
  },
  {
    title: '获得时间',
    key: 'achieveTime',
    width: 180,
    render: (row) => formatFullTime(row.achieveTime),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) =>
      h(
        NButton,
        {
          size: 'tiny',
          type: 'error',
          secondary: true,
          loading: deleting.value,
          onClick: () => handleDeleteAchievement(row),
        },
        { default: () => '删除' },
      ),
  },
];

const goUserAchievement = () => {
  void router.push({ name: 'AdminUserAchievement' });
};
</script>

<style scoped lang="less">
.contest-achievement-page {
  :deep(.n-data-table) {
    font-size: 13px;
  }

  .section-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
  }
}
</style>
