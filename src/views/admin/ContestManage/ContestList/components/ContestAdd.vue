<template>
  <div class="contest-add-container">
    <n-card :bordered="false" title="添加比赛">
      <n-form
        ref="formRef"
        :model="formValue"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-grid :cols="24" :x-gap="24">
          <n-form-item-gi :span="24" label="比赛归属" path="auth">
            <n-select v-model:value="formValue.auth" :options="authOptions" class="auth-select" />
          </n-form-item-gi>

          <n-form-item-gi :span="12" label="比赛名称" path="title">
            <n-input v-model:value="formValue.title" placeholder="请输入比赛名称" />
          </n-form-item-gi>

          <n-form-item-gi :span="12" label="来源" path="source">
            <n-input v-model:value="formValue.source" placeholder="请输入来源" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="比赛类型" path="type">
            <n-select v-model:value="formValue.type" :options="typeOptions" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="权限类型" path="permission">
            <n-select v-model:value="formValue.permission" :options="permissionOptions" />
          </n-form-item-gi>

          <n-form-item-gi :span="8" label="比赛状态" path="status">
            <n-switch v-model:value="formValue.status">
              <template #checked>有效</template>
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

          <n-form-item-gi :span="24" label="标签" path="customTags">
            <n-dynamic-tags v-model:value="formValue.customTags" />
          </n-form-item-gi>

          <n-form-item-gi :span="24" label="比赛描述" path="description">
            <v-md-editor v-model="formValue.description" height="400px"></v-md-editor>
          </n-form-item-gi>
        </n-grid>

        <template v-if="formValue.auth === 'Internal'">
          <template v-if="formValue.permission === 'Private'">
            <n-divider title-placement="left">限定账号</n-divider>
            <AccountLimit
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
          />
        </template>

        <template v-else>
          <n-divider title-placement="left">比赛链接</n-divider>
          <n-form-item label="链接地址" path="link">
            <n-input v-model:value="formValue.link" placeholder="请输入校外比赛链接" />
          </n-form-item>
        </template>

        <div class="form-actions">
          <n-button type="primary" @click="handleSubmit(false)" :loading="loading">保存</n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NForm, NFormItem, NInput, NSelect, NSwitch, NDatePicker, NDivider, NButton, NGrid, NFormItemGi, NDynamicTags } from 'naive-ui';
import { useContestForm } from '@/composables/admin/useContestManage';
import ProblemConfig from '@/components/ProblemConfig.vue';
import AccountLimit from '@/components/AccountLimit.vue';

const {
  formValue,
  typeOptions,
  authOptions,
  permissionOptions,
  problemInput,
  loading,
  handleAddProblem,
  handleRemoveProblem,
  handleMoveUp,
  handleMoveDown,
  handleAddAccount,
  handleRemoveAccount,
  handleSubmit
} = useContestForm();
</script>

<style scoped lang="less">
.contest-add-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-select {
  width: 200px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
