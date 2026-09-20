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
      <n-alert v-if="error" type="error" :bordered="false" size="small" style="margin-bottom: 8px">
        {{ error }}
        <n-button size="tiny" secondary type="error" style="margin-left: 8px" @click="fetchDiscussions">
          重试
        </n-button>
      </n-alert>
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
import { useDiscussList } from '@/composables/oj/useDiscussList';
const router = useRouter();
const { 
  loading, 
  error,
  displayList, 
  total, 
  page, 
  pageSize, 
  activeCategory: _activeCategory,
  fetchDiscussions,
  handlePageChange 
} = useDiscussList();


const handleDetailOpen = (item: any) => {
  router.push(`/discuss/${item.id}`)
};

// DiscussionItem 现在回传 uid
const handleUserJump = (uid: string) => {
  if (!uid) return;
  router.push(`/user/${uid}`);
};

const handleProblemJump = (id: string | number) => {
  router.push(`/problem/${id}`);
};

// 类型过滤：携带真实分类参数跳转到讨论列表页
const handleCategoryFilter = (cat: 'Site' | 'Problem') => {
  router.push({ path: '/discuss', query: { category: cat } });
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  page.value = 1;
  void fetchDiscussions();
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
