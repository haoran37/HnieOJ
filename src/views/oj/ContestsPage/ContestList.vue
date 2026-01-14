<template>
  <div class="contests-page-container">
    
    <div class="filter-header">
      <div 
        class="filter-card internal" 
        :class="{ active: activeTab === 'INTERNAL' }"
        @click="handleTabChange('INTERNAL')"
      >
        <div class="icon-box"><n-icon :component="SchoolIcon" /></div>
        <div class="text-box">
          <div class="title">校内比赛</div>
          <div class="desc">Official Contest</div>
        </div>
        <div class="bg-shape"></div>
      </div>

      <div 
        class="filter-card external" 
        :class="{ active: activeTab === 'EXTERNAL' }"
        @click="handleTabChange('EXTERNAL')"
      >
        <div class="icon-box"><n-icon :component="PlanetIcon" /></div>
        <div class="text-box">
          <div class="title">校外比赛</div>
          <div class="desc">External OJ</div>
        </div>
        <div class="bg-shape"></div>
      </div>

      <div 
        class="filter-card user" 
        :class="{ active: activeTab === 'USER' }"
        @click="handleTabChange('USER')"
      >
        <div class="icon-box"><n-icon :component="PersonIcon" /></div>
        <div class="text-box">
          <div class="title">自主创建赛</div>
          <div class="desc">User Created</div>
        </div>
        <div class="bg-shape"></div>
      </div>
    </div>

    <div class="list-wrapper">
      <n-spin :show="loading">
        <div class="contest-grid">
          <template v-if="contestList.length > 0">
            <ContestItem
              v-for="contest in contestList"
              :key="contest.id"
              :title="contest.title"
              :tags="contest.tags"
              :source="contest.source"
              :begin-time="contest.beginTime"
              :end-time="contest.endTime"
              :participant-count="contest.participantCount"
              :compact="false"
              @click="handleItemClick(contest.id)"
            />
          </template>
          <n-empty v-else description="暂无相关比赛" class="empty-state" />
        </div>
      </n-spin>

      <div class="pagination-footer">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / 10)"
          size="large"
          @update:page="handlePageChange"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  SchoolOutline as SchoolIcon, 
  PlanetOutline as PlanetIcon, 
  PersonOutline as PersonIcon 
} from '@vicons/ionicons5';
import ContestItem from '@/components/ContestItem.vue';
import { useContests } from '@/composables/useContests';

const router = useRouter();
const { 
  loading, activeTab, page, total, contestList,
  fetchContests, handleTabChange, handlePageChange 
} = useContests();

const handleItemClick = (id: string) => {
  router.push(`/contest/${id}`);
};

onMounted(() => {
  fetchContests();
});
</script>

<style scoped lang="less">
.contests-page-container {
  width: 100%;
  // max-width: 1200px;
  margin: 0 auto;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-header {
  display: flex;
  gap: 20px;
  justify-content: flex-start;

  .filter-card {
    position: relative;
    width: 220px;
    height: 90px;
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    border: 1px solid transparent;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);

    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #f5f7fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #666;
      transition: all 0.3s;
      z-index: 2;
    }

    .text-box {
      z-index: 2;
      .title { font-size: 16px; font-weight: bold; color: #333; transition: color 0.3s;}
      .desc { font-size: 12px; color: #999; margin-top: 2px; transition: color 0.3s;}
    }

    .bg-shape {
      position: absolute;
      right: -20px;
      bottom: -20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.1;
      transform: scale(0);
      transition: transform 0.4s ease;
      z-index: 1;
    }

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    // 激活态样式
    &.active {
      background: #fff;
      border-color: currentColor;

      .bg-shape { transform: scale(3); } // 放大背景装饰
      
      // .text-box {
      //   .title { color: #fff; }
      //   .desc { color: rgba(255, 255, 255, 0.8); }
      // }
      
      // .icon-box {
      //   background: rgba(255, 255, 255, 0.2);
      //   color: #fff;
      // }
    }

    // 颜色定义
    &.internal { color: #2080f0; .bg-shape { background: #2080f0; } }
    &.external { color: #f0a020; .bg-shape { background: #f0a020; } }
    &.user { color: #8a2be2; .bg-shape { background: #8a2be2; } }
  }
}

.list-wrapper {
  min-height: 500px;
  display: flex;
  flex-direction: column;

  .contest-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
    
    .empty-state {
      margin-top: 60px;
    }
  }

  .pagination-footer {
    display: flex;
    justify-content: center;
    padding-bottom: 24px;
  }
}
</style>