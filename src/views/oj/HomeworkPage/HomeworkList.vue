<template>
  <div class="homework-page-container">
    
    <n-card :bordered="false" class="filter-card">
      <div class="filter-header">
        <n-icon size="22" color="#2080f0" style="margin-right: 8px; vertical-align: bottom;">
          <SearchIcon />
        </n-icon>
        <span class="title">作业查询 / Homework Query</span>
      </div>

      <n-grid :x-gap="24" :y-gap="24" cols="1 s:2 m:3 l:5" responsive="screen">
        <n-grid-item>
          <div class="filter-item">
            <span class="label">所属学院 (College)</span>
            <n-select
              v-model:value="collegeId"
              placeholder="全部学院"
              :options="collegeOptions"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">年级 (Grade)</span>
            <n-select
              v-model:value="grade"
              placeholder="全部年级"
              :options="gradeOptions"
              :disabled="!collegeId"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">行政班级 (Class)</span>
            <n-select
              v-model:value="classId"
              placeholder="全部班级"
              :options="classOptions"
              :disabled="!collegeId"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">任课教师 (Teacher)</span>
            <n-select
              v-model:value="teacherUid"
              placeholder="全部教师"
              :options="teacherOptions"
              :disabled="!collegeId"
              :loading="teachersLoading"
              @focus="loadTeachers"
              clearable
            />
          </div>
        </n-grid-item>

        <n-grid-item>
          <div class="filter-item">
            <span class="label">关键词 (Keyword)</span>
            <div class="search-action">
              <n-input 
                v-model:value="searchKeyword" 
                placeholder="作业标题..." 
                @keydown.enter="handleSearch"
                clearable
              />
              <n-button type="primary" class="search-btn" @click="handleSearch">
                <template #icon><n-icon><SearchIcon /></n-icon></template>
                查询
              </n-button>
            </div>
          </div>
        </n-grid-item>
      </n-grid>
    </n-card>

    <div class="list-section">
      <n-alert v-if="listError" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ listError }}
      </n-alert>
      <n-spin :show="listLoading">
        <div class="homework-grid">
          <template v-if="listData.length > 0">
            <ContestItem
              v-for="item in listData"
              :key="item.id"
              :title="item.title"
              :source="item.source"
              :begin-time="item.beginTime"
              :end-time="item.endTime"
              :problem-count="item.problemCount"
              @click="handleItemClick(item.id)"
            />
          </template>
          <n-empty v-else description="未找到符合条件的作业" class="empty-state">
            <template #extra>
              <n-button size="small" @click="resetFilters">重置筛选条件</n-button>
            </template>
          </n-empty>
        </div>
      </n-spin>

      <div class="pagination-footer">
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          size="large"
          @update:page="handlePageChange"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Search as SearchIcon } from '@vicons/ionicons5';
import ContestItem from '@/components/ContestItem.vue';
import { useHomeworkList } from '@/composables/oj/useHomeworkList';
import { getColleges, getGrades, getClasses, getClassTeachers } from '@/utils/api';

const router = useRouter();
const searchKeyword = ref('');
const collegeId = ref<number | null>(null);
const grade = ref<string | null>(null);
const classId = ref<number | null>(null);
const teacherUid = ref<string | null>(null);
const collegeOptions = ref<Array<{ label: string; value: number }>>([]);
const gradeOptions = ref<Array<{ label: string; value: string }>>([]);
const allClasses = ref<Array<{ id: number; name: string; grade: string }>>([]);
const teacherClasses = ref<Record<string, number[]>>({});
const teacherNames = ref<Record<string, string>>({});
const teachersLoading = ref(false);
const classOptions = computed(() => allClasses.value.filter(item => !grade.value || item.grade === grade.value)
  .map(item => ({ label: `${item.name} (${item.grade})`, value: item.id })));
const teacherOptions = computed(() => Object.entries(teacherNames.value)
  .filter(([uid]) => (teacherClasses.value[uid] ?? []).some(id => classOptions.value.some(item => item.value === id)))
  .map(([uid, name]) => ({ label: name, value: uid })));
let filterSeq = 0;
watch(collegeId, async id => {
  const current = ++filterSeq;
  grade.value = null;
  classId.value = null;
  teacherUid.value = null;
  gradeOptions.value = [];
  allClasses.value = [];
  teacherClasses.value = {};
  teacherNames.value = {};
  if (!id) return;
  try {
    const grades = await getGrades(id);
    if (current !== filterSeq) return;
    gradeOptions.value = grades.map(item => ({ label: item.grade, value: item.grade }));
    const groups = await Promise.all(grades.map(async item => ({
      grade: item.grade, classes: await getClasses(id, item.grade),
    })));
    if (current === filterSeq) allClasses.value = groups.flatMap(group =>
      group.classes.map(item => ({ ...item, grade: group.grade })));
  } catch (cause) {
    if (current === filterSeq) listError.value = cause instanceof Error ? cause.message : '班级选项加载失败';
  }
});
watch(grade, () => { classId.value = null; teacherUid.value = null; teacherClasses.value = {}; teacherNames.value = {}; });
watch(classId, () => { teacherUid.value = null; });
const loadTeachers = async () => {
  if (!collegeId.value || teachersLoading.value || Object.keys(teacherClasses.value).length) return;
  const current = filterSeq;
  teachersLoading.value = true;
  try {
    const groups = await Promise.all(classOptions.value.map(async item => ({
      classId: item.value, teachers: await getClassTeachers(item.value),
    })));
    const classes: Record<string, number[]> = {};
    const names: Record<string, string> = {};
    for (const group of groups) for (const teacher of group.teachers) {
      (classes[teacher.uid] ??= []).push(group.classId);
      names[teacher.uid] = teacher.name;
    }
    if (current !== filterSeq) return;
    teacherClasses.value = classes;
    teacherNames.value = names;
  } catch (cause) {
    if (current === filterSeq) listError.value = cause instanceof Error ? cause.message : '教师选项加载失败';
  } finally { teachersLoading.value = false; }
};

// 列表逻辑
const { 
  loading: listLoading,
  error: listError,
  listData, 
  total, 
  page, 
  pageSize,
  fetchHomeworks 
} = useHomeworkList();

const selectedClassIds = () => {
  if (!collegeId.value) return undefined;
  let ids = classId.value ? [classId.value] : classOptions.value.map(item => item.value);
  if (teacherUid.value) ids = ids.filter(id => (teacherClasses.value[teacherUid.value!] ?? []).includes(id));
  return ids;
};
const handleSearch = () => {
  page.value = 1;
  void fetchHomeworks({ keyword: searchKeyword.value, classIds: selectedClassIds() });
};

const handlePageChange = (p: number) => {
  page.value = p;
  void fetchHomeworks({ keyword: searchKeyword.value, classIds: selectedClassIds() });
};

const handleItemClick = (id: string) => {
  router.push(`/homework/${id}`);
};

const resetFilters = () => {
  searchKeyword.value = '';
  collegeId.value = null;
  handleSearch();
};

onMounted(() => {
  void getColleges().then(items => { collegeOptions.value = items.map(item => ({ label: item.name, value: item.id })); })
    .catch(cause => { listError.value = cause instanceof Error ? cause.message : '学院选项加载失败'; });
  handleSearch();
});
</script>

<style scoped lang="less">
.homework-page-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

// 筛选卡片样式
.filter-card {
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);

  .filter-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #efeff5;
    
    .title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  }

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
      font-size: 14px;
      font-weight: 500;
      color: #666;
    }
  }

  .search-action {
    display: flex;
    gap: 8px;
    
    .search-btn {
      padding: 0 20px;
      font-weight: bold;
    }
  }
}

// 列表区域样式
.list-section {
  min-height: 400px;
  display: flex;
  flex-direction: column;

  .homework-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;

    .empty-state {
      margin-top: 60px;
      padding: 40px;
      background: #fff;
      border-radius: 8px;
    }
  }

  .pagination-footer {
    display: flex;
    justify-content: center;
    padding-bottom: 32px;
  }
}
</style>
