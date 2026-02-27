<template>
  <BoardCard title="Top 贡献" class="top-contribution-card">
    <template #icon>
      <n-icon size="22"><RibbonIcon /></n-icon>
    </template>

    <n-spin :show="loading">
      <div class="table-container">
        <n-table 
          :bordered="false" 
          :single-line="false" 
          size="small" 
          class="contribution-table"
        >
          <thead>
            <tr>
              <th style="width: 50px; font-size: 18px;">#</th>
              <th style="font-size: 18px;">专业</th>
              <th style="font-size: 18px;">姓名</th>
              <th style="width: 80px; font-size: 18px;">贡献值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in contributionList" :key="index">
              <td class="index-col">{{ index + 1 }}</td>
              <td>{{ user.major }}</td>
              <td class="name-col">{{ user.name }}</td>
              <td class="score-col">{{ user.contribution }}</td>
            </tr>
          </tbody>
        </n-table>
        
        <n-empty v-if="!loading && contributionList.length === 0" description="暂无数据" />
      </div>
    </n-spin>

    <div class="card-footer">
      <div></div>
      <n-button text class="blue-link" @click="handleViewAll">
        View all ->
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { RibbonOutline as RibbonIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

interface ContributionUser {
  major: string;
  name: string;
  contribution: number;
}

const router = useRouter();
const loading = ref(false);
const contributionList = ref<ContributionUser[]>([]);

// 异步请求占位
const fetchTopContributions = async () => {
  loading.value = true;
  try {
    // 模拟异步请求
    setTimeout(() => {
      contributionList.value = Array.from({ length: 10 }, () => ({
        major: '软件工程XXXX',
        name: 'XXX',
        contribution: 256
      }));
      loading.value = false;
    }, 400);
  } catch (_e) {
    loading.value = false;
  }
};

const handleViewAll = () => {
  //TODO: 带参
  router.push('/rank');
}

onMounted(fetchTopContributions);
</script>

<style scoped lang="less">
.top-contribution-card {
  :deep(.n-card__content) {
    padding: 0;
  }
}

.table-container {
  width: 100%;
}

.contribution-table {
  width: 100%;
  border-collapse: collapse;

  th {
    background-color: #f8f9fa;
    font-weight: bold;
    color: #333;
    text-align: center;
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    padding: 8px 4px;
    &:last-child { border-right: none; }
  }

  tbody tr {
    // 灰白间隔逻辑
    &:nth-child(even) td {
      background-color: #f7f7f7; 
    }
    &:nth-child(odd) td {
      background-color: #ffffff;
    }
    &:hover td {
      background-color: #f0faff;
    }
  }

  td {
    text-align: center;
    padding: 6px 4px;
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    background-color: transparent; 
    
    &:last-child {
      border-right: none;
    }
  }

  .index-col { font-weight: bold; color: #666; }
  .name-col { color: #333; }
  .score-col { font-weight: bold; color: #333; }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fff;

  .blue-link {
    color: #2080f0;
    font-size: 13px;
    font-weight: 500;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
