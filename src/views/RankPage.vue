<template>
  <div class="rank-page-container">
    
    <div class="filter-bar">
      <n-select 
        size="small"
        v-model:value="selections.college.value" 
        :options="options.colleges.value" 
        placeholder="选择学院" 
        clearable
        class="filter-item"
        style="width: 180px"
      />

      <n-select 
        size="small"
        v-model:value="selections.grade.value" 
        :options="options.grades.value" 
        placeholder="选择年级" 
        :disabled="!selections.college.value"
        :loading="filterLoading && !options.grades.value.length"
        clearable
        class="filter-item"
        style="width: 120px"
      />

      <n-select 
        size="small"
        v-model:value="selections.class_.value" 
        :options="options.classes.value" 
        placeholder="选择专业班级" 
        :disabled="!selections.grade.value"
        clearable
        class="filter-item"
        style="width: 160px"
      />

      <n-input 
        size="small"
        v-model:value="searchKeyword" 
        placeholder="姓名或学号" 
        clearable
        class="filter-item search-input"
        @keydown.enter="handleSearch"
      />

      <n-button 
        type="primary" 
        size="small" 
        class="search-btn" 
        @click="handleSearch"
      >
        <template #icon><n-icon><SearchIcon /></n-icon></template>
        搜索
      </n-button>
    </div>

    <div class="table-wrapper">
      <n-card :bordered="false" content-style="padding: 0;">
        <n-data-table
          :columns="columns"
          :data="listData"
          :loading="loading"
          :row-key="(row: any) => row.studentId"
          :bordered="false"
          :single-line="false"
          :striped="true"
          size="small"
          class="rank-table"
        />

        <div class="pagination-bar">
          <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(total / pageSize)"
            :page-slot="7"
            size="small"
            @update:page="onPageChange"
          >
            <template #prefix>共 {{ total }} 人</template>
          </n-pagination>
        </div>
      </n-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { SearchOutline as SearchIcon } from '@vicons/ionicons5';
import { useRankFilters } from '@/composables/useRankFilters';
import { useRankList, type RankUser } from '@/composables/useRankList';

const router = useRouter();
const searchKeyword = ref('');

const { 
  selections, options, fetchColleges, loading: filterLoading 
} = useRankFilters();

const { 
  loading, listData, total, page, pageSize, fetchRankList, handlePageChange 
} = useRankList();

// 表格列定义
const columns = [
  {
    title: 'Rank',
    key: 'rank',
    width: 60,
    align: 'center' as const
  },
  {
    title: 'Student ID',
    key: 'studentId',
    width: 130,
    render(row: RankUser) {
      return h(
        'a',
        {
          style: { 
            textDecoration: 'none', 
            color: '#2080f0', 
            cursor: 'pointer',
          },
          onClick: () => {
            router.push(`/user/${row.studentId}`);
          }
        },
        row.studentId
      );
    }
  },
  {
    title: 'Class/Major',
    key: 'className',
    width: 140
  },
  {
    title: 'Name',
    key: 'name',
    width: 100
  },
  {
    title: 'Solved',
    key: 'solved',
    width: 80,
    align: 'center' as const,
  },
  {
    title: 'Submitted',
    key: 'submitted',
    width: 90,
    align: 'center' as const
  },
  {
    title: 'Acceptance Rate',
    key: 'acceptanceRate',
    width: 130,
    align: 'center' as const
  },
  {
    title: 'Duplicate Rate',
    key: 'duplicateRate',
    width: 130,
    align: 'center' as const
  }
];

// 搜索事件
const handleSearch = () => {
  const params = {
    collegeId: selections.college.value,
    gradeId: selections.grade.value,
    classId: selections.class_.value,
    keyword: searchKeyword.value,
    page: 1 
  };
  page.value = 1;
  fetchRankList(params);
};

// 翻页事件
const onPageChange = (p: number) => {
  handlePageChange(p);
  fetchRankList({
    collegeId: selections.college.value,
    gradeId: selections.grade.value,
    classId: selections.class_.value,
    keyword: searchKeyword.value,
    page: p
  });
};

onMounted(() => {
  fetchColleges();
  handleSearch(); 
});
</script>

<style scoped lang="less">
.rank-page-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 4px;
  flex-wrap: wrap;

  .filter-item {
    vertical-align: middle; 
  }
  
  .search-input {
    width: 180px;
  }

  .search-btn {
    margin-left: auto; 
    padding: 0 20px;
    font-weight: bold;
  }
}

.table-wrapper {
  .pagination-bar {
    display: flex;
    justify-content: flex-end;
    padding: 12px 16px;
    border-top: 1px solid #efeff5;
  }
}

:deep(.rank-table) {
  .n-data-table-th {
    font-size: 14px;
    font-weight: 600;
    background-color: #fafafc; 
    padding: 8px 12px;
  }
  
  .n-data-table-td {
    font-size: 14px;
    padding: 8px 12px;
  }
}
</style>