<template>
  <div class="homework-rankings">
    <div class="toolbar">
      <div class="left">
        <n-radio-group v-model:value="rankingMode" size="small">
          <n-radio-button value="IOI">IOI (分数视图)</n-radio-button>
          <n-radio-button value="ACM">ACM (状态视图)</n-radio-button>
        </n-radio-group>
        <span class="tip-text" v-if="rankingMode === 'IOI'">
          * 显示最高得分
        </span>
        <span class="tip-text" v-else>
          * 括号内为错误次数
        </span>
      </div>
      
      <div class="right">
        <n-button size="small" secondary type="primary">
          <template #icon><n-icon><DownloadIcon /></n-icon></template>
          导出成绩单 (Excel)
        </n-button>
      </div>
    </div>

    <n-data-table
      :columns="columns"
      :data="rawRankData"
      :loading="loading"
      :single-line="false"
      size="small"
      class="gradebook-table"
      :row-key="(row: any) => row.id"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute } from 'vue-router';
import { CloudDownloadOutline as DownloadIcon } from '@vicons/ionicons5';
import { useHomeworkRankings } from '@/composables/useHomeworkRankings';
import { formatDuration } from '@/composables/useTime';

const { loading, rawRankData, fetchRankings } = useHomeworkRankings();
const route = useRoute();

const rankingMode = ref<'IOI' | 'ACM'>('IOI');

const getCellClass = (p: any, mode: 'IOI' | 'ACM') => {
  if (!p || p.status === 'NONE') return '';
  
  if (mode === 'ACM') {
    // ACM 模式颜色规范
    if (p.status === 'AC') {
      //TODO: 在 useHomeworkRankings 中设置 isFirstAc
      return p.score === 100 && p.penalty < 60 ? 'bg-first-ac' : 'bg-ac'; 
    }
    if (p.status === 'WA') return 'bg-wa';
  } else {
    // IOI 模式颜色规范
    if (p.score === 100) return 'bg-ac';
    if (p.score >= 60) return 'bg-pending'; // 复用Pending的黄色
    return 'bg-wa';
  }
  return '';
};

const columns = computed(() => {
  // 基础列
  const baseCols = [
    { 
      title: '排名', 
      key: 'rank', 
      width: 60, 
      align: 'center' as const, 
      render: (_:any, index:number) => index + 1 
    },
    { 
      title: '姓名', 
      key: 'name', 
      width: 120,
      render: (row: any) => h('div', { style: 'font-weight: 500; color: #333;' }, row.name)
    },
    { 
      title: '学号', 
      key: 'studentId', 
      width: 120,
      render: (row: any) => h('span', { style: 'font-family: monospace; color: #666;' }, row.studentId)
    }
  ];

  // 汇总列
  const summaryCol = rankingMode.value === 'IOI' 
    ? { 
        title: '总分', 
        key: 'totalScore', 
        width: 80, 
        align: 'center' as const,
        render: (row: any) => h('span', { style: 'font-weight: bold; color: #18a058; font-size: 16px;' }, row.totalScore)
      }
    : {
        title: 'AC / 罚时',
        key: 'solved',
        width: 120,
        align: 'center' as const,
        render: (row: any) => {
          const h = Math.floor(row.penalty / 60);
          const m = row.penalty % 60;
          return `${row.solved} / ${h}h:${String(m).padStart(2, '0')}m`;
        }
      };

  // 题目列
  const problemCols = Array.from({ length: 5 }).map((_, idx) => ({
    title: String.fromCharCode(65 + idx),
    key: `p${idx}`,
    align: 'center' as const,
    className: 'problem-cell',
    render: (row: any) => {
      const p = row.problems[idx];
      const cellClass = getCellClass(p, rankingMode.value);
      
      // 空容器，用于应用背景色
      // 注意：Naive UI data table 的 render 返回的是单元格内容
      // 要改变整个单元格背景，需要在外层样式控制，或者让内容撑满
      // 简单的做法是渲染一个 div 撑满
      
      if (!p || p.status === 'NONE') return '';

      const content = [];
      
      if (rankingMode.value === 'IOI') {
        // IOI 内容
        content.push(h('span', { class: 'cell-text-white' }, p.score));
      } else {
        // ACM 内容
        if (p.status === 'AC') {
          content.push(h('div', { class: 'cell-text-white time' }, formatDuration(Math.floor(Math.random()*20000000))));
          if (p.tryCount > 0) {
             content.push(h('div', { class: 'cell-text-white tries' }, `(-${p.tryCount})`));
          }
        } else {
           content.push(h('div', { class: 'cell-text-white tries' }, `(-${p.tryCount})`));
        }
      }

      return h('div', { class: `cell-wrapper ${cellClass}` }, content);
    }
  }));

  return [...baseCols, summaryCol, ...problemCols];
});

onMounted(() => {
  const hid = route.params.homeworkId as string;
  fetchRankings(hid);
});
</script>

<style scoped lang="less">
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  .left { display: flex; align-items: center; gap: 12px; }
  .tip-text { font-size: 12px; color: #999; }
}

:deep(.gradebook-table) {
  .n-data-table-th {
    background-color: #f2f3f5; 
    font-weight: 700;
    color: #444;
    border-bottom: 1px solid #dcdfe6;
    text-align: center;
  }
  
  .n-data-table-td {
    padding: 0 !important; 
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #f0f0f0;
    vertical-align: middle;
    height: 50px;
  }

  .n-data-table-td:not(.problem-cell) {
    padding: 8px !important;
  }
}

:deep(.cell-wrapper) {
  width: 100%;
  height: 100%;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  line-height: 1.2;
  
  .cell-text-white { color: #fff; font-weight: bold; }
  .time { font-size: 13px; }
  .tries { font-size: 12px; }

  &.bg-first-ac { background-color: #008000; }
  &.bg-ac { background-color: #43CD80; }
  &.bg-wa { background-color: #FF0000; }
  &.bg-pending { background-color: #f0a020; }
}
</style>