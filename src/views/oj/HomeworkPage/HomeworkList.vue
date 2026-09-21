<template>
  <div class="homework-page-container">
    
    <n-card :bordered="false" class="filter-card">
      <div class="filter-header">
        <n-icon size="22" color="#2080f0" style="margin-right: 8px; vertical-align: bottom;">
          <SearchIcon />
        </n-icon>
        <span class="title">作业查询 / Homework Query</span>
      </div>

      <n-alert type="info" :bordered="false" style="margin-bottom: 16px">
        作业列表接口当前仅支持关键词检索；学院 / 年级 / 班级 / 教师筛选暂未开放。
      </n-alert>

      <n-grid :x-gap="24" :y-gap="24" cols="1 s:2 m:3 l:5" responsive="screen">
        <n-grid-item>
          <div class="filter-item">
            <span class="label">所属学院 (College)</span>
            <n-select
              disabled
              placeholder="暂未开放"
              :options="[]"
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">年级 (Grade)</span>
            <n-select
              disabled
              placeholder="暂未开放"
              :options="[]"
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">行政班级 (Class)</span>
            <n-select
              disabled
              placeholder="暂未开放"
              :options="[]"
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">任课教师 (Teacher)</span>
            <n-select
              disabled
              placeholder="暂未开放"
              :options="[]"
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">关键词 (Keyword)</span>
            <div class="search-action">
              <n-input 
                v-model:value="searchKeyword" 
                placeholder="作业标题..." 
                @keydown.enter="handleSearch"
                clearable
              />
              <n-button type="primary" class="search-btn" @click="handleSearch">
                <template #icon><n-icon><SearchIcon /></n-icon></template>
                查询
              </n-button>
            </div>
          </div>
        </n-grid-item>
      </n-grid>
    </n-card>

    <div class="list-section">
      <n-alert v-if="listError" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ listError }}
      </n-alert>
      <n-spin :show="listLoading">
        <div class="homework-grid">
          <template v-if="listData.length > 0">
            <ContestItem
              v-for="item in listData"
              :key="item.id"
              :title="item.title"
              :source="item.source"
              :begin-time="item.beginTime"
              :end-time="item.endTime"
              :problem-count="item.problemCount"
              @click="handleItemClick(item.id)"
            />
          </template>
          <n-empty v-else description="未找到符合条件的作业" class="empty-state">
            <template #extra>
              <n-button size="small" @click="resetFilters">重置筛选条件</n-button>
            </template>
          </n-empty>
        </div>
      </n-spin>

      <div class="pagination-footer">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          size="large"
          @update:page="handlePageChange"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Search as SearchIcon } from '@vicons/ionicons5';
import ContestItem from '@/components/ContestItem.vue';
import { useHomeworkList } from '@/composables/oj/useHomeworkList';

const router = useRouter();
const searchKeyword = ref('');

// 列表逻辑
const { 
  loading: listLoading,
  error: listError,
  listData, 
  total, 
  page, 
  pageSize,
  fetchHomeworks 
} = useHomeworkList();

// 处理查询：后端作业列表接口只支持 keyword 过滤，
// 学院/年级/班级/教师筛选当前接口不支持，界面已禁用并明确提示，不发送空参数。
const handleSearch = () => {
  page.value = 1;
  void fetchHomeworks({ keyword: searchKeyword.value });
};

const handlePageChange = (p: number) => {
  page.value = p;
  void fetchHomeworks({ keyword: searchKeyword.value });
};

const handleItemClick = (id: string) => {
  router.push(`/homework/${id}`);
};

const resetFilters = () => {
  searchKeyword.value = '';
  handleSearch();
};

onMounted(() => {
  handleSearch();
});
</script>

<style scoped lang="less">
.homework-page-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

// 筛选卡片样式
.filter-card {
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);

  .filter-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #efeff5;
    
    .title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
      font-size: 14px;
      font-weight: 500;
      color: #666;
    }
  }

  .search-action {
    display: flex;
    gap: 8px;
    
    .search-btn {
      padding: 0 20px;
      font-weight: bold;
    }
  }
}

// 列表区域样式
.list-section {
  min-height: 400px;
  display: flex;
  flex-direction: column;

  .homework-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;

    .empty-state {
      margin-top: 60px;
      padding: 40px;
      background: #fff;
      border-radius: 8px;
    }
  }

  .pagination-footer {
    display: flex;
    justify-content: center;
    padding-bottom: 32px;
  }
}
</style>