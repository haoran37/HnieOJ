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

        <n-form-item label="添加题目">
          <n-input-group>
            <n-input v-model:value="problemInput" placeholder="请输入题目PID" @keyup.enter="handleAddProblem" />
            <n-button type="primary" @click="handleAddProblem" :loading="loading">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加
            </n-button>
          </n-input-group>
        </n-form-item>

        <div class="problem-list-wrapper">
          <div class="custom-table-header">
            <div class="col pid">PID</div>
            <div class="col title">题目名称</div>
            <div class="col difficulty">难度</div>
            <div class="col actions">操作</div>
          </div>
          <transition-group name="list" tag="div" class="custom-table-body">
            <div v-for="(problem, index) in formValue.problems" :key="problem.problemId" class="custom-table-row">
              <div class="col pid">{{ problem.problemId }}</div>
              <div class="col title">
                <a :href="`/problem/${problem.problemId}`" target="_blank" class="problem-link">{{ problem.title }}</a>
              </div>
              <div class="col difficulty">
                <n-tag :type="getDifficultyType(problem.difficulty)" size="small">
                  {{ getDifficultyLabel(problem.difficulty) }}
                </n-tag>
              </div>
              <div class="col actions">
                <n-space>
                  <n-button size="tiny" secondary circle :disabled="index === 0" @click="handleMoveUp(index)">
                    <template #icon><n-icon><ArrowUpOutline /></n-icon></template>
                  </n-button>
                  <n-button size="tiny" secondary circle :disabled="index === formValue.problems.length - 1" @click="handleMoveDown(index)">
                    <template #icon><n-icon><ArrowDownOutline /></n-icon></template>
                  </n-button>
                  <n-button size="tiny" type="error" secondary circle @click="handleRemoveProblem(index)">
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                  </n-button>
                </n-space>
              </div>
            </div>
          </transition-group>
          <div v-if="formValue.problems.length === 0" class="empty-text">暂无题目</div>
        </div>

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
import { AddOutline, ArrowUpOutline, ArrowDownOutline, TrashOutline } from '@vicons/ionicons5';
import { NButton, NSpace, NTag, NIcon } from 'naive-ui';
import { useTrainingForm } from '@/composables/admin/useTrainingManage';

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

const getDifficultyType = (diff: string) => {
  const map: Record<string, string> = { Low: 'success', Mid: 'warning', High: 'error' };
  return (map[diff] || 'default') as any;
};

const getDifficultyLabel = (diff: string) => {
  const map: Record<string, string> = { Low: '简单', Mid: '中等', High: '困难' };
  return map[diff] || '未知';
};
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

.problem-list-wrapper {
  margin-bottom: 24px;
  padding-left: 100px; /* Align with input start */
}

.custom-table-header {
  display: flex;
  padding: 8px 16px;
  background-color: #fafafc;
  border-bottom: 1px solid #efeff5;
  font-weight: 500;
  color: #333639;
}

.custom-table-row {
  display: flex;
  padding: 8px 16px;
  border-bottom: 1px solid #efeff5;
  align-items: center;
  background-color: #fff;
}

.col {
  padding: 0 8px;
  
  &.pid { width: 100px; color: #000; }
  &.title { flex: 1; min-width: 200px; }
  &.difficulty { width: 100px; }
  &.actions { width: 150px; }
}

.problem-link {
  color: #007BFF;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.empty-text {
  padding: 20px;
  text-align: center;
  color: #999;
  border-bottom: 1px solid #efeff5;
}

.form-actions {
  display: flex;
  justify-content: flex-end; /* Right align */
  margin-top: 24px;
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
  width: 100%; /* Ensure removed item doesn't collapse width during animation */
  max-width: 800px; /* Match wrapper max-width */
  box-sizing: border-box; /* Include padding in width */
}
</style>
