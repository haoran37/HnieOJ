<template>
  <div class="training-add-container">
    <n-card :bordered="false" title="添加题单">
      <n-form
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
            placeholder="私有题单必须设置访问密码"
          />
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
          <n-button type="primary" @click="handleSubmit(false)" :loading="saving">保存</n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NDivider } from 'naive-ui';
import { useTrainingForm } from '@/composables/admin/useTrainingManage';
import ProblemConfig from '@/components/ProblemConfig.vue';

const {
  formValue,
  typeOptions,
  authOptions,
  problemInput,
  loading,
  saving,
  handleAddProblem,
  handleRemoveProblem,
  handleUpdateDisplayId,
  handleMoveUp,
  handleMoveDown,
  handleSubmit
} = useTrainingForm();
</script>

<style scoped lang="less">
.training-add-container {
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
</style>
