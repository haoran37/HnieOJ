<template>
  <div class="contest-scoreboard">
    <div class="toolbar">
      <div class="left">
        <n-input 
          v-model:value="searchKeyword" 
          placeholder="搜索用户..." 
          @keydown.enter="handleSearch"
          size="small"
          style="width: 240px"
        >
          <template #prefix><n-icon><SearchIcon /></n-icon></template>
        </n-input>
      </div>
      <div class="right download-group">
        <n-button size="small" secondary type="primary">
          <template #icon><n-icon><DownloadIcon /></n-icon></template>
          Excel
        </n-button>
        <n-button size="small" secondary type="primary">
          <template #icon><n-icon><DownloadIcon /></n-icon></template>
          CSV
        </n-button>
      </div>
    </div>

    <div class="scoreboard-wrapper">
      <n-spin :show="loading">
        <table class="scoreboard-table main-table">
          <thead>
            <tr>
              <th class="col-rank">Rank</th>
              <th class="col-user">Author</th>
              <th class="col-solved">Solved</th>
              <th class="col-penalty">Penalty</th>
              <th 
                v-for="(pid, idx) in problemIds" 
                :key="idx"
                class="col-header-problem"
              >
                <a @click.prevent="$router.push(`/problem/${pid}`)">{{ getProblemIndex(idx) }}</a>
                <div class="ratio-sub">
                   {{ Math.floor(Math.random() * 50) }}/{{ Math.floor(Math.random() * 100 + 50) }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="user in displayList" 
              :key="user.userId"
              :class="{ 'row-me': isMe(user.userId) }"
            >
              <td class="col-rank">{{ user.rank }}</td>
              <td class="col-user">
                <div class="user-cell">
                  <span class="name">{{ user.name }}</span>
                  <span class="sub">{{ user.username }}</span>
                </div>
              </td>
              <td class="col-solved">{{ user.solved }}</td>
              <td class="col-penalty">{{ formatPenalty(user.penalty) }}</td>
              
              <td 
                v-for="(pid, idx) in problemIds" 
                :key="idx"
                class="col-problem"
                :class="getCellClass(user.problems[idx])"
              >
                <div class="cell-content" v-if="user.problems[idx]">
                  <span class="time" v-if="user.problems[idx].status === 'AC'">
                    {{ formatTime(user.problems[idx].time) }}
                  </span>
                  <span class="tries" v-if="user.problems[idx].tryCount > 0">
                    (-{{ user.problems[idx].tryCount }})
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </n-spin>
    </div>

    <div class="pagination-bar">
      <n-pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :item-count="total"
        :page-sizes="[20, 50, 100, 150, 200]"
        show-size-picker
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { SearchOutline as SearchIcon, CloudDownloadOutline as DownloadIcon } from '@vicons/ionicons5';
import { useContestScoreboard, type ScoreboardProblem } from '@/composables/oj/useContestScoreboard';
import { useContestProblems } from '@/composables/oj/useContestProblems';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const userStore = useUserStore();
const searchKeyword = ref('');
const page = ref(1);
const pageSize = ref(50);

const { loading, rankData, fetchScoreboard } = useContestScoreboard();
const { getProblemIndex } = useContestProblems();

// TODO: 替换真实PID
// Mock PID
const problemIds = ['1001', '1002', '1005', '1008', '1012'];

// 判断是不是自己
const isMe = (userId: string) => {
  return userStore.userInfo?.id === userId;
};

// 分页列表
const displayList = computed(() => {
  let list = rankData.value;
  if (searchKeyword.value) {
    const k = searchKeyword.value.toLowerCase();
    list = list.filter(u => u.username.toLowerCase().includes(k) || u.name.includes(k));
  }
  const start = (page.value - 1) * pageSize.value;
  return list.slice(start, start + pageSize.value);
});

const total = computed(() => rankData.value.length);
const handleSearch = () => { page.value = 1; };
const handlePageChange = () => { document.querySelector('.scoreboard-wrapper')?.scrollTo(0, 0); };

// 格式化函数
const formatPenalty = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
};
const formatTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`;
};

// 样式类逻辑
const getCellClass = (p?: ScoreboardProblem) => {
  if (!p) return ''; 
  if (p.status === 'AC') return p.isFirstAc ? 'bg-first-ac' : 'bg-ac';
  if (p.status === 'WA') return 'bg-wa';
  if (p.status === 'PENDING') return 'bg-pending';
  return '';
};

onMounted(() => {
  fetchScoreboard(route.params.contestId as string);
});
</script>

<style scoped lang="less">
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  .download-group {
    display: flex;
    gap: 12px;
  }
}

.scoreboard-wrapper {
  overflow-x: auto;
  border-radius: 4px;
}

.scoreboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;
  min-width: 900px; 

  th, td {
    border: 1px solid #dcdfe6; 
    padding: 8px 4px;
    text-align: center;
    vertical-align: middle;
  }

  th {
    background: #f5f7fa; 
    color: #333;
    font-weight: bold;
    height: 50px;
    .ratio-sub { font-size: 12px; font-weight: normal; color: #909399; margin-top: 4px; }
  }

  tbody tr:nth-child(even) {
    background-color: #fafafa;
  }
  tbody tr:nth-child(odd) {
    background-color: #ffffff;
  }

  // 具体用户的高亮样式
  .row-me {
    background-color: #e6f7ff !important;
    
    td {
      border-top: 2px solid #1890ff; 
      border-bottom: 2px solid #1890ff;
    }
    
    .col-rank, .name {
      color: #1890ff;
      font-weight: bold;
    }
  }

  // 列宽
  .col-rank { width: 60px; }
  .col-user { width: 200px; text-align: left; padding-left: 12px;}
  .col-solved { width: 70px; font-weight: bold;}
  .col-penalty { width: 90px; }
  .col-problem { width: 80px; }

  // 链接
  .col-header-problem a {
    color: #333;
    text-decoration: none;
    cursor: pointer;
    &:hover { color: #2080f0; text-decoration: underline; }
  }

  // 用户信息
  .user-cell {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    .name { font-weight: 500; color: #333; }
    .sub { font-size: 12px; color: #999; }
  }

  // 状态颜色
  .bg-first-ac { background-color: #008000 !important; color: #fff; .time { color: #fff; } }
  .bg-ac { background-color: #43CD80 !important; color: #fff; .time { color: #fff; } }
  .bg-wa { background-color: #FF0000 !important; color: #fff; .tries { color: #fff; } }
  .bg-pending { background-color: #FFCC00 !important; color: #fff; }

  .cell-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
    .time { font-weight: bold; font-size: 13px; }
    .tries { font-size: 12px; }
  }
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 10px 0;
}
</style>