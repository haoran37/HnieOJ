<template>
  <div class="problem-list-container">

    <div class="problem-filter-card">
      <n-card :bordered="false" size="small">
        <div class="filter-row">
          <span class="filter-label">所属题库</span>
          <n-menu v-model:value="localSearch.source" mode="horizontal" :options="sourceOptions" class="source-menu" />
        </div>

        <div class="filter-row inline-form">
          <div class="filter-item">
            <span class="filter-label">筛选条件</span>
            <n-dropdown :options="difficultyOptions"
              @select="(_: string | number, opt: DropdownOption) => localSearch.difficulty = String(opt.label)">
              <n-button size="small">
                {{ localSearch.difficulty || '题目难度' }}
                <template #icon>
                  <n-icon>
                    <ChevronDown />
                  </n-icon>
                </template>
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
            <n-input size="small" placeholder="算法、标题或题目编号" v-model:value="localSearch.keyword" clearable />
            <n-checkbox v-model:checked="localSearch.searchInContent">搜索题面</n-checkbox>
          </div>
        </div>

        <div class="filter-row selected-tags-row">
          <div class="tags-left">
            <span class="filter-label">已选择</span>
            <div class="tag-container">
              <template v-if="localSearch.tags.length > 0">
                <n-tag v-for="tag in localSearch.tags" :key="tag" closable size="small" type="primary"
                  @close="removeTag(tag)">
                  {{ tag }}
                </n-tag>
                <n-button text type="primary" size="tiny" @click="clearAll" class="clear-btn">清除筛选</n-button>
              </template>
              <span v-else class="placeholder-text">暂无，可在上方进行多维度筛选</span>
            </div>
          </div>
          <n-button type="info" size="small" @click="triggerSearch">
            <template #icon>
              <n-icon>
                <SearchIcon />
              </n-icon>
            </template>搜索
          </n-button>
        </div>

        <div class="divider"></div>
        <div class="result-info">共计 <span class="count">{{ total }}</span> 条结果</div>
      </n-card>
    </div>

    <div class="problem-table-wrapper">
      <n-card :bordered="false" content-style="padding: 0; display: flex; flex-direction: column; height: 100%;">
        <div class="table-scroll-area">
          <n-data-table :columns="columns" :data="tableData" :loading="loading" :row-key="(row: any) => row.id"
            :single-line="false" class="custom-table" />
        </div>

        <div class="pagination-bar">
          <n-pagination v-model:page="page" :page-count="Math.ceil(total / pageSize)" :page-slot="7"
            @update:page="handlePageChange">
            <template #prefix>
              <div class="pagination-prefix">共 {{ total }} 条题目</div>
            </template>
          </n-pagination>
        </div>
      </n-card>
    </div>

    <n-modal v-model:show="showTagModal" preset="card" style="width: 850px" title="筛选标签" :auto-focus="false">
      <n-spin :show="tagLoading">
        <n-tabs type="line" animated>
          <n-tab-pane v-for="cat in tagData" :key="cat.id" :name="cat.id" :tab="cat.name">
            <n-scrollbar style="max-height: 450px">
              <div class="tag-modal-scroll-content">
                <div v-for="group in cat.groups" :key="group.title" class="tag-group-section">
                  <div class="group-title">{{ group.title }}</div>
                  <n-space :size="[8, 12]">
                    <n-button v-for="tag in group.tags" :key="tag" size="tiny"
                      :type="localSearch.tags.includes(tag) ? 'primary' : 'default'" @click="toggleTag(tag)">{{ tag
                      }}</n-button>
                  </n-space>
                </div>
              </div>
            </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </n-spin>
      <template #footer>
        <div style="text-align: right"><n-button type="primary" @click="showTagModal = false">确认选择</n-button></div>
      </template>
    </n-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronDownOutline as ChevronDown, SearchOutline as SearchIcon } from '@vicons/ionicons5';
import type { DropdownOption } from 'naive-ui';
import { useUserStore } from '@/stores/userStore';
import { useProblemsList } from '@/composables/oj/useProblemsList';
import { useTags } from '@/composables/useTags';
import { createColumns } from '@/utils/problemColumns';

const router = useRouter();
const userStore = useUserStore();
const {
  tableData, loading, total, page, pageSize,
  updateSearch, handlePageChange, fetchProblems
} = useProblemsList();

const { tagData, loading: tagLoading, fetchTags } = useTags();

const handleProblemClick = (id: string) => {
  router.push(`/problem/${id}`);
};

// 本地 UI 状态
const showTagModal = ref(false);
const columns = createColumns(
  (id) => userStore.getProblemStatus(id),
  handleProblemClick
); // 根据用户做题情况构建Columns

// 本地筛选表单
const localSearch = reactive({
  source: 'HNIE',
  difficulty: '',
  keyword: '',
  searchInContent: false,
  tags: [] as string[]
});

// 静态选项
const sourceOptions = [
  { label: 'HNIEOJ', key: 'HNIE' }, { label: 'Codeforces', key: 'CF' },
  { label: 'AtCoder', key: 'AT' }, { label: '洛谷', key: 'LG' }, { label: 'ALL', key: 'ALL' }
];
const difficultyOptions = [
  { label: '入门', key: '1' }, { label: '简单', key: '2' },
  { label: '中等', key: '3' }, { label: '困难', key: '4' }
];

const toggleTag = (tag: string) => {
  const idx = localSearch.tags.indexOf(tag);
  if (idx > -1) localSearch.tags.splice(idx, 1);
  else localSearch.tags.push(tag);
};

const removeTag = (tag: string) => {
  localSearch.tags = localSearch.tags.filter(t => t !== tag);
};

const clearAll = () => {
  localSearch.tags = [];
  localSearch.difficulty = '';
  localSearch.keyword = '';
};

// 触发搜索：将本地表单数据提交给 useProblemsList
const triggerSearch = () => {
  updateSearch({ ...localSearch });
};

onMounted(() => {
  fetchTags();
  fetchProblems();
});
</script>

<style scoped lang="less">
.problem-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.problem-filter-card {
  background: #fff;
  border-radius: 4px;
  flex-shrink: 0;

  .filter-row {
    display: flex;
    align-items: center;
    padding: 8px 0;

    .filter-label {
      width: 65px;
      color: #666;
      font-size: 14px;
      flex-shrink: 0;

      &.compact {
        width: 50px;
      }
    }
  }

  .inline-form {
    gap: 12px;
    flex-wrap: wrap;

    .filter-item { display: flex; align-items: center; gap: 6px; }

    .keyword-search {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;

      .n-input {
        min-width: 200px;
        flex: 1;
      }
    }
  }

  .selected-tags-row {
    justify-content: space-between;
    padding: 8px;
    border-radius: 4px;
    margin-top: 8px;

    .tags-left {
      display: flex;
      flex: 1;
      align-items: center;

      .tag-container {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .placeholder-text {
          color: #999;
          font-size: 13px;
        }
      }
    }
  }

  .divider {
    height: 1px;
    background: #efeff5;
    margin: 8px 0;
  }

  .result-info {
    color: #666;
    font-size: 14px;

    .count {
      font-weight: bold;
      color: #333;
    }
  }
}

.problem-table-wrapper {
  flex: 1;
  min-height: 0;

  .table-scroll-area {
    flex: 1;
    overflow-y: auto;
  }

  .pagination-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: #fff;
    border-top: 1px solid #efeff5;
  }
}

.tag-group-section {
  margin-bottom: 20px;

  .group-title {
    font-weight: bold;
    margin-bottom: 12px;
    border-left: 4px solid #2080f0;
    padding-left: 10px;
  }
}

:deep(.n-data-table .n-data-table-td) {
  border-bottom: 1px solid rgba(239, 239, 245, 1);
}
</style>