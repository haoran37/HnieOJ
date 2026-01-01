<template>
  <BoardCard title="最近讨论">
    <template #icon>
      <n-icon size="22"><ChatIcon /></n-icon>
    </template>

    <template #extra>
      <n-button text size="tiny" type="primary" color="#007bff">View all »</n-button>
    </template>
    
    <n-spin :show="loading">
      <div class="discussion-list-container">
        <template v-if="listData.length > 0">
          <DiscussionItem 
            v-for="(item, index) in listData" 
            :key="index"
            :title="item.title"
            :username="item.username"
            :date="item.date"
            :problem-id="item.problemId"
            :problem-type="item.problemType"
            @click-card="handleDetailOpen(item)"
            @click-title="handleDetailOpen(item)"
            @click-user="handleUserJump"
            @click-id="handleProblemJump"
            @click-type="handleTypeFilter"
          />
        </template>
        <n-empty v-else description="暂无讨论内容" style="padding: 40px 0" />
      </div>
    </n-spin>

    <div class="pagination-footer">
      <n-pagination
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :item-count="pagination.total"
        show-size-picker
        :page-sizes="[5, 7, 10, 15]"
        @update:page="fetchData"
        @update:page-size="handleSizeChange"
      >
        <template #prefix="{ itemCount }">
          共 {{ itemCount }} 条，每页
        </template>
      </n-pagination>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ChatboxEllipsesOutline as ChatIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';
import DiscussionItem from '@/components/DiscussionItem.vue';

const loading = ref(false);
const listData = ref<any[]>([]);
const pagination = reactive({
  page: 1,
  pageSize: 7,
  total: 0
});

// TODO: 异步数据请求
const fetchData = async () => {
  loading.value = true;
  const params = {
    page: pagination.page,
    limit: pagination.pageSize
  };
  
  console.log('--- 发送网络请求 ---', params);

  try {
    // TODO: 接入真实 API，const res = await api.getDiscussions(params)
    setTimeout(() => {
      listData.value = Array.from({ length: pagination.pageSize }).map((_, i) => ({
        id: 100 + i, // 讨论本身的ID
        title: '关于字符串构造的疑问 - 案例 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ' + ((pagination.page - 1) * pagination.pageSize + i + 1),
        username: 'username',
        date: '2024-11-20',
        problemId: `P${1000 + i}`,
        problemType: i % 2 === 0 ? '字符串' : '动态规划'
      }));
      pagination.total = 220; 
      loading.value = false;
    }, 400);
  } catch (error) {
    loading.value = false;
  }
};

// --- 跳转逻辑处理 ---

// 进入讨论详情 (全卡片或标题)
const handleDetailOpen = (item: any) => {
  console.log('交互：进入讨论内容详情页，讨论ID:', item.id);
  // router.push(`/discussion/${item.id}`)
};

// 查看用户
const handleUserJump = (name: string) => {
  console.log('交互：查看用户信息，用户名:', name);
  // router.push(`/user/${name}`)
};

// 查看题目详情
const handleProblemJump = (id: string | number) => {
  console.log('交互：查看题目详情，题号:', id);
};

// 类型过滤
const handleTypeFilter = (type: string) => {
  console.log('交互：按类型筛选列表，类型:', type);
};

// 分页条数改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchData();
};

onMounted(fetchData);
</script>

<style scoped lang="less">
.discussion-list-container {
  min-height: 400px;
}
.pagination-footer {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>