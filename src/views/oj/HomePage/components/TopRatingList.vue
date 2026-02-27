<template>
  <BoardCard title="Top 评分" class="top-rating-card">
    <template #icon>
      <n-icon size="22"><BarChartIcon /></n-icon>
    </template>

    <n-spin :show="loading">
      <div class="table-container">
        <n-table 
          :bordered="false" 
          :single-line="false" 
          size="small" 
          class="rating-table"
        >
          <thead>
            <tr>
              <th style="width: 50px; font-size: 18px;">#</th>
              <th style="font-size: 18px;">专业</th>
              <th style="font-size: 18px;">姓名</th>
              <th style="width: 80px; font-size: 18px;">评分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in ratingList" :key="index">
              <td class="index-col">{{ index + 1 }}</td>
              <td>{{ user.major }}</td>
              <td class="name-col">{{ user.name }}</td>
              <td class="score-col">{{ user.score }}</td>
            </tr>
          </tbody>
        </n-table>
        
        <n-empty v-if="!loading && ratingList.length === 0" description="暂无数据" />
      </div>
    </n-spin>

    <div class="card-footer">
      <div class="footer-left">
        <n-button text class="blue-link" @click="handleFilter('major')">根据专业</n-button>
        <span class="divider">|</span>
        <n-button text class="blue-link" @click="handleFilter('grade')">根据年级</n-button>
        <span class="divider">|</span>
        <n-button text class="blue-link" @click="handleFilter('class')">根据班级</n-button>
      </div>
      <n-button text class="blue-link" @click="handleViewAll">
        View all ->
      </n-button>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BarChartOutline as BarChartIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

interface RatingUser {
  major: string;
  name: string;
  score: number;
}

const router = useRouter();
const loading = ref(false);
const ratingList = ref<RatingUser[]>([]);

// TODO: 替换为真实数据请求
const fetchTopRatings = async () => {
  loading.value = true;
  try {
    // 模拟异步请求占位
    setTimeout(() => {
      ratingList.value = Array.from({ length: 10 }, () => ({
        major: '计算机XXXX',
        name: 'XXX',
        score: 4009
      }));
      loading.value = false;
    }, 400);
  } catch (_e) {
    loading.value = false;
  }
};

const handleFilter = (type: string) => console.log('Filter:', type);
const handleViewAll = () => {
  //TODO: 带参
  router.push('/rank');
}

onMounted(fetchTopRatings);
</script>

<style scoped lang="less">
.top-rating-card {
  :deep(.n-card__content) {
    padding: 0;
  }
}

.table-container {
  width: 100%;
}

.rating-table {
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

  .footer-left {
    display: flex;
    align-items: center;
    gap: 6px;
    .divider { color: #d9d9d9; font-size: 14px; margin: 0 1px; }
  }

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
