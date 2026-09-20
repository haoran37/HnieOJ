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
          :placeholder="placeholder ?? '请输入题目内部数字ID'"
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
        <div class="col display">展示编号</div>
        <div class="col pid">内部ID</div>
        <div class="col title">题目名称</div>
        <div class="col actions">操作</div>
      </div>
      <transition-group name="list" tag="div" class="custom-table-body">
        <div v-for="(problem, index) in problems" :key="problem.problemId" class="custom-table-row">
          <div class="col display">
            <n-input-number
              v-if="displayIdMode === 'number'"
              size="small"
              :min="1"
              :value="toNumber(problem.displayId)"
              :show-button="false"
              style="width: 90px"
              @update:value="(value) => $emit('updateDisplayId', index, value)"
            />
            <n-input
              v-else
              size="small"
              :value="String(problem.displayId ?? '')"
              placeholder="A"
              style="width: 90px"
              @update:value="(value: string) => $emit('updateDisplayId', index, value)"
            />
          </div>
          <div class="col pid">{{ problem.problemId }}</div>
          <div class="col title">
            <a
              v-if="problem.problemCode"
              :href="`/problem/${problem.problemCode}`"
              target="_blank"
              class="problem-link"
            >{{ problem.displayTitle || problem.problemCode }}</a>
            <span v-else>{{ problem.displayTitle || `题目 ${problem.problemId}` }}</span>
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
import { NButton, NSpace, NIcon, NInput, NInputNumber, NInputGroup, NFormItem } from 'naive-ui';

/** 编排行：problemId 始终为内部数字 ID；displayId 视场景为 A/B 字符串或 Integer */
export interface ConfigProblemRow {
  problemId: number;
  problemCode?: string;
  displayId: string | number | null;
  displayTitle?: string;
}

withDefaults(
  defineProps<{
    problems: ConfigProblemRow[];
    loading: boolean;
    modelValue: string;
    showLabel?: boolean;
    /** letter: 比赛/作业 A/B；number: 题单 Integer>=1 */
    displayIdMode?: 'letter' | 'number';
    placeholder?: string;
  }>(),
  {
    displayIdMode: 'letter',
    placeholder: '请输入题目内部数字ID',
  },
);

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'add'): void;
  (e: 'remove', index: number): void;
  (e: 'moveUp', index: number): void;
  (e: 'moveDown', index: number): void;
  (e: 'updateDisplayId', index: number, value: string | number | null): void;
}>();

const toNumber = (value: string | number | null): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
    
    &.display { width: 110px; }
    &.pid { width: 100px; color: #000; }
    &.title { flex: 1; min-width: 200px; }
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
