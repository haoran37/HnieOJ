<template>
  <BoardCard title="查询用户" class="user-search-card">
    <template #icon>
      <n-icon size="22"><SearchIcon /></n-icon>
    </template>

    <div class="search-form-container">
      <n-form
        label-placement="left"
        label-width="auto"
        size="small"
        :show-feedback="false" 
        class="search-form"
      >
        <n-form-item label="姓名：">
          <n-input v-model:value="searchForm.name" placeholder="请输入" clearable />
        </n-form-item>
        
        <n-form-item label="学号：">
          <n-input v-model:value="searchForm.studentId" placeholder="请输入" clearable />
        </n-form-item>
        
        <n-form-item label="班级：">
          <n-input v-model:value="searchForm.className" placeholder="请输入" clearable />
        </n-form-item>

        <div class="button-row">
          <n-button 
            type="tertiary" 
            size="small" 
            class="search-btn"
            @click="handleSearch"
          >
            查询
          </n-button>
        </div>
      </n-form>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { SearchOutline as SearchIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

const searchForm = reactive({
  name: '',
  studentId: '',
  className: ''
});

// TODO: 实现搜索逻辑
const handleSearch = () => {
  console.log('执行查询:', { ...searchForm });
};
</script>

<style scoped lang="less">
.user-search-card {
  .search-form-container {
    padding: 10px;
  }

  .search-form {
    display: flex;
    flex-direction: column;
    gap: 8px;

    :deep(.n-form-item) {
      --n-blank-height: 0px; 
      --n-feedback-height: 0px;
      margin-bottom: 0px; 

      .n-form-item-label {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        padding-right: 8px;
        min-width: 50px;
      }
      
      .n-input {
        background-color: #fff;
        flex: 1;
        max-width: 180px; 
      }
    }
  }

  .button-row {
    display: flex;
    justify-content: flex-end;

    .search-btn {
      padding: 0 25px;
      height: 32px;
      color: #333;
      font-weight: bold;
      border: 1px solid #ccc;
      border-radius: 4px;
      
      &:hover {
        background-color: #d0d0d0;
        border-color: #bbb;
      }
    }
  }
}
</style>