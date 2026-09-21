<template>
  <div class="training-edit-container">
    <n-card :bordered="false" title="编辑题单">
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
        <n-form-item label="题单名称" path="title">
          <n-input v-model:value="formValue.title" placeholder="请输入题单名称" />
        </n-form-item>
        <n-form-item label="题单类型" path="type">
          <n-select v-model:value="formValue.type" :options="typeOptions" class="type-select" />
        </n-form-item>
        <n-form-item label="访问权限" path="auth">
          <n-select v-model:value="formValue.auth" :options="authOptions" class="type-select" />
        </n-form-item>
        <n-form-item v-if="formValue.auth === 'Private'" label="访问密码" path="privatePwd">
          <n-input
            v-model:value="formValue.privatePwd"
            type="password"
            show-password-on="click"
            placeholder="留空表示保留原密码"
          />
        </n-form-item>
        <n-form-item v-if="formValue.auth === 'Private'" label=" " :show-feedback="true">
          <span class="pwd-hint">当前访问密码已从管理端详情带入（掩码显示）；留空提交即保留原密码。</span>
        </n-form-item>
        <n-form-item label="排序" path="rank">
          <n-input-number v-model:value="formValue.rank" :min="0" style="width: 200px" />
        </n-form-item>
        <n-form-item label="题单状态" path="status">
          <n-switch v-model:value="formValue.status">
            <template #checked>启用</template>
            <template #unchecked>关闭</template>
          </n-switch>
        </n-form-item>
        <n-form-item label="题单描述" path="description">
          <v-md-editor v-model="formValue.description" height="400px"></v-md-editor>
        </n-form-item>

        <n-divider title-placement="left">题目编排</n-divider>

        <ProblemConfig
          v-model:modelValue="problemInput"
          :problems="formValue.problems"
          :loading="loading"
          display-id-mode="number"
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
import { NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NDivider, NAlert } from 'naive-ui';
import { useTrainingForm } from '@/composables/admin/useTrainingManage';
import ProblemConfig from '@/components/ProblemConfig.vue';

const route = useRoute();
const {
  formValue,
  typeOptions,
  authOptions,
  problemInput,
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
  handleSubmit,
  loadData,
  reset
} = useTrainingForm();

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
.training-edit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-select {
  width: 200px;
}

.form-actions {
  display: flex;
  justify-content: flex-end; /* Right align */
  margin-top: 24px;
}

.detail-error {
  margin-bottom: 16px;
}

.pwd-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.detail-loading {
  padding: 48px 0;
  text-align: center;
  color: #999;
}
</style>
