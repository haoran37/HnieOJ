<template>
  <BoardCard title="查询用户" class="user-search-card">
    <template #icon>
      <n-icon size="22"><SearchIcon /></n-icon>
    </template>

    <div class="search-form-container">
      <n-form
        label-placement="left"
        label-width="auto"
        size="small"
        :show-feedback="false"
        class="search-form"
      >
        <n-form-item label="姓名/学号:">
          <n-input v-model:value="keyword" placeholder="请输入姓名或学号" clearable />
        </n-form-item>

        <n-form-item label="学院:">
          <n-select
            v-model:value="collegeId"
            :options="collegeOptions"
            :loading="loadingColleges"
            placeholder="请选择学院"
            clearable
            @update:value="handleCollegeChange"
          />
        </n-form-item>

        <n-form-item label="年级:">
          <n-select
            v-model:value="grade"
            :options="gradeOptions"
            :loading="loadingGrades"
            :disabled="collegeId === null"
            placeholder="请选择年级"
            clearable
            @update:value="handleGradeChange"
          />
        </n-form-item>

        <n-form-item label="班级:">
          <n-select
            v-model:value="classId"
            :options="classOptions"
            :loading="loadingClasses"
            :disabled="grade === null"
            placeholder="请选择班级"
            clearable
          />
        </n-form-item>

        <div class="button-row">
          <n-button
            type="tertiary"
            size="small"
            class="search-btn"
            :loading="searching"
            @click="handleSearch"
          >
            查询
          </n-button>
        </div>
      </n-form>

      <n-alert
        v-if="errorMessage"
        class="search-error"
        type="error"
        closable
        @close="errorMessage = ''"
      >
        {{ errorMessage }}
      </n-alert>

      <div v-if="searched" class="search-result">
        <div class="result-summary">共 {{ total }} 条结果</div>
        <n-empty
          v-if="!errorMessage && users.length === 0"
          class="result-empty"
          description="未找到匹配用户"
        />
        <template v-else-if="users.length > 0">
          <ul class="user-list">
            <li v-for="user in users" :key="user.uid" class="user-entry">
              <button type="button" class="user-item" @click="goToUser(user.uid)">
                <span class="user-name">{{ user.realname || user.username }}</span>
                <span class="user-meta">{{ user.uid }}</span>
              </button>
            </li>
          </ul>
          <n-pagination
            v-if="total > pageSize"
            class="result-pagination"
            :page="page"
            :page-size="pageSize"
            :item-count="total"
            size="small"
            @update:page="handlePageChange"
          />
        </template>
      </div>
    </div>
  </BoardCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { SearchOutline as SearchIcon } from '@vicons/ionicons5'
import BoardCard from '@/components/BoardCard.vue'
import { getClasses, getColleges, getGrades, searchUsers } from '@/utils/api'
import type { UserListVo, UserSearchFilters } from '@/utils/api'
import type { ClassOption, CollegeOption, GradeOption } from '@/types/user'

const pageSize = 5

const router = useRouter()
const message = useMessage()

const keyword = ref('')
const collegeId = ref<number | null>(null)
const grade = ref<string | null>(null)
const classId = ref<number | null>(null)

const colleges = ref<CollegeOption[]>([])
const grades = ref<GradeOption[]>([])
const classes = ref<ClassOption[]>([])

const loadingColleges = ref(false)
const loadingGrades = ref(false)
const loadingClasses = ref(false)
const searching = ref(false)

const users = ref<UserListVo[]>([])
const total = ref(0)
const page = ref(1)
const searched = ref(false)
const errorMessage = ref('')

const collegeOptions = computed(() => colleges.value.map((item) => ({ label: item.name, value: item.id })))
const gradeOptions = computed(() => grades.value.map((item) => ({ label: item.grade, value: item.grade })))
const classOptions = computed(() => classes.value.map((item) => ({ label: item.name, value: item.id })))

// 竞态保护：快速切换学院/年级/翻页时，只有最新一次请求的响应可以写入
let gradesRequestSeq = 0
let classesRequestSeq = 0
let searchRequestSeq = 0
let navigating = false
let lastNavigatedUid = ''

function showCascadeError(error: unknown, fallback: string) {
  message.error(error instanceof Error ? error.message : fallback)
}

async function loadColleges() {
  loadingColleges.value = true
  try {
    colleges.value = await getColleges()
  } catch (error) {
    showCascadeError(error, '学院列表加载失败')
  } finally {
    loadingColleges.value = false
  }
}

// 条件变化后旧的查询结果/在途响应都不再适用，直接作废
function resetSearchResult() {
  searchRequestSeq += 1
  searching.value = false
  searched.value = false
  errorMessage.value = ''
  users.value = []
  total.value = 0
  page.value = 1
}

async function handleCollegeChange(value: number | null) {
  const requestSeq = ++gradesRequestSeq
  classesRequestSeq += 1
  loadingGrades.value = false
  loadingClasses.value = false
  grade.value = null
  classId.value = null
  grades.value = []
  classes.value = []
  resetSearchResult()
  if (value === null) return

  loadingGrades.value = true
  try {
    const result = await getGrades(value)
    if (requestSeq !== gradesRequestSeq) return
    grades.value = result
  } catch (error) {
    if (requestSeq !== gradesRequestSeq) return
    showCascadeError(error, '年级列表加载失败')
  } finally {
    if (requestSeq === gradesRequestSeq) loadingGrades.value = false
  }
}

async function handleGradeChange(value: string | null) {
  const requestSeq = ++classesRequestSeq
  const selectedCollege = collegeId.value
  loadingClasses.value = false
  classId.value = null
  classes.value = []
  resetSearchResult()
  if (!value || selectedCollege === null) return

  loadingClasses.value = true
  try {
    const result = await getClasses(selectedCollege, value)
    if (requestSeq !== classesRequestSeq) return
    classes.value = result
  } catch (error) {
    if (requestSeq !== classesRequestSeq) return
    showCascadeError(error, '班级列表加载失败')
  } finally {
    if (requestSeq === classesRequestSeq) loadingClasses.value = false
  }
}

// 任一筛选条件（含清空）变化时立即作废在途查询与旧结果。
// 使用 sync 刷新，保证在同一 tick 内先于后续查询/翻页生效，避免旧响应回填。
watch([keyword, collegeId, grade, classId], () => resetSearchResult(), { flush: 'sync' })

function hasSearchCondition(): boolean {
  return keyword.value.trim().length > 0 || collegeId.value !== null
}

function buildFilters(): UserSearchFilters {
  const selectedCollege = collegeId.value
  const selectedGrade = grade.value
  return {
    collegeId: selectedCollege,
    grade: selectedCollege !== null ? selectedGrade : null,
    classId: selectedCollege !== null && selectedGrade ? classId.value : null,
  }
}

async function loadUsers(targetPage: number) {
  const requestSeq = ++searchRequestSeq
  searching.value = true
  errorMessage.value = ''
  try {
    const result = await searchUsers(keyword.value.trim(), targetPage, pageSize, buildFilters())
    if (requestSeq !== searchRequestSeq) return
    users.value = result?.list ?? []
    total.value = result?.total ?? 0
    page.value = targetPage
    searched.value = true
  } catch (error) {
    if (requestSeq !== searchRequestSeq) return
    errorMessage.value = error instanceof Error ? error.message : '用户查询失败'
    users.value = []
    total.value = 0
    searched.value = false
  } finally {
    if (requestSeq === searchRequestSeq) searching.value = false
  }
}

async function handleSearch() {
  if (!hasSearchCondition()) {
    message.warning('请输入条件')
    return
  }
  await loadUsers(1)
}

async function handlePageChange(targetPage: number) {
  // 条件被清空后结果与分页已作废，禁止翻页触发无意的全库查询
  if (!hasSearchCondition()) {
    message.warning('请输入条件')
    return
  }
  await loadUsers(targetPage)
}

async function goToUser(uid: string) {
  if (!uid || navigating || uid === lastNavigatedUid) return
  navigating = true
  lastNavigatedUid = uid
  try {
    await router.push(`/user/${encodeURIComponent(uid)}`)
  } finally {
    navigating = false
  }
}

onMounted(loadColleges)
</script>

<style scoped lang="less">
.user-search-card {
  .search-form-container {
    padding: 10px;
  }

  .search-form {
    display: flex;
    flex-direction: column;
    gap: 8px;

    :deep(.n-form-item) {
      --n-blank-height: 0px;
      --n-feedback-height: 0px;
      margin-bottom: 0px;

      .n-form-item-label {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        padding-right: 8px;
        min-width: 50px;
      }

      .n-input,
      .n-select {
        background-color: #fff;
        flex: 1;
        max-width: 180px;
      }
    }
  }

  .button-row {
    display: flex;
    justify-content: flex-end;

    .search-btn {
      padding: 0 25px;
      height: 32px;
      color: #333;
      font-weight: bold;
      border: 1px solid #ccc;
      border-radius: 4px;

      &:hover {
        background-color: #d0d0d0;
        border-color: #bbb;
      }
    }
  }

  .search-error {
    margin-top: 8px;
  }

  .search-result {
    margin-top: 10px;
    border-top: 1px solid #e0e0e0;
    padding-top: 8px;

    .result-summary {
      font-size: 13px;
      color: #666;
      margin-bottom: 6px;
    }

    .user-list {
      list-style: none;
      margin: 0;
      padding: 0;

      .user-entry {
        list-style: none;
      }

      .user-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 8px;
        border: none;
        border-radius: 4px;
        background-color: transparent;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f0f0f0;
        }

        &:focus-visible {
          outline: 2px solid #2080f0;
          outline-offset: -2px;
        }

        .user-name {
          color: #333;
          font-weight: 500;
        }

        .user-meta {
          color: #999;
          font-size: 12px;
        }
      }
    }

    .result-pagination {
      margin-top: 8px;
      justify-content: center;
    }
  }
}
</style>
