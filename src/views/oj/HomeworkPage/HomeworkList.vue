<template>
  <div class="homework-page-container">
    
    <n-card :bordered="false" class="filter-card">
      <div class="filter-header">
        <n-icon size="22" color="#2080f0" style="margin-right: 8px; vertical-align: bottom;">
          <SearchIcon />
        </n-icon>
        <span class="title">作业查询 / Homework Query</span>
      </div>

      <n-grid :x-gap="24" :y-gap="24" cols="1 s:2 m:3 l:5" responsive="screen">
        <n-grid-item>
          <div class="filter-item">
            <span class="label">所属学院 (College)</span>
            <n-select 
              v-model:value="selections.college.value" 
              :options="options.colleges.value" 
              placeholder="请选择学院" 
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">年级 (Grade)</span>
            <n-select 
              v-model:value="selections.grade.value" 
              :options="options.grades.value" 
              placeholder="请选择年级" 
              :disabled="!selections.college.value"
              :loading="filterLoading && !options.grades.value.length"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">行政班级 (Class)</span>
            <n-select 
              v-model:value="selections.class_.value" 
              :options="options.classes.value" 
              placeholder="请选择班级" 
              :disabled="!selections.grade.value"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">任课教师 (Teacher)</span>
            <n-select 
              v-model:value="selections.teacher.value" 
              :options="options.teachers.value" 
              placeholder="请选择教师" 
              :disabled="!selections.class_.value"
              clearable
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
      <n-spin :show="listLoading">
        <div class="homework-grid">
          <template v-if="listData.length > 0">
            <ContestItem
              v-for="item in listData"
              :key="item.id"
              :title="item.title"
              :tags="item.tags"
              :source="item.source"
              :begin-time="item.beginTime"
              :end-time="item.endTime"
              :participant-count="item.participantCount"
              :show-follow="false"
              :highlight-source="true"
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
          :page-count="Math.ceil(total / 10)"
          size="large"
          @update:page="handleSearch"
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
import { useHomeworkFilters } from '@/composables/oj/useHomeworkFilters';
import { useHomeworkList } from '@/composables/oj/useHomeworkList';

const router = useRouter();
const searchKeyword = ref('');

// 筛选逻辑
const { 
  selections, 
  options, 
  fetchColleges, 
  loading: filterLoading 
} = useHomeworkFilters();

// 列表逻辑
const { 
  loading: listLoading, 
  listData, 
  total, 
  page, 
  fetchHomeworks 
} = useHomeworkList();

// 处理查询
const handleSearch = () => {
  const params = {
    collegeId: selections.college.value,
    gradeId: selections.grade.value,
    classId: selections.class_.value,
    teacherId: selections.teacher.value,
    keyword: searchKeyword.value,
    page: page.value
  };
  fetchHomeworks(params);
};

const handleItemClick = (id: string) => {
  router.push(`/homework/${id}`);
};

const resetFilters = () => {
  selections.college.value = null;
  searchKeyword.value = '';
  handleSearch();
};

onMounted(() => {
  fetchColleges();
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