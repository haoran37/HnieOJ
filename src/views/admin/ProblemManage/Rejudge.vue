<template>
  <div class="rejudge-container">
    <div class="header">
      <h2 class="title">重判题目</h2>
      <n-button type="primary" @click="showAddModal = true">
        添加重判
      </n-button>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="rejudgeList"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row) => row.id"
      class="rejudge-table"
      :scroll-x="1200"
    />

    <n-modal v-model:show="showAddModal" preset="dialog" title="添加重判任务">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="题目ID">
          <n-input v-model:value="addForm.problemId" placeholder="请输入题目ID" />
        </n-form-item>
        <n-form-item label="时间范围">
          <n-radio-group v-model:value="addForm.rangeType">
            <n-space>
              <n-radio value="all">全部时间</n-radio>
              <n-radio value="custom">自定义</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="addForm.rangeType === 'custom'" label="选择时间">
          <n-date-picker
            v-model:value="dateRange"
            type="datetimerange"
            clearable
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddRejudge">确认</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="重判变化详情"
      style="width: 900px"
    >
      <n-data-table
        :columns="detailColumns"
        :data="currentDetailList"
        :loading="detailLoading"
        :max-height="500"
        :scroll-x="800"
      />
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, h, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  NButton, NDataTable, NModal, NForm, NFormItem, NInput, 
  NRadioGroup, NRadio, NSpace, NDatePicker, NProgress, NTag 
} from 'naive-ui';
import { useRejudge, type RejudgeTask, type RejudgeDetail } from '@/composables/admin/useRejudge';
import { statusConfig } from '@/utils/statusColumns';

const router = useRouter();
const {
  loading,
  rejudgeList,
  pagination,
  showAddModal,
  addForm,
  showDetailModal,
  detailLoading,
  currentDetailList,
  fetchRejudgeList,
  handleAddRejudge,
  handleShowDetails
} = useRejudge();

// 日期范围处理
const dateRange = ref<[number, number] | null>(null);

watch(dateRange, (val) => {
  if (val) {
    addForm.startTime = val[0];
    addForm.endTime = val[1];
  } else {
    addForm.startTime = null;
    addForm.endTime = null;
  }
});

// 主列表列定义
const columns = [
  { title: 'PID', key: 'problemId', width: 100, fixed: 'left' as const },
  { 
    title: '标题', 
    key: 'problemTitle', 
    minWidth: 150,
    render(row: RejudgeTask) {
      return h(
        'a',
        {
          style: { color: '#2080f0', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            router.push(`/problem/${row.problemId}`);
          }
        },
        row.problemTitle
      );
    }
  },
  { title: '提交者', key: 'submitter', width: 120 },
  { title: '提交时间', key: 'submitTime', width: 180 },
  { title: '重判量', key: 'totalCount', width: 100, align: 'center' as const },
  { title: '范围', key: 'range', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 200,
    render(row: RejudgeTask) {
      const percentage = row.totalCount > 0 
        ? Math.floor((row.processedCount / row.totalCount) * 100) 
        : 0;
      
      const status = row.status === 'finished' ? 'success' : (row.status === 'error' ? 'error' : 'warning');
      
      return h(NProgress, {
        type: 'line',
        percentage: percentage,
        status: status,
        indicatorPlacement: 'inside',
        processing: row.status === 'processing'
      });
    }
  },
  {
    title: '结果',
    key: 'result',
    width: 150,
    render(row: RejudgeTask) {
      if (row.status !== 'finished') return row.result;
      
      if (row.changeCount === 0) {
        return h('span', { style: { color: '#18a058' } }, '未变化');
      }
      
      return h(
        NButton,
        {
          text: true,
          type: 'error',
          style: { textDecoration: 'underline' },
          onClick: () => handleShowDetails(row)
        },
        { default: () => row.result }
      );
    }
  }
];

// 详情列表列定义
const detailColumns = [
  {
    title: 'Run ID',
    key: 'runId',
    width: 100,
    render(row: RejudgeDetail) {
      return h(
        'a',
        {
          style: { color: '#007BFF', cursor: 'pointer', fontWeight: 'bold' },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            router.push(`/status/${row.runId}`);
          }
        },
        row.runId
      );
    }
  },
  {
    title: 'UID',
    key: 'uid',
    width: 120,
    render(row: RejudgeDetail) {
      return h(
        'a',
        {
          style: { color: '#007BFF', cursor: 'pointer' },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            router.push(`/user/${row.uid}`);
          }
        },
        row.uid
      );
    }
  },
  { title: 'Name', key: 'username', width: 120 },
  { 
    title: 'Original Status', 
    key: 'originalStatus', 
    width: 180,
    render(row: RejudgeDetail) {
      const config = statusConfig[row.originalStatus] || { color: '#999', label: row.originalStatus };
      return h(
        'span',
        { 
          style: { 
            color: config.color, 
            fontWeight: 'bold'
          }
        },
        config.label
      );
    }
  },
  { 
    title: 'Current Status', 
    key: 'currentStatus', 
    width: 180,
    render(row: RejudgeDetail) {
      const config = statusConfig[row.currentStatus] || { color: '#999', label: row.currentStatus };
      return h(
        'span',
        { 
          style: { 
            color: config.color, 
            fontWeight: 'bold'
          }
        },
        config.label
      );
    }
  },
  { title: 'Lang', key: 'language', width: 100 }
];

onMounted(() => {
  fetchRejudgeList();
});
</script>

<style scoped lang="less">
.rejudge-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  
  .header {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
  }
  
  .rejudge-table {
    :deep(.n-data-table-th) {
      font-weight: bold;
    }
  }
}
</style>
