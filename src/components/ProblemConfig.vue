<template>
  <div class="problem-config-container">
    <n-form-item 
      label="添加题目" 
      label-placement="left" 
      label-width="100px" 
      :show-label="true"
    >
      <n-input-group>
        <n-input 
          :value="modelValue" 
          @update:value="$emit('update:modelValue', $event)"
          placeholder="请输入题目PID" 
          @keyup.enter="$emit('add')" 
        />
        <n-button type="primary" @click="$emit('add')" :loading="loading">
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
        <div v-for="(problem, index) in problems" :key="problem.problemId" class="custom-table-row">
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
              <n-button size="tiny" secondary circle :disabled="index === 0" @click="$emit('moveUp', index)">
                <template #icon><n-icon><ArrowUpOutline /></n-icon></template>
              </n-button>
              <n-button size="tiny" secondary circle :disabled="index === problems.length - 1" @click="$emit('moveDown', index)">
                <template #icon><n-icon><ArrowDownOutline /></n-icon></template>
              </n-button>
              <n-button size="tiny" type="error" secondary circle @click="$emit('remove', index)">
                <template #icon><n-icon><TrashOutline /></n-icon></template>
              </n-button>
            </n-space>
          </div>
        </div>
      </transition-group>
      <div v-if="problems.length === 0" class="empty-text">暂无题目</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AddOutline, ArrowUpOutline, ArrowDownOutline, TrashOutline } from '@vicons/ionicons5';
import { NButton, NSpace, NTag, NIcon, NInput, NInputGroup, NFormItem } from 'naive-ui';

defineProps<{
  problems: any[];
  loading: boolean;
  modelValue: string;
  showLabel?: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'add'): void;
  (e: 'remove', index: number): void;
  (e: 'moveUp', index: number): void;
  (e: 'moveDown', index: number): void;
}>();

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
.problem-config-container {
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
    width: 100%;
    max-width: 800px;
    box-sizing: border-box;
  }
}
</style>
