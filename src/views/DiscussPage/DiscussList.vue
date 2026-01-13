<template>
  <div class="discuss-list-container">
    
    <div class="page-header-card">
      <div class="header-left">
        <h1 class="page-title">讨论版</h1>
        <span class="subtitle">分享观点，交流思路</span>
      </div>
      <div class="header-right">
        <div class="stat-item">
          <div class="num">{{ total }}</div>
          <div class="label">主题总数</div>
        </div>
        <n-divider vertical />
        <div class="stat-item">
          <div class="num highlight">+12</div>
          <div class="label">今日新增</div>
        </div>
      </div>
    </div>

    <n-grid :x-gap="20" cols="1 l:4" responsive="screen">
      
      <n-grid-item span="3">
        <n-card :bordered="false" class="main-list-card">
          
          <div class="list-toolbar">
            <div class="tabs-wrapper">
              <n-tabs 
                type="segment" 
                size="small" 
                :value="sortBy" 
                @update:value="handleSortChange"
                class="custom-tabs"
              >
                <n-tab name="Latest">最新回复</n-tab>
                <n-tab name="Hot">热门讨论</n-tab>
              </n-tabs>
            </div>
            
            <div class="search-wrapper">
              <n-input 
                v-model:value="searchText" 
                placeholder="搜索标题、题目ID或用户..." 
                size="small"
                class="search-input"
              >
                <template #prefix><n-icon><SearchIcon /></n-icon></template>
              </n-input>
            </div>
          </div>

          <n-spin :show="loading">
            <div class="list-wrapper">
              <template v-if="displayList.length > 0">
                <DiscussionItem 
                  v-for="item in displayList"
                  :key="item.id"
                  v-bind="item"
                  @click-title="handleDetail(item.id)"
                  @click-user="handleUser"
                  @click-id="handleProblem"
                  @click-category="handleCategoryChange"
                />
              </template>
              <n-empty v-else description="没有找到相关讨论" class="empty-state" />
            </div>
          </n-spin>

          <div class="pagination-wrapper">
            <n-pagination
              v-model:page="page"
              :item-count="total"
              :page-size="pageSize"
              @update:page="handlePageChange"
            />
          </div>
        </n-card>
      </n-grid-item>

      <n-grid-item span="1">
        <n-space vertical size="large">
          
          <n-card :bordered="false" size="small" class="action-card">
            <n-button 
              v-if="userStore.isStudent" 
              type="primary" 
              block 
              size="large" 
              class="create-btn"
              @click="handleCreate"
            >
              <template #icon><n-icon><AddIcon /></n-icon></template>
              新建讨论
            </n-button>
            <n-button v-else disabled block dashed>
              登录后参与讨论
            </n-button>

            <div class="tips-box">
              <p>提问前请先搜索，避免重复提问。</p>
              <p>文明交流，代码请使用 Markdown 格式。</p>
            </div>
          </n-card>

          <n-card title="板块导航" :bordered="false" size="small" class="filter-card">
            <n-menu
              :options="menuOptions"
              :value="activeCategory"
              @update:value="handleCategoryChange"
            />
          </n-card>

          <n-card title="热门话题" :bordered="false" size="small">
            <n-space size="small">
              <n-tag size="small" clickable>动态规划</n-tag>
              <n-tag size="small" clickable>C++</n-tag>
              <n-tag size="small" clickable>线段树</n-tag>
              <n-tag size="small" clickable>考研</n-tag>
              <n-tag size="small" clickable>系统Bug</n-tag>
            </n-space>
          </n-card>

        </n-space>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, NIcon } from 'naive-ui';
import { 
  SearchOutline as SearchIcon, 
  AddOutline as AddIcon,
  GridOutline as AllIcon,
  MegaphoneOutline as SiteIcon,
  CodeSlashOutline as ProblemIcon
} from '@vicons/ionicons5';
import DiscussionItem from '@/components/DiscussionItem.vue';
import { useDiscussList } from '@/composables/useDiscussList';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const { 
  loading, displayList, total, page, pageSize, 
  activeCategory, searchText, sortBy,
  fetchDiscussions, handlePageChange 
} = useDiscussList();

const renderIcon = (icon: any) => () => h(NIcon, null, { default: () => h(icon) });
const menuOptions = [
  { label: '全部讨论', key: 'All', icon: renderIcon(AllIcon) },
  { label: '站内事务', key: 'Site', icon: renderIcon(SiteIcon) },
  { label: '题目讨论', key: 'Problem', icon: renderIcon(ProblemIcon) }
];

// 处理排序切换
const handleSortChange = (value: string | number) => {
  sortBy.value = value as 'Latest' | 'Hot';
};

// 处理分类切换
const handleCategoryChange = (key: string | number) => {
  activeCategory.value = key as 'All' | 'Site' | 'Problem';
};

const handleDetail = (id: number) => {
  router.push(`/discuss/${id}`);
};

const handleUser = (username: string) => {
  message.info(`查看用户: ${username}`);
  message.warning('TODO: 实现根据username查询id的api');
  router.push(`/user/${username}`);
};

const handleProblem = (pid: string) => {
  router.push(`/problem/${pid}`);
};

const handleCreate = () => {
  message.success('跳转到发布页面...');
};

onMounted(() => {
  fetchDiscussions();
});
</script>

<style scoped lang="less">
.discuss-list-container {
  // width: 100%;
  // max-width: 1200px;
  margin: 0 auto;
  // padding: 0 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: 768px) {
    padding: 0 24px 60px;
  }
}

.page-header-card {
  background: #fff;
  padding: 24px 32px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #2080f0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin: 0;
      display: inline-block;
      margin-right: 12px;
    }
    .subtitle { color: #999; font-size: 14px; }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 24px;
    
    .stat-item {
      text-align: center;
      .num { font-size: 20px; font-weight: bold; color: #333; line-height: 1.2; }
      .num.highlight { color: #18a058; }
      .label { font-size: 12px; color: #999; }
    }
  }
}

.main-list-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 600px;

  .list-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 16px;

    .tabs-wrapper {
      .custom-tabs {
        width: 240px;
      }
    }

    .search-wrapper {
      .search-input { width: 240px; }
    }
  }

  .list-wrapper {
    min-height: 400px;
    .empty-state { padding: 60px 0; }
  }
  
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding-top: 24px;
  }
}

.action-card, .filter-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.create-btn {
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(32, 128, 240, 0.2);
}

.tips-box {
  margin-top: 16px;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
  background: #f9f9fa;
  padding: 12px;
  border-radius: 4px;
  p { margin: 0 0 4px 0; &:last-child { margin: 0; } }
}

:deep(.n-menu-item-content) {
  padding-left: 12px !important; 
}
</style>