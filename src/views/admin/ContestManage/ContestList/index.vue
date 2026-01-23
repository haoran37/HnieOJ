<template>
  <div class="contest-list-container">
    <n-card :bordered="false">
      <div class="header">
        <div class="title">比赛列表</div>
        <n-button type="primary" @click="router.push({ name: 'AdminContestAdd' })">
          添加比赛
        </n-button>
      </div>
      
      <n-space vertical :size="16">
        <div class="search-bar">
          <n-input-group>
            <n-input v-model:value="searchKeyword" placeholder="搜索比赛..." @keyup.enter="handleSearch" />
            <n-button type="primary" @click="handleSearch">
              搜索
            </n-button>
          </n-input-group>
        </div>

        <n-data-table
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          :row-key="(row) => row.id"
          :scroll-x="1200"
        />
      </n-space>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NSpace, NInput, NInputGroup, NDataTable } from 'naive-ui';
import { useContestList } from '@/composables/admin/useContestManage';

const router = useRouter();
const {
  loading,
  tableData,
  pagination,
  columns,
  searchKeyword,
  handleSearch,
  fetchContests
} = useContestList();

onMounted(() => {
  fetchContests();
});
</script>

<style scoped lang="less">
.contest-list-container {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .title {
      font-size: 18px;
      font-weight: bold;
    }
  }

  .search-bar {
    width: 300px;
  }
}
</style>
