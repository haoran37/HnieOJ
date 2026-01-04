<template>
  <div class="problem-filter-card">
    <n-card :bordered="false" size="small">
      <div class="filter-row">
        <span class="filter-label">所属题库</span>
        <n-menu
          v-model:value="selectedSource"
          mode="horizontal"
          :options="sourceOptions"
          class="source-menu"
        />
      </div>

      <div class="filter-row inline-form">
        <div class="filter-item">
          <span class="filter-label">筛选条件</span>
          <n-dropdown :options="difficultyOptions" @select="handleDifficultySelect">
            <n-button size="small">
              {{ selectedDifficultyLabel || '题目难度' }}
              <template #icon><n-icon><ChevronDown /></n-icon></template>
            </n-button>
          </n-dropdown>
        </div>

        <div class="filter-item">
          <n-button size="small" :loading="tagLoading" @click="showTagModal = true">
            高级筛选 / 标签
          </n-button>
        </div>

        <div class="filter-item keyword-search">
          <span class="filter-label compact">关键词</span>
          <n-input 
            size="small" 
            placeholder="算法、标题或题目编号" 
            v-model:value="searchKeyword"
            clearable 
          />
          <n-checkbox v-model:checked="searchInContent">搜索题面</n-checkbox>
        </div>
      </div>

      <div class="filter-row selected-tags-row">
        <div class="tags-left">
          <span class="filter-label">已选择</span>
          <div class="tag-container">
            <template v-if="selectedTags.length > 0">
              <n-tag 
                v-for="tag in selectedTags" 
                :key="tag" 
                closable 
                size="small" 
                type="primary"
                @close="removeTag(tag)"
              >
                {{ tag }}
              </n-tag>
              <n-button text type="primary" size="tiny" @click="clearAll" class="clear-btn">清除筛选</n-button>
            </template>
            <span v-else class="placeholder-text">暂无，可在上方进行多维度筛选</span>
          </div>
        </div>

        <n-button type="info" size="small" @click="handleSearch">
          <template #icon><n-icon><SearchIcon /></n-icon></template>
          搜索
        </n-button>
      </div>

      <div class="divider"></div>

      <div class="result-info">
        共计 <span class="count">{{ totalCount }}</span> 条结果
      </div>
    </n-card>

    <n-modal v-model:show="showTagModal" preset="card" style="width: 850px" title="筛选标签">
      <n-spin :show="tagLoading">
        <n-tabs type="line" animated>
          <n-tab-pane 
            v-for="mainCategory in tagData" 
            :key="mainCategory.id" 
            :name="mainCategory.id" 
            :tab="mainCategory.name"
          >
            <n-scrollbar style="max-height: 450px">
              <div class="tag-modal-scroll-content">
                <div 
                  v-for="subGroup in mainCategory.groups" 
                  :key="subGroup.title" 
                  class="tag-group-section"
                >
                  <div class="group-title">{{ subGroup.title }}</div>
                  
                  <n-space :size="[8, 12]">
                    <n-button 
                      v-for="tag in subGroup.tags" 
                      :key="tag" 
                      size="tiny" 
                      :secondary="!selectedTags.includes(tag)"
                      :type="selectedTags.includes(tag) ? 'primary' : 'default'"
                      style="font-size: 14px;"
                      @click="toggleTag(tag)"
                    >
                      {{ tag }}
                    </n-button>
                  </n-space>
                </div>
              </div>
            </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </n-spin>
      <template #footer>
        <div style="text-align: right">
          <n-button type="primary" @click="showTagModal = false">确认选择</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTagStore } from '@/stores/tagStore';
import { useProblemStore } from '@/stores/problemStore';
import { ChevronDownOutline as ChevronDown, SearchOutline as SearchIcon } from '@vicons/ionicons5';

// 状态管理
const tagStore = useTagStore();
const problemStore = useProblemStore();
const { tagData, loading: tagLoading } = storeToRefs(tagStore);
const { total: totalCount } = storeToRefs(problemStore);

const selectedSource = ref('HNIE');
const selectedDifficultyLabel = ref('');
const searchKeyword = ref('');
const searchInContent = ref(false);
const showTagModal = ref(false);
const selectedTags = ref<string[]>([]);

// 静态选项
const sourceOptions = [
  { label: 'HNIEOJ', key: 'HNIE' }, { label: 'Codeforces', key: 'CF' },
  { label: 'AtCoder', key: 'AT' }, { label: '洛谷', key: 'LG' }, { label: 'ALL', key: 'ALL' }
];

const difficultyOptions = [
  { label: '入门', key: '1' }, { label: '简单', key: '2' },
  { label: '中等', key: '3' }, { label: '困难', key: '4' }
];

const handleDifficultySelect = (key: string, option: any) => {
  selectedDifficultyLabel.value = option.label;
};

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag);
  if (index > -1) selectedTags.value.splice(index, 1);
  else selectedTags.value.push(tag);
};

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag);
};

const clearAll = () => {
  selectedTags.value = [];
  selectedDifficultyLabel.value = '';
};

const handleSearch = () => {
  problemStore.updateSearch({
    source: selectedSource.value,
    keyword: searchKeyword.value,
    tags: selectedTags.value,
    difficulty: selectedDifficultyLabel.value,
    searchInContent: searchInContent.value,
  });
  
  problemStore.handlePageChange(1);
};

onMounted(() => {
  // 页面挂载时对比 Hash 并加载数据
  tagStore.fetchTags();
});
</script>

<style scoped lang="less">
.problem-filter-card {
  background: #fff;
  border-radius: 4px;
  // width: 100%;

  .filter-row {
    display: flex;
    align-items: center; 
    padding: 8px 0;
    
    .filter-label {
      width: 65px;
      color: #333;
      font-size: 14px;
      flex-shrink: 0;
      &.compact { width: 50px; }
    }
  }

  .source-menu {
    :deep(.n-menu-item) { height: 30px; }
  }

  .inline-form {
    gap: 12px;
    .filter-item { display: flex; align-items: center; gap: 4px; }
    .keyword-search {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      .n-input { width: 40%; }
    }
  }

  .selected-tags-row {
    justify-content: space-between;
    align-items: flex-start;
    
    .tags-left {
      display: flex;
      align-items: flex-start;
      flex: 1;

      .tag-container {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        
        .placeholder-text { 
          color: #999; 
          font-size: 13px; 
          line-height: 28px; 
        }
      }
    }
    .n-button[type="info"] { margin-top: 2px; }
  }

  .divider { height: 1px; background-color: #f0f0f0; margin: 8px 0; }
  .result-info { color: #666; font-size: 14px; .count { font-weight: bold; color: #333; } }
}

.tag-modal-scroll-content { padding: 10px 16px 10px 0; }

.tag-group-section {
  margin-bottom: 20px;
  .group-title {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    margin-bottom: 12px;
    padding-left: 10px;
    border-left: 4px solid #2080f0;
    line-height: 1;
  }
}
</style>