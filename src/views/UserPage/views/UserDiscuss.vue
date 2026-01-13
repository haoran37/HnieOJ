<template>
  <div class="user-list-page">
    <div class="list-header"><h3>发布的讨论</h3></div>
    <div class="list-content">
      <DiscussionItem
        v-for="item in discussions"
        :key="item.id"
        :title="item.title"
        :username="item.username"
        :date="item.date"
        :problem-id="item.problemId"
        :category="item.category"
        :reply-count="item.replyCount"
        :is-top="item.isTop"
        @click-title="handleDetail(item.id)"
        @click-user="handleUser(item.username)"
        @click-id="handleProblem(item.problemId)"
        @click-category="handleCategoryFilter(item.category)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import DiscussionItem from '@/components/DiscussionItem.vue';

interface DiscussItem {
  id: string;
  title: string;
  username: string;
  date: string;
  problemId: string;
  category: 'Problem' | 'Site';
  replyCount: number;
  isTop: boolean;
}

const router = useRouter();
const message = useMessage();

//TODO: 从后端获取数据
const discussions = ref<DiscussItem[]>([
  { id: "1001", title: '关于题目 P1044 的时间复杂度疑问', username: 'User_44', date: '2025-02-14', problemId: 'P1044', category: 'Problem', replyCount: 10, isTop: false },
  { id: "1002", title: '求助：为什么这个线段树会 TLE？', username: 'User_44', date: '2025-02-10', problemId: 'P1043', category: 'Problem', replyCount: 22, isTop: false },
]);

const handleDetail = (id: string) => {
  router.push(`/discuss/${id}`);
};

const handleUser = (username: string) => {
  //TODO: 实现根据username查询id的api
  message.info(`查看用户: ${username}`);
  message.warning('TODO: 实现根据username查询id的api');
  router.push(`/user/${username}`);
};

const handleProblem = (pid: string) => {
  router.push(`/problem/${pid}`);
};

// 类型过滤 (点击分类标签时，跳转到讨论列表页并筛选)
const handleCategoryFilter = (cat: 'Site' | 'Problem') => {
  console.log('交互：跳转到讨论页并筛选:', cat);
  //TODO: 这里可以带参数跳转，例如 router.push({ path: '/discuss', query: { category: cat } })
  // 目前先简单跳转
  router.push('/discuss');
};
</script>

<style scoped lang="less">
.user-list-page { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.list-header { margin-bottom: 16px; border-left: 4px solid #2080f0; padding-left: 12px; }
.list-content { display: flex; flex-direction: column; gap: 0; }
</style>