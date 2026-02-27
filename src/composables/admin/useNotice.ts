import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import { formatFullTime } from '@/composables/useTime';

// 类型定义
export type NoticeType = 'SYSTEM' | 'URGENT' | 'ACTIVITY' | 'ACADEMIC';
export type TargetMode = 
  | 'BROADCAST_ROLE'    
  | 'BROADCAST_COLLEGE' 
  | 'BROADCAST_MAJOR'   
  | 'BROADCAST_CLASS'   
  | 'SPECIFIC_USER';    

export type UserRole = 'STUDENT' | 'TA' | 'TEACHER' | 'ADMIN';

export interface OptionNode {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface UserNode {
  id: string;
  name: string;
  role: UserRole;
  label: string;
  value: string;
}

export interface SystemNotice {
  id: string;
  title: string;
  type: NoticeType;
  content: string;
  targetMode: TargetMode;
  targetSummary: string; // 目标对象摘要
  publisher: string;
  publishTime: number;
  targetDetailList?: string[]; // 目标对象完整列表
}

export function useNotice() {
  const message = useMessage();
  const loading = ref(false);
  
  // 模态框状态
  const showModal = ref(false);
  const showDetailModal = ref(false);
  const showStudentModal = ref(false);
  const showStaffModal = ref(false);

  //TODO: 从后端获取数据
  // Mock
  const noticeList = ref<SystemNotice[]>([
    {
      id: '1',
      title: '关于端午节放假的通知',
      type: 'SYSTEM',
      content: '# 放假通知\n\n全体师生...',
      targetMode: 'BROADCAST_ROLE',
      targetSummary: '角色: 学生, 教师',
      publisher: 'Admin',
      publishTime: Date.now() - 86400000,
      targetDetailList: ['全体学生', '全体教师']
    }
  ]);

  // 表单数据
  const formModel = reactive({
    title: '',
    type: 'SYSTEM' as NoticeType,
    content: '',
    targetMode: 'BROADCAST_ROLE' as TargetMode,
    selectedRoles: [] as UserRole[],
    selectedSpecificUsers: [] as UserNode[] 
  });

  const currentDetail = ref<SystemNotice | null>(null);

  // --- 广播模式筛选状态 ---
  const broadcastState = reactive({
    colleges: [] as OptionNode[],
    majors: [] as OptionNode[], 
    classes: [] as OptionNode[], 
    
    selectedCollegeIds: [] as string[], 
    filterCollegeId: null as string | null, 
    selectedMajorIds: [] as string[],       
    filterMajorId: null as string | null,   
    selectedClassIds: [] as string[]        
  });

  // --- 教职工选择状态 ---
  const staffState = reactive({
    activeTab: 'TEACHER' as 'TEACHER' | 'TA' | 'ADMIN',
    keyword: '',
    teachersList: [] as UserNode[],
    tasList: [] as UserNode[],
    adminsList: [] as UserNode[],
    tempSelectedTeachers: [] as string[],
    tempSelectedTAs: [] as string[],
    tempSelectedAdmins: [] as string[],
  });

  // --- 学生筛选状态 ---
  const studentState = reactive({
    college: null,
    major: null,
    classId: null,
    colleges: [] as OptionNode[],
    majors: [] as OptionNode[],
    classes: [] as OptionNode[],
    students: [] as UserNode[], 
    tempSelectedIds: [] as string[] 
  });
  const studentTransferOptions = ref<UserNode[]>([]);

  //TODO: 替换真实api

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchColleges = async () => {
    await delay(200);
    const data = [
      { label: '计算机与信息工程学院', value: 'c1' },
      { label: '电气工程学院', value: 'c2' },
      { label: '机械工程学院', value: 'c3' },
      { label: '外国语学院', value: 'c4' },
      { label: '设计艺术学院', value: 'c5' }
    ];
    broadcastState.colleges = data;
    studentState.colleges = data;
  };

  const fetchMajors = async (collegeId: string | null, target: 'BROADCAST' | 'STUDENT') => {
    if (!collegeId) {
      if (target === 'BROADCAST') broadcastState.majors = [];
      else studentState.majors = [];
      return;
    }
    await delay(200);
    const prefix = collegeId === 'c1' ? '计算机' : '电气'; 
    const data = [
      { label: `${prefix}专业01`, value: `${collegeId}_m1` },
      { label: `${prefix}专业02`, value: `${collegeId}_m2` },
      { label: `${prefix}专业03`, value: `${collegeId}_m3` }
    ];
    
    if (target === 'BROADCAST') {
      broadcastState.majors = data;
      broadcastState.selectedMajorIds = []; 
      broadcastState.filterMajorId = null;
    } else {
      studentState.majors = data;
      studentState.major = null;
    }
  };

  const fetchClasses = async (majorId: string | null, target: 'BROADCAST' | 'STUDENT') => {
    if (!majorId) {
      if (target === 'BROADCAST') broadcastState.classes = [];
      else studentState.classes = [];
      return;
    }
    await delay(200);
    const data = Array.from({ length: 15 }).map((_, i) => ({
      label: `22级${i + 1}班`,
      value: `${majorId}_cl${i}`
    }));
    
    if (target === 'BROADCAST') {
      broadcastState.classes = data;
      broadcastState.selectedClassIds = [];
    } else {
      studentState.classes = data;
      studentState.classId = null;
    }
  };

  const fetchStudents = async () => {
    if (!studentState.classId) return;
    await delay(200);
    const list = Array.from({ length: 20 }).map((_, i) => ({
      id: `stu_${studentState.classId}_${i}`,
      name: `学生${i + 1}`,
      role: 'STUDENT' as UserRole,
      label: `学生${i + 1}`,
      value: `stu_${studentState.classId}_${i}`
    }));
    
    // 合并 Options 以便回显
    const merged = new Map(studentTransferOptions.value.map(i => [i.value, i]));
    list.forEach(i => merged.set(i.value, i));
    studentTransferOptions.value = Array.from(merged.values());
    
    studentState.students = list;
  };

  const fetchStaffList = async () => {
    const role = staffState.activeTab;
    const keyword = staffState.keyword;
    await delay(200);
    const list = Array.from({ length: 15 }).map((_, i) => ({
      id: `${role}_${i}`,
      name: `${role}_${i + 1}`,
      role: role as UserRole,
      label: `${role}_${i + 1}`,
      value: `${role}_${i}`
    })).filter(u => u.name.includes(keyword));
    
    if (role === 'TEACHER') staffState.teachersList = list;
    else if (role === 'TA') staffState.tasList = list;
    else staffState.adminsList = list;
  };

  // ================= Actions =================

  const openCreateModal = () => {
    formModel.title = '';
    formModel.content = '';
    formModel.type = 'SYSTEM';
    formModel.targetMode = 'BROADCAST_ROLE';
    formModel.selectedRoles = [];
    formModel.selectedSpecificUsers = [];
    
    // 重置广播状态
    broadcastState.selectedCollegeIds = [];
    broadcastState.selectedMajorIds = [];
    broadcastState.selectedClassIds = [];
    broadcastState.filterCollegeId = null;
    broadcastState.filterMajorId = null;

    fetchColleges();
    showModal.value = true;
  };

  const openStudentModal = () => {
    studentState.college = null;
    studentState.major = null;
    studentState.classId = null;
    studentState.students = [];
    const currentStudents = formModel.selectedSpecificUsers.filter(u => u.role === 'STUDENT');
    studentState.tempSelectedIds = currentStudents.map(u => u.value);
    studentTransferOptions.value = [...currentStudents];
    showStudentModal.value = true;
  };

  const openStaffModal = () => {
    staffState.activeTab = 'TEACHER';
    staffState.keyword = '';
    staffState.tempSelectedTeachers = formModel.selectedSpecificUsers.filter(u => u.role === 'TEACHER').map(u => u.value);
    staffState.tempSelectedTAs = formModel.selectedSpecificUsers.filter(u => u.role === 'TA').map(u => u.value);
    staffState.tempSelectedAdmins = formModel.selectedSpecificUsers.filter(u => u.role === 'ADMIN').map(u => u.value);
    fetchStaffList();
    showStaffModal.value = true;
  };

  const confirmAddStudents = () => {
    const selectedNodes = studentTransferOptions.value.filter(u => studentState.tempSelectedIds.includes(u.value));
    const others = formModel.selectedSpecificUsers.filter(u => u.role !== 'STUDENT');
    formModel.selectedSpecificUsers = [...others, ...selectedNodes];
    showStudentModal.value = false;
  };

  const confirmAddStaff = () => {
    const _teachers = staffState.teachersList.filter(u => staffState.tempSelectedTeachers.includes(u.value));
    const _tas = staffState.tasList.filter(u => staffState.tempSelectedTAs.includes(u.value));
    const _admins = staffState.adminsList.filter(u => staffState.tempSelectedAdmins.includes(u.value));
    
    const preserveSelected = (currentList: UserNode[], tempIds: string[], role: UserRole) => {
      const selectedInList = currentList.filter(u => tempIds.includes(u.value));
      const prevSelected = formModel.selectedSpecificUsers.filter(
        u => u.role === role && tempIds.includes(u.value) && !currentList.find(c => c.value === u.value)
      );
      return [...selectedInList, ...prevSelected];
    };

    const newTeachers = preserveSelected(staffState.teachersList, staffState.tempSelectedTeachers, 'TEACHER');
    const newTAs = preserveSelected(staffState.tasList, staffState.tempSelectedTAs, 'TA');
    const newAdmins = preserveSelected(staffState.adminsList, staffState.tempSelectedAdmins, 'ADMIN');

    const students = formModel.selectedSpecificUsers.filter(u => u.role === 'STUDENT');
    formModel.selectedSpecificUsers = [...students, ...newTeachers, ...newTAs, ...newAdmins];
    showStaffModal.value = false;
  };

  const removeUserTag = (index: number) => {
    formModel.selectedSpecificUsers.splice(index, 1);
  };

  // --- 辅助函数：根据ID列表获取名称列表 ---
  const getNamesByIds = (ids: string[], source: OptionNode[]) => {
    return source.filter(item => ids.includes(item.value)).map(item => item.label);
  };

  const generateSummary = (names: string[], suffix: string) => {
    const count = names.length;
    const preview = names.slice(0, 3).join(', '); // 只展示前3个名字
    return count > 3 ? `${preview} 等 ${count} ${suffix}` : `${preview} (${count} ${suffix})`;
  };

  // --- 提交表单 ---
  const handleSubmit = async () => {
    if (!formModel.title || !formModel.content) {
      message.warning('请填写标题和内容');
      return;
    }

    let summary = '';
    let detailList: string[] = []; // 完整名单
    let valid = false;

    switch (formModel.targetMode) {
      case 'BROADCAST_ROLE':
        if (formModel.selectedRoles.length > 0) {
          const roleMap: Record<string, string> = { STUDENT: '学生', TEACHER: '教师', TA: '助教', ADMIN: '管理员' };
          const names = formModel.selectedRoles.map(r => roleMap[r]);
          summary = `角色广播: ${names.join(', ')}`;
          detailList = names.map(n => `全体${n}`);
          valid = true;
        }
        break;

      case 'BROADCAST_COLLEGE':
        if (broadcastState.selectedCollegeIds.length > 0) {
          const names = getNamesByIds(broadcastState.selectedCollegeIds, broadcastState.colleges);
          summary = `学院: ${generateSummary(names, '个学院')}`;
          detailList = names;
          valid = true;
        }
        break;

      case 'BROADCAST_MAJOR':
        if (broadcastState.selectedMajorIds.length > 0) {
          const names = getNamesByIds(broadcastState.selectedMajorIds, broadcastState.majors);
          summary = `专业: ${generateSummary(names, '个专业')}`;
          detailList = names;
          valid = true;
        }
        break;

      case 'BROADCAST_CLASS':
        if (broadcastState.selectedClassIds.length > 0) {
          const names = getNamesByIds(broadcastState.selectedClassIds, broadcastState.classes);
          summary = `班级: ${generateSummary(names, '个班级')}`;
          detailList = names;
          valid = true;
        }
        break;

      case 'SPECIFIC_USER':
        if (formModel.selectedSpecificUsers.length > 0) {
          const names = formModel.selectedSpecificUsers.map(u => u.name);
          summary = `特定用户: ${generateSummary(names, '人')}`;
          detailList = formModel.selectedSpecificUsers.map(u => `${u.name} (${u.role})`);
          valid = true;
        }
        break;
    }

    if (!valid) {
      message.warning('请至少选择一个发送对象');
      return;
    }

    //TODO: 使用真实api
    loading.value = true;
    await delay(600); // 模拟提交延迟

    const newNotice: SystemNotice = {
      id: Date.now().toString(),
      title: formModel.title,
      type: formModel.type,
      content: formModel.content,
      targetMode: formModel.targetMode,
      targetSummary: summary,
      targetDetailList: detailList, // 存入完整名单
      publisher: 'Admin',
      publishTime: Date.now()
    };

    noticeList.value.unshift(newNotice);
    message.success('发布成功');
    showModal.value = false;
    loading.value = false;
  };

  const openDetailModal = (row: SystemNotice) => {
    currentDetail.value = row;
    if (!row.targetDetailList) {
      currentDetail.value.targetDetailList = [row.targetSummary];
    }
    showDetailModal.value = true;
  };

  return {
    loading, showModal, showDetailModal, showStudentModal, showStaffModal,
    noticeList, formModel, broadcastState, studentState, staffState, studentTransferOptions,
    currentDetail,
    
    fetchColleges, fetchMajors, fetchClasses, fetchStudents, fetchStaffList,
    openCreateModal, openStudentModal, openStaffModal,
    confirmAddStudents, confirmAddStaff, removeUserTag,
    handleSubmit, openDetailModal, formatFullTime
  };
}
