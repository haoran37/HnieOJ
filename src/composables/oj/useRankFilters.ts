import { ref, watch, computed } from 'vue';
import { getClasses, getColleges, getGrades } from '@/utils/api';

export function useRankFilters() {
  const selectedCollege = ref<number | null>(null);
  const selectedGrade = ref<string | null>(null);
  const selectedClass = ref<number | null>(null);

  const colleges = ref<{ id: number; name: string }[]>([]);
  const grades = ref<{ grade: string }[]>([]);
  const classes = ref<{ id: number; name: string }[]>([]);

  const loading = ref(false);
  const error = ref<string | null>(null);

  let classSeq = 0;

  const fetchColleges = async () => {
    loading.value = true;
    error.value = null;
    try {
      colleges.value = (await getColleges()) ?? [];
    } catch (err) {
      colleges.value = [];
      error.value = err instanceof Error ? err.message : '学院列表加载失败';
    } finally {
      loading.value = false;
    }
  };

  watch(selectedCollege, async (newVal) => {
    selectedGrade.value = null;
    selectedClass.value = null;
    grades.value = [];
    classes.value = [];
    if (newVal) {
      loading.value = true;
      try {
        grades.value = (await getGrades(newVal)) ?? [];
      } catch (err) {
        grades.value = [];
        error.value = err instanceof Error ? err.message : '年级列表加载失败';
      } finally {
        loading.value = false;
      }
    }
  });

  watch(selectedGrade, async (newVal) => {
    selectedClass.value = null;
    classes.value = [];
    if (newVal && selectedCollege.value) {
      const current = ++classSeq;
      loading.value = true;
      try {
        const list = (await getClasses(selectedCollege.value, newVal)) ?? [];
        if (current !== classSeq) return;
        classes.value = list;
      } catch (err) {
        if (current !== classSeq) return;
        classes.value = [];
        error.value = err instanceof Error ? err.message : '班级列表加载失败';
      } finally {
        if (current === classSeq) loading.value = false;
      }
    }
  });

  return {
    selections: {
      college: selectedCollege,
      grade: selectedGrade,
      class_: selectedClass,
    },
    options: {
      colleges: computed(() => colleges.value.map((i) => ({ label: i.name, value: i.id }))),
      grades: computed(() => grades.value.map((i) => ({ label: i.grade, value: i.grade }))),
      classes: computed(() => classes.value.map((i) => ({ label: i.name, value: i.id }))),
    },
    fetchColleges,
    loading,
    error,
  };
}
