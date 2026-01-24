<template>
  <div class="discuss-add-container">
    <div class="page-header-card">
      <div class="header-left">
        <h1 class="page-title">新建讨论</h1>
        <span class="subtitle">分享观点，交流思路</span>
      </div>
    </div>

    <n-card :bordered="false" class="main-form-card">
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        label-placement="left"
        label-width="80"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="标题" path="title">
          <n-input v-model:value="formValue.title" placeholder="请输入标题" />
        </n-form-item>

        <n-form-item label="板块" path="category">
          <n-select v-model:value="formValue.category" :options="categoryOptions" placeholder="请选择板块" style="width: 200px" />
        </n-form-item>

        <n-form-item 
          v-if="showProblemIdInput" 
          label="题目ID" 
          path="problemId"
        >
          <n-input v-model:value="formValue.problemId" placeholder="例如: P1001" :loading="validatingProblem" style="width: 200px" />
        </n-form-item>

        <n-form-item 
          v-if="showTopSwitch"
          label="置顶"
          path="isTop"
        >
          <n-switch v-model:value="formValue.isTop" />
        </n-form-item>

        <n-form-item label="内容" path="content">
          <div style="width: 100%;">
            <v-md-editor 
              v-model="formValue.content" 
              height="500px"
              placeholder="请输入内容，支持 Markdown"
            ></v-md-editor>
          </div>
        </n-form-item>

        <n-form-item label="标签" path="tags">
          <n-dynamic-tags v-model:value="formValue.tags" />
        </n-form-item>

        <div class="action-bar">
          <n-space justify="end">
            <n-button @click="handleCancel" :disabled="publishing">取消</n-button>
            <n-button type="primary" @click="handlePublish" :loading="publishing">发布</n-button>
          </n-space>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useDiscussAdd } from '@/composables/admin/useDiscussAdd';

const {
  formRef,
  formValue,
  rules,
  categoryOptions,
  showProblemIdInput,
  showTopSwitch,
  validatingProblem,
  publishing,
  handlePublish,
  handleCancel
} = useDiscussAdd();
</script>

<style scoped lang="less">
.discuss-add-container {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: 768px) {
    padding: 0 24px 60px;
  }
}

.page-header-card {
  background: #fff;
  padding: 24px 32px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #2080f0;
  
  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin: 0;
      display: inline-block;
      margin-right: 12px;
    }
    .subtitle { color: #999; font-size: 14px; }
  }
}

.main-form-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.action-bar {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
