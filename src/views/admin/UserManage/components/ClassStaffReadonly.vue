<template>
  <n-form-item label="班级师资">
    <n-spin :show="loading">
      <n-space vertical :size="6">
        <div>
          <n-text depth="3">教师：</n-text>
          <template v-if="teachers.length">
            <n-tag
              v-for="teacher in teachers"
              :key="`t-${teacher.uid}`"
              size="small"
              style="margin-right: 4px"
            >
              {{ teacher.name }}（{{ teacher.uid }}）
            </n-tag>
          </template>
          <n-text v-else depth="3">暂无教师</n-text>
        </div>
        <div>
          <n-text depth="3">助教：</n-text>
          <template v-if="tas.length">
            <n-tag
              v-for="ta in tas"
              :key="`ta-${ta.uid}`"
              size="small"
              type="info"
              style="margin-right: 4px"
            >
              {{ ta.name }}（{{ ta.uid }}）
            </n-tag>
          </template>
          <n-text v-else depth="3">暂无助教</n-text>
        </div>
      </n-space>
    </n-spin>
    <n-text v-if="error" type="error" depth="3" style="font-size: 12px">{{ error }}</n-text>
    <n-text v-else depth="3" style="font-size: 12px">
      教师与助教名单来自班级基础数据，仅作只读展示
    </n-text>
  </n-form-item>
</template>

<script setup lang="ts">
import type { ClassStaffVo } from '@/utils/api';

defineProps<{
  loading: boolean;
  error: string | null;
  teachers: ClassStaffVo[];
  tas: ClassStaffVo[];
}>();
</script>
