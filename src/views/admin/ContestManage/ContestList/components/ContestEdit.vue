<template>
  <div class="contest-edit-container">
    <n-card :bordered="false" title="编辑比赛">
      <n-alert v-if="detailError" type="error" class="detail-error" closable>
        {{ detailError }}
      </n-alert>
      <div v-if="!loadedDetailId && !detailError" class="detail-loading">正在加载…</div>
      <n-form
        v-if="loadedDetailId"
        ref="formRef"
        :model="formValue"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-grid :cols="24" :x-gap="24">
          <n-form-item-gi :span="12" label="比赛名称" path="title">
            <n-input v-model:value="formValue.title" placeholder="请输入比赛名称" />
          </n-form-item-gi>

          <n-form-item-gi :span="12" label="来源" path="source">
            <n-input v-model:value="formValue.source" placeholder="请输入来源" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="比赛类型" path="type">
            <n-select v-model:value="formValue.type" :options="typeOptions" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="可见范围" path="auth">
            <n-select v-model:value="formValue.auth" :options="authOptions" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="比赛状态" path="status">
            <n-switch v-model:value="formValue.status">
              <template #checked>启用</template>
              <template #unchecked>禁用</template>
            </n-switch>
          </n-form-item-gi>

          <n-form-item-gi :span="12" label="比赛时间" path="timeRange">
            <n-date-picker
              v-model:value="formValue.timeRange"
              type="datetimerange"
              clearable
              style="width: 100%"
            />
          </n-form-item-gi>

          <n-form-item-gi :span="12" label="排名显示" path="rankShowName">
            <n-input v-model:value="formValue.rankShowName" placeholder="如 username" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="公开榜单" path="openRank">
            <n-switch v-model:value="formValue.openRank" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="封榜" path="sealRank">
            <n-switch v-model:value="formValue.sealRank" />
          </n-form-item-gi>

          <n-form-item-gi :span="24" label="标签" path="customTags">
            <n-dynamic-tags v-model:value="formValue.customTags" />
          </n-form-item-gi>

          <n-form-item-gi :span="24" label="比赛描述" path="description">
            <v-md-editor v-model="formValue.description" height="400px"></v-md-editor>
          </n-form-item-gi>
        </n-grid>

        <template v-if="formValue.auth === 'Private'">
          <n-divider title-placement="left">限定账号</n-divider>
          <AccountLimit
            v-model:inputValue="accountInput"
            :account-list="formValue.accountList"
            :loading="loading"
            @add="handleAddAccount"
            @remove="handleRemoveAccount"
          />
        </template>

        <n-divider title-placement="left">题目编排</n-divider>
        <ProblemConfig
          v-model:modelValue="problemInput"
          :problems="formValue.problems"
          :loading="loading"
          @add="handleAddProblem"
          @remove="handleRemoveProblem"
          @moveUp="handleMoveUp"
          @moveDown="handleMoveDown"
          @updateDisplayId="handleUpdateDisplayId"
        />

        <div class="form-actions">
          <n-button
            type="primary"
            :loading="saving || detailLoading"
            :disabled="!loadedDetailId"
            @click="handleSubmit(true, route.params.id as string)"
          >
            保存
          </n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NForm, NInput, NSelect, NSwitch, NDatePicker, NDivider, NButton, NGrid, NFormItemGi, NDynamicTags, NAlert } from 'naive-ui';
import { useContestForm } from '@/composables/admin/useContestManage';
import ProblemConfig from '@/components/ProblemConfig.vue';
import AccountLimit from '@/components/AccountLimit.vue';

const route = useRoute();
const {
  formValue,
  typeOptions,
  authOptions,
  problemInput,
  accountInput,
  loading,
  saving,
  loadedDetailId,
  detailLoading,
  detailError,
  handleAddProblem,
  handleRemoveProblem,
  handleUpdateDisplayId,
  handleMoveUp,
  handleMoveDown,
  handleAddAccount,
  handleRemoveAccount,
  handleSubmit,
  loadData,
  reset
} = useContestForm();

// 路由 id 变化时立即作废旧记录身份并按新 id 加载；无 id 时必须作废，避免退化成新增
watch(
  () => route.params.id,
  (id) => {
    if (id) {
      void loadData(id as string);
    } else {
      reset();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  reset();
});
</script>

<style scoped lang="less">
.contest-edit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.detail-error {
  margin-bottom: 16px;
}

.detail-loading {
  padding: 48px 0;
  text-align: center;
  color: #999;
}
</style>
