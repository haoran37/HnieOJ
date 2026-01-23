<template>
  <div class="training-edit-container">
    <n-card :bordered="false" title="编辑题单">
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
        <n-form-item label="题单状态" path="status">
          <n-switch v-model:value="formValue.status">
            <template #checked>激活</template>
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
          @add="handleAddProblem"
          @remove="handleRemoveProblem"
          @moveUp="handleMoveUp"
          @moveDown="handleMoveDown"
        />

        <div class="form-actions">
          <n-button type="primary" @click="handleSubmit(true, route.params.id as string)" :loading="loading">保存</n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NCard, NForm, NFormItem, NInput, NSelect, NSwitch, NDivider } from 'naive-ui';
import { useTrainingForm } from '@/composables/admin/useTrainingManage';
import ProblemConfig from '@/components/ProblemConfig.vue';

const route = useRoute();
const {
  formValue,
  typeOptions,
  problemInput,
  loading,
  handleAddProblem,
  handleRemoveProblem,
  handleMoveUp,
  handleMoveDown,
  handleSubmit,
  loadData
} = useTrainingForm();

onMounted(() => {
  if (route.params.id) {
    loadData(route.params.id as string);
  }
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
</style>
