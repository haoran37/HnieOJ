<template>
  <div class="problem-list-container page-shell">
    <div class="problem-filter-card flat-card">
      <n-card :bordered="false" size="small">
        <div class="filter-row inline-form">
          <div class="filter-item">
            <span class="filter-label">筛选条件</span>
            <n-dropdown
              :options="difficultyOptions"
              @select="(_: string | number, option: DropdownOption) => localSearch.difficulty = String(option.label)"
            >
              <n-button size="small" quaternary>
                {{ localSearch.difficulty || '题目难度' }}
                <template #icon>
                  <n-icon><ChevronDown /></n-icon>
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
            <n-input
              v-model:value="localSearch.keyword"
              size="small"
              placeholder="算法、标题或题目编号"
              clearable
            />
            <n-checkbox v-model:checked="localSearch.searchInContent">搜索题面</n-checkbox>
          </div>
        </div>

        <div class="filter-row selected-tags-row">
          <div class="tags-left">
            <span class="filter-label">已选择</span>
            <div class="tag-container">
              <template v-if="localSearch.tags.length > 0 || localSearch.source.length > 0">
                <n-tag
                  v-for="source in localSearch.source"
                  :key="source"
                  closable
                  size="small"
                  type="info"
                  @close="removeSource(source)"
                >
                  {{ source }}
                </n-tag>
                <n-tag
                  v-for="tag in localSearch.tags"
                  :key="tag"
                  closable
                  size="small"
                  type="primary"
                  @close="removeTag(tag)"
                >
                  {{ tag }}
                </n-tag>
                <n-button text type="primary" size="tiny" class="clear-btn" @click="clearAll">
                  清空筛选
                </n-button>
              </template>
              <span v-else class="placeholder-text">暂无，先在上方选择筛选条件</span>
            </div>
          </div>
          <n-button type="info" size="small" @click="triggerSearch">
            <template #icon><n-icon><SearchIcon /></n-icon></template>
            搜索
          </n-button>
        </div>

        <div class="divider" />
        <div class="result-info">共计 <span class="count">{{ total }}</span> 条结果</div>
      </n-card>
    </div>

    <div class="problem-table-wrapper">
      <n-card :bordered="false" content-style="padding: 0; display: flex; flex-direction: column; height: 100%;">
        <div class="table-scroll-area">
          <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :row-key="(row: ProblemRow) => row.id"
            :single-line="false"
            class="custom-table"
          />
        </div>

        <div class="pagination-bar">
          <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(total / pageSize)"
            :page-slot="7"
            @update:page="handlePageChange"
          >
            <template #prefix>
              <div class="pagination-prefix">共 {{ total }} 题</div>
            </template>
          </n-pagination>
        </div>
      </n-card>
    </div>

    <TagSelectModal
      v-model:show="showTagModal"
      v-model:source="localSearch.source"
      v-model:tags="localSearch.tags"
      mode="all"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDownOutline as ChevronDown, SearchOutline as SearchIcon } from '@vicons/ionicons5'
import type { DropdownOption } from 'naive-ui'
import { useUserStore } from '@/stores/userStore'
import { useProblemsList } from '@/composables/oj/useProblemsList'
import { useTags } from '@/composables/useTags'
import { createColumns } from '@/utils/problemColumns'
import TagSelectModal from '@/components/TagSelectModal.vue'
import type { ProblemRow, ProblemSearchParams } from '@/types/problem'

const router = useRouter()
const userStore = useUserStore()
const { tableData, loading, total, page, pageSize, updateSearch, handlePageChange, fetchProblems } = useProblemsList()
const { loading: tagLoading, fetchTags } = useTags()

const showTagModal = ref(false)
const columns = createColumns(
  (id) => userStore.getProblemStatus(id),
  (id) => router.push(`/problem/${id}`),
)

const localSearch = reactive<ProblemSearchParams>({
  source: [],
  difficulty: '',
  keyword: '',
  searchInContent: false,
  tags: [],
})

const difficultyOptions = [
  { label: '入门', key: '1' },
  { label: '简单', key: '2' },
  { label: '中等', key: '3' },
  { label: '困难', key: '4' },
]

const removeTag = (tag: string) => {
  localSearch.tags = localSearch.tags.filter((item) => item !== tag)
}

const removeSource = (source: string) => {
  localSearch.source = localSearch.source.filter((item) => item !== source)
}

const clearAll = () => {
  localSearch.tags = []
  localSearch.source = []
  localSearch.difficulty = ''
  localSearch.keyword = ''
}

const triggerSearch = () => {
  updateSearch({ ...localSearch })
}

onMounted(() => {
  void fetchTags()
  void fetchProblems()
})
</script>

<style scoped lang="less">
.problem-list-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.problem-filter-card {
  border-radius: var(--oj-radius-md);

  .filter-row {
    display: flex;
    align-items: center;
    padding: 8px 0;

    .filter-label {
      width: 65px;
      color: var(--oj-text-secondary);
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

    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .keyword-search {
      flex: 1;
      min-width: 300px;

      .n-input {
        min-width: 220px;
        flex: 1;
      }
    }
  }

  .selected-tags-row {
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: var(--oj-radius-sm);
    margin-top: 8px;
    background: var(--oj-bg-muted);

    .tags-left {
      display: flex;
      flex: 1;
      align-items: center;
      min-width: 0;
    }

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

  .divider {
    height: 1px;
    background: #efeff5;
    margin: 8px 0;
  }

  .result-info {
    color: var(--oj-text-secondary);
    font-size: 14px;

    .count {
      font-weight: 700;
      color: var(--oj-text-primary);
    }
  }
}

.problem-table-wrapper {
  min-height: 0;

  .table-scroll-area {
    overflow-y: auto;
  }

  .pagination-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    border-top: 1px solid #efeff5;
  }
}

:deep(.n-data-table .n-data-table-td) {
  border-bottom: 1px solid rgba(239, 239, 245, 1);
}

@media (max-width: 768px) {
  .problem-filter-card {
    .inline-form .keyword-search {
      min-width: 100%;
    }

    .selected-tags-row {
      gap: 12px;
      align-items: flex-start;
      flex-direction: column;
    }
  }
}
</style>
