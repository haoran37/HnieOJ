import { ref, watch } from 'vue';

interface OptionItem {
  id: string | number;
  name: string;
}

export function useHomeworkFilters() {
  // 选中的值
  const selectedCollege = ref<string | null>(null);
  const selectedGrade = ref<string | null>(null);
  const selectedClass = ref<string | null>(null);
  const selectedTeacher = ref<string | null>(null);

  // 选项列表
  const colleges = ref<OptionItem[]>([]);
  const grades = ref<OptionItem[]>([]);
  const classes = ref<OptionItem[]>([]);
  const teachers = ref<OptionItem[]>([]);

  // 加载状态
  const loading = ref(false);

  // TODO: 替换真实api
  // 获取学院
  const fetchColleges = async () => {
    // 模拟 API: GET /api/colleges
    colleges.value = [
      { id: 1, name: "信息科学与工程学院" },
      { id: 2, name: "电气工程学院" },
      { id: 3, name: "土木工程学院" }
    ];
  };

  // 监听学院变化 -> 获取年级
  watch(selectedCollege, async (newVal) => {
    // 重置下游
    selectedGrade.value = null;
    selectedClass.value = null;
    selectedTeacher.value = null;
    grades.value = [];
    classes.value = [];
    teachers.value = [];

    if (newVal) {
      loading.value = true;
      // 模拟 API: GET /api/colleges/{id}/grades
      setTimeout(() => {
        grades.value = [
          { id: 2021, name: "2021级" },
          { id: 2022, name: "2022级" },
          { id: 2023, name: "2023级" }
        ];
        loading.value = false;
      }, 300);
    }
  });

  // 监听年级变化 -> 获取班级
  watch(selectedGrade, async (newVal) => {
    selectedClass.value = null;
    selectedTeacher.value = null;
    classes.value = [];
    teachers.value = [];

    if (newVal) {
      loading.value = true;
      // 模拟 API: GET /api/grades/{id}/classes
      setTimeout(() => {
        classes.value = [
          { id: 101, name: "软件工程 01班" },
          { id: 102, name: "软件工程 02班" },
          { id: 103, name: "计算机科学 01班" }
        ];
        loading.value = false;
      }, 300);
    }
  });

  // 监听班级变化 -> 获取教师
  watch(selectedClass, async (newVal) => {
    selectedTeacher.value = null;
    teachers.value = [];

    if (newVal) {
      loading.value = true;
      // 模拟 API: GET /api/classes/{id}/teachers
      setTimeout(() => {
        teachers.value = [
          { id: 8001, name: "王建国教授" },
          { id: 8002, name: "李晓华讲师" },
          { id: 8003, name: "张伟副教授" }
        ];
        loading.value = false;
      }, 300);
    }
  });

  // 转换成 Naive UI Select 的格式
  const mapOptions = (items: OptionItem[]) => items.map(i => ({ label: i.name, value: i.id }));

  return {
    selections: {
      college: selectedCollege,
      grade: selectedGrade,
      class_: selectedClass,
      teacher: selectedTeacher
    },
    options: {
      colleges: computed(() => mapOptions(colleges.value)),
      grades: computed(() => mapOptions(grades.value)),
      classes: computed(() => mapOptions(classes.value)),
      teachers: computed(() => mapOptions(teachers.value))
    },
    fetchColleges,
    loading
  };
}

import { computed } from 'vue';