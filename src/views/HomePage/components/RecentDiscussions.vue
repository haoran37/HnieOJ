<template>
  <BoardCard title="最近讨论">
    <template #icon>
      <n-icon size="22"><ChatIcon /></n-icon>
    </template>

    <template #extra>
      <n-button 
        text 
        size="tiny" 
        type="primary" 
        color="#007bff"
        @click="$router.push('/discuss')"
      >
        View all »
      </n-button>
    </template>
    
    <n-spin :show="loading">
      <div class="discussion-list-container">
        <template v-if="displayList.length > 0">
          <DiscussionItem 
            v-for="item in displayList" 
            :key="item.id"
            :title="item.title"
            :username="item.username"
            :date="item.date"
            :problem-id="item.problemId"
            :category="item.category" 
            :reply-count="item.replyCount"
            :is-top="item.isTop"
            @click-card="handleDetailOpen(item)"
            @click-title="handleDetailOpen(item)"
            @click-user="handleUserJump"
            @click-id="handleProblemJump"
            @click-category="handleCategoryFilter"
          />
        </template>
        <n-empty v-else description="暂无讨论内容" style="padding: 40px 0" />
      </div>
    </n-spin>

    <div class="pagination-footer">
      <n-pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :item-count="total"
        show-size-picker
        :page-sizes="[10, 15, 20, 25]"
        @update:page="handlePageChange"
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
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ChatboxEllipsesOutline as ChatIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';
import DiscussionItem from '@/components/DiscussionItem.vue';
import { useDiscussList } from '@/composables/useDiscussList';

const router = useRouter();

const { 
  loading, 
  displayList, 
  total, 
  page, 
  pageSize, 
  activeCategory,
  fetchDiscussions,
  handlePageChange 
} = useDiscussList();


const handleDetailOpen = (item: any) => {
  router.push(`/discuss/${item.id}`)
};

const handleUserJump = (name: string) => {
  console.log('交互：查看用户信息，用户名:', name);
  // router.push(`/user/${name}`)
};

const handleProblemJump = (id: string | number) => {
  router.push(`/problem/${id}`);
};

// 类型过滤 (点击分类标签时，跳转到讨论列表页并筛选)
const handleCategoryFilter = (cat: 'Site' | 'Problem') => {
  console.log('交互：跳转到讨论页并筛选:', cat);
  //TODO: 这里可以带参数跳转，例如 router.push({ path: '/discuss', query: { category: cat } })
  // 目前先简单跳转
  router.push('/discuss');
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  page.value = 1; 
};

onMounted(() => {
  fetchDiscussions();
});
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