<template>
  <div class="rank-page-container">
    <n-card :bordered="false" class="rank-card">
      <n-tabs type="line" animated>
        <n-tab-pane name="solve" tab="解题榜">
          <n-spin :show="loading">
            <n-alert v-if="error" type="error">{{ error }}</n-alert>
            <n-empty v-else-if="!rows.length" description="暂无解题记录" class="empty-state" />
            <n-data-table v-else :columns="columns" :data="rows" :pagination="{ pageSize: 20 }" />
          </n-spin>
        </n-tab-pane>
        <n-tab-pane name="rating" tab="比赛评分">
          <n-alert v-if="ratingError" type="error">{{ ratingError }}</n-alert>
          <n-data-table v-else :columns="ratingColumns" :data="ratings" :loading="loading" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>
        <n-tab-pane name="contribution" tab="社区贡献">
          <n-alert v-if="contributionError" type="error">{{ contributionError }}</n-alert>
          <n-data-table v-else :columns="contributionColumns" :data="contributions" :loading="loading" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { getSolveRankings, getContestRatings, getContributionRankings, type UserSolveRankVo, type ContestRatingVo, type ContributionRankVo } from '@/utils/api';

const rows = ref<UserSolveRankVo[]>([]);
const loading = ref(false);
const error = ref('');
const ratings = ref<ContestRatingVo[]>([]);
const contributions = ref<ContributionRankVo[]>([]);
const ratingError = ref('');
const contributionError = ref('');
const columns: DataTableColumns<UserSolveRankVo> = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户', key: 'username' },
  { title: '已解决', key: 'solved', width: 110 },
  { title: '本月解决', key: 'monthlySolved', width: 110 },
  { title: '提交数', key: 'submissions', width: 100 },
];
const ratingColumns: DataTableColumns<ContestRatingVo> = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户', key: 'username' },
  { title: '评分', key: 'rating', width: 110 },
  { title: '参赛场次', key: 'contests', width: 110 },
];
const contributionColumns: DataTableColumns<ContributionRankVo> = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户', key: 'username' },
  { title: '贡献', key: 'contribution', width: 110 },
  { title: '发帖', key: 'posts', width: 90 },
  { title: '回答', key: 'answers', width: 90 },
];
onMounted(async () => {
  loading.value = true;
  await Promise.all([
    getSolveRankings().then(data => { rows.value = data; }).catch(cause => { error.value = cause instanceof Error ? cause.message : '获取解题榜失败'; }),
    getContestRatings().then(data => { ratings.value = data; }).catch(cause => { ratingError.value = cause instanceof Error ? cause.message : '获取评分榜失败'; }),
    getContributionRankings().then(data => { contributions.value = data; }).catch(cause => { contributionError.value = cause instanceof Error ? cause.message : '获取贡献榜失败'; }),
  ]);
  loading.value = false;
});
</script>

<style scoped lang="less">
.rank-page-container {
  width: 100%;
  margin: 0 auto;
}
.rank-card {
  min-height: 500px;
}
.empty-state {
  padding: 80px 0;
}
</style>
