import { ref, watch, computed } from 'vue';

interface OptionItem {
  id: string | number;
  name: string;
}

export function useRankFilters() {
  const selectedCollege = ref<string | null>(null);
  const selectedGrade = ref<string | null>(null);
  const selectedClass = ref<string | null>(null);

  const colleges = ref<OptionItem[]>([]);
  const grades = ref<OptionItem[]>([]);
  const classes = ref<OptionItem[]>([]);

  const loading = ref(false);

  // 获取所有学院
  const fetchColleges = async () => {
    //TODO: 替换真实api
    // GET /api/colleges
    colleges.value = [
      { id: 1, name: "信息科学与工程学院" },
      { id: 2, name: "电气工程学院" },
      { id: 3, name: "文学院" }
    ];
  };

  // 监听学院变化 -> 获取年级
  watch(selectedCollege, (newVal) => {
    // 重置下游
    selectedGrade.value = null;
    selectedClass.value = null;
    grades.value = [];
    classes.value = [];

    if (newVal) {
      loading.value = true;
      //TODO: GET /api/colleges/{id}/grades
      setTimeout(() => {
        grades.value = [
          { id: 2021, name: "2021级" },
          { id: 2022, name: "2022级" },
          { id: 2023, name: "2023级" },
          { id: 2024, name: "2024级" }
        ];
        loading.value = false;
      }, 200);
    }
  });

  // 监听年级变化 -> 获取班级
  watch(selectedGrade, (newVal) => {
    selectedClass.value = null;
    classes.value = [];

    if (newVal) {
      loading.value = true;
      //TODO: GET /api/grades/{id}/classes
      setTimeout(() => {
        classes.value = [
          { id: 1001, name: "计算机2201" },
          { id: 1002, name: "计算机2202" },
          { id: 1003, name: "软件工程2201" },
          { id: 1004, name: "人工智能2201" }
        ];
        loading.value = false;
      }, 200);
    }
  });

  // 转换成 Naive UI 格式
  const mapOptions = (items: OptionItem[]) => items.map(i => ({ label: i.name, value: i.id }));

  return {
    selections: {
      college: selectedCollege,
      grade: selectedGrade,
      class_: selectedClass
    },
    options: {
      colleges: computed(() => mapOptions(colleges.value)),
      grades: computed(() => mapOptions(grades.value)),
      classes: computed(() => mapOptions(classes.value))
    },
    fetchColleges,
    loading
  };
}