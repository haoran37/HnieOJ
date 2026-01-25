<template>
  <div class="homework-edit-container">
    <n-card :bordered="false" title="编辑作业">
      <n-form
        ref="formRef"
        :model="formValue"
        label-placement="left"
        label-width="100px"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="作业名称" path="title" required>
          <n-input v-model:value="formValue.title" placeholder="请输入作业名称" />
        </n-form-item>

        <n-form-item label="来源" path="source">
          <n-input v-model:value="formValue.source" placeholder="请输入来源" />
        </n-form-item>

        <n-form-item label="状态" path="status">
          <n-switch v-model:value="formValue.status">
            <template #checked>有效</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>

        <n-form-item label="起止时间" path="timeRange" required>
          <n-date-picker
            v-model:value="formValue.timeRange"
            type="datetimerange"
            clearable
            style="width: 400px"
          />
        </n-form-item>

        <n-form-item label="标签" path="tags">
          <n-dynamic-tags v-model:value="formValue.tags" />
        </n-form-item>

        <n-form-item label="作业描述" path="description">
          <div style="width: 100%; height: 400px;">
            <v-md-editor v-model="formValue.description" height="100%" placeholder="请输入作业描述..." />
          </div>
        </n-form-item>

        <n-divider title-placement="left">学生范围</n-divider>

        <div class="student-scope-section">
          <n-space vertical :size="12">
            <n-space>
              <n-select
                v-model:value="studentSelectState.filterCollegeId"
                :options="studentSelectState.colleges"
                placeholder="请选择学院"
                style="width: 200px"
                @update:value="fetchMajors"
              />
              <n-select
                v-model:value="studentSelectState.filterMajorId"
                :options="studentSelectState.majors"
                placeholder="请选择专业"
                :disabled="!studentSelectState.filterCollegeId"
                style="width: 200px"
                @update:value="fetchClasses"
              />
            </n-space>
            
            <n-card size="small" embedded v-if="studentSelectState.filterMajorId" class="class-select-card">
              <div class="scrollable-checkbox-group">
                <n-checkbox-group v-model:value="formValue.targetClassIds">
                  <n-space vertical>
                    <n-checkbox
                      v-for="c in studentSelectState.classes"
                      :key="c.value"
                      :value="c.value"
                      :label="c.label"
                    />
                  </n-space>
                </n-checkbox-group>
              </div>
            </n-card>
            <div v-else class="hint-text">请先选择学院和专业以加载班级列表</div>

            <div class="selected-classes-area" v-if="selectedClassList.length > 0">
              <div class="selected-label">已选班级：</div>
              <n-space :size="[8, 8]">
                <n-tag 
                  v-for="item in selectedClassList" 
                  :key="item.value" 
                  closable 
                  type="info"
                  @close="handleRemoveClass(item.value)"
                >
                  {{ item.label }}
                </n-tag>
              </n-space>
            </div>
          </n-space>
        </div>

        <n-divider title-placement="left">题目编排</n-divider>

        <ProblemConfig
          v-model="problemInput"
          :problems="formValue.problems"
          :loading="loading"
          @add="handleAddProblem"
          @remove="handleRemoveProblem"
          @moveUp="handleMoveUp"
          @moveDown="handleMoveDown"
        />

        <div class="actions">
          <n-button @click="router.back()" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" :loading="loading" @click="handleSubmit(true, route.params.id as string)">
            保存修改
          </n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  NCard, NForm, NFormItem, NInput, NSwitch, NDatePicker, 
  NDynamicTags, NDivider, NSpace, NSelect, NCheckboxGroup, 
  NCheckbox, NButton, NTag
} from 'naive-ui';
import ProblemConfig from '@/components/ProblemConfig.vue';
import { useHomeworkForm } from '@/composables/admin/useHomeworkManage';

const router = useRouter();
const route = useRoute();
const {
  formValue,
  studentSelectState,
  selectedClassList,
  problemInput,
  loading,
  fetchColleges,
  fetchMajors,
  fetchClasses,
  handleRemoveClass,
  handleAddProblem,
  handleRemoveProblem,
  handleMoveUp,
  handleMoveDown,
  handleSubmit,
  loadData
} = useHomeworkForm();

onMounted(() => {
  const id = route.params.id as string;
  if (id) {
    loadData(id);
  }
});
</script>

<style scoped lang="less">
.homework-edit-container {
  max-width: 1200px;
  margin: 0 auto;

  .student-scope-section {
    background-color: #fafafc;
    padding: 16px;
    border-radius: 4px;
    border: 1px solid #efeff5;
    margin-left: 100px;

    .class-select-card {
      max-height: 300px;
      overflow-y: auto;
    }

    .hint-text {
      color: #999;
      font-size: 14px;
      padding: 8px 0;
    }

    .selected-classes-area {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed #e0e0e6;
      
      .selected-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
  }
}
</style>
