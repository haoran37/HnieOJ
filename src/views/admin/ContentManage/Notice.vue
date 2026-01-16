<template>
  <div class="notice-manage-page">
    <n-alert title="注意" type="warning">
      该功能还在不断优化中，如有问题请到 GitHub Issues 上提出
    </n-alert>
    <br>
    <n-card :bordered="false" title="通知管理">
      <template #header-extra>
        <n-button type="primary" @click="openCreateModal">
          <template #icon><n-icon>
              <MegaphoneOutline />
            </n-icon></template>
          发布新通知
        </n-button>
      </template>

      <n-data-table :columns="columns" :data="noticeList" :loading="loading" :pagination="pagination"
        :row-key="(row: any) => row.id" />
    </n-card>

    <n-modal v-model:show="showModal" preset="card" title="发布系统通知" style="width: 1400px; height: 85vh;"
      :mask-closable="false"
      :content-style="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }">
      <div class="modal-body-layout">

        <div class="left-panel">
          <div class="panel-scroll-content">
            <n-form label-placement="top" :model="formModel">
              <n-grid :x-gap="12" :cols="2">
                <n-grid-item>
                  <n-form-item label="通知标题" required>
                    <n-input v-model:value="formModel.title" placeholder="请输入标题" />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item>
                  <n-form-item label="通知类型" required>
                    <n-select v-model:value="formModel.type" :options="typeOptions" />
                  </n-form-item>
                </n-grid-item>
              </n-grid>

              <n-divider style="margin: 8px 0 16px 0" />

              <n-form-item label="发送范围" required>
                <n-radio-group v-model:value="formModel.targetMode">
                  <n-space vertical>
                    <n-radio value="BROADCAST_ROLE">按角色广播</n-radio>
                    <n-radio value="BROADCAST_COLLEGE">按学院广播</n-radio>
                    <n-radio value="BROADCAST_MAJOR">按专业广播</n-radio>
                    <n-radio value="BROADCAST_CLASS">按班级广播</n-radio>
                    <n-radio value="SPECIFIC_USER">选择特定用户</n-radio>
                  </n-space>
                </n-radio-group>
              </n-form-item>

              <div class="dynamic-selection-area">

                <div v-if="formModel.targetMode === 'BROADCAST_ROLE'">
                  <n-checkbox-group v-model:value="formModel.selectedRoles">
                    <n-space>
                      <n-checkbox value="STUDENT" label="全体学生" />
                      <n-checkbox value="TA" label="全体助教" />
                      <n-checkbox value="TEACHER" label="全体教师" />
                      <n-checkbox value="ADMIN" label="全体管理" />
                    </n-space>
                  </n-checkbox-group>
                </div>

                <div v-else-if="formModel.targetMode === 'BROADCAST_COLLEGE'">
                  <div class="scrollable-checkbox-group">
                    <n-checkbox-group v-model:value="broadcastState.selectedCollegeIds">
                      <n-grid :cols="1" :y-gap="8">
                        <n-grid-item v-for="col in broadcastState.colleges" :key="col.value">
                          <n-checkbox :value="col.value" :label="col.label" />
                        </n-grid-item>
                      </n-grid>
                    </n-checkbox-group>
                  </div>
                </div>

                <div v-else-if="formModel.targetMode === 'BROADCAST_MAJOR'">
                  <n-form-item label="先选择学院" :show-label="false" class="mb-2">
                    <n-select v-model:value="broadcastState.filterCollegeId" :options="broadcastState.colleges"
                      placeholder="请选择学院" @update:value="(v: string | null) => fetchMajors(v, 'BROADCAST')" />
                  </n-form-item>
                  <n-card size="small" embedded v-if="broadcastState.filterCollegeId" class="compact-card">
                    <div class="scrollable-checkbox-group">
                      <n-checkbox-group v-model:value="broadcastState.selectedMajorIds">
                        <n-space vertical>
                          <n-checkbox v-for="m in broadcastState.majors" :key="m.value" :value="m.value"
                            :label="m.label" />
                        </n-space>
                      </n-checkbox-group>
                    </div>
                  </n-card>
                </div>

                <div v-else-if="formModel.targetMode === 'BROADCAST_CLASS'">
                  <n-space vertical class="mb-2" :size="12">
                    <n-select v-model:value="broadcastState.filterCollegeId" :options="broadcastState.colleges"
                      placeholder="请选择学院" @update:value="(v: string | null) => fetchMajors(v, 'BROADCAST')" />
                    <n-select v-model:value="broadcastState.filterMajorId" :options="broadcastState.majors"
                      placeholder="请选择专业" :disabled="!broadcastState.filterCollegeId"
                      @update:value="(v: string | null) => fetchClasses(v, 'BROADCAST')" />
                  </n-space>
                  <n-card size="small" embedded v-if="broadcastState.filterMajorId" class="compact-card">
                    <div class="scrollable-checkbox-group">
                      <n-checkbox-group v-model:value="broadcastState.selectedClassIds">
                        <n-space vertical>
                          <n-checkbox v-for="c in broadcastState.classes" :key="c.value" :value="c.value"
                            :label="c.label" />
                        </n-space>
                      </n-checkbox-group>
                    </div>
                  </n-card>
                </div>

                <div v-else-if="formModel.targetMode === 'SPECIFIC_USER'">
                  <n-space class="mb-2">
                    <n-button size="small" dashed type="info" @click="openStudentModal">
                      <template #icon><n-icon>
                          <SchoolOutline />
                        </n-icon></template>
                      添加学生
                    </n-button>
                    <n-button size="small" dashed type="success" @click="openStaffModal">
                      <template #icon><n-icon>
                          <BriefcaseOutline />
                        </n-icon></template>
                      添加教职工
                    </n-button>
                  </n-space>
                  <div class="user-tags-wrapper">
                    <n-empty v-if="!formModel.selectedSpecificUsers.length" description="暂未选择用户" size="small" />
                    <n-space v-else :size="[4, 4]">
                      <n-tag v-for="(u, idx) in formModel.selectedSpecificUsers" :key="u.value" closable size="small"
                        :type="getRoleColor(u.role)" @close="removeUserTag(idx)">
                        {{ u.name }}
                      </n-tag>
                    </n-space>
                  </div>
                </div>

              </div>
            </n-form>
          </div>
        </div>

        <div class="right-panel">
          <div class="editor-header">通知内容*</div>
          <div class="editor-wrapper">
            <v-md-editor v-model="formModel.content" height="100%" placeholder="请输入通知内容..." />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="loading" @click="handleSubmit">确认发布</n-button>
        </n-space>
      </div>
    </n-modal>

    <n-modal v-model:show="showStudentModal" preset="card" title="添加学生" style="width: 800px;">
      <n-space vertical>
        <n-grid :x-gap="8" :cols="3">
          <n-grid-item>
            <n-select v-model:value="studentState.college" :options="studentState.colleges" placeholder="学院"
              @update:value="(v: string | null) => fetchMajors(v, 'STUDENT')" />
          </n-grid-item>
          <n-grid-item>
            <n-select v-model:value="studentState.major" :options="studentState.majors" placeholder="专业"
              :disabled="!studentState.college" @update:value="(v: string | null) => fetchClasses(v, 'STUDENT')" />
          </n-grid-item>
          <n-grid-item>
            <n-select v-model:value="studentState.classId" :options="studentState.classes" placeholder="班级"
              :disabled="!studentState.major" @update:value="fetchStudents" />
          </n-grid-item>
        </n-grid>
        <n-transfer v-model:value="studentState.tempSelectedIds" :options="studentTransferOptions" source-title="可选学生"
          target-title="已选学生" filterable virtual-scroll style="height: 400px" />
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showStudentModal = false">取消</n-button>
          <n-button type="primary" @click="confirmAddStudents">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showStaffModal" preset="card" title="添加教职工" style="width: 700px;">
      <n-space justify="space-between" align="center" class="mb-2">
        <n-radio-group v-model:value="staffState.activeTab" size="medium" @update:value="fetchStaffList">
          <n-space>
            <n-radio-button value="TEACHER" label="教师" />
            <n-radio-button value="TA" label="助教" />
            <n-radio-button value="ADMIN" label="管理员" />
          </n-space>
        </n-radio-group>

        <n-input v-model:value="staffState.keyword" placeholder="搜索姓名 (回车)" style="width: 200px"
          @keyup.enter="fetchStaffList">
          <template #suffix><n-icon>
              <SearchOutline />
            </n-icon></template>
        </n-input>
      </n-space>

      <div class="staff-select-box">
        <n-checkbox-group v-if="staffState.activeTab === 'TEACHER'" v-model:value="staffState.tempSelectedTeachers">
          <n-grid :cols="2" :y-gap="10">
            <n-grid-item v-for="u in staffState.teachersList" :key="u.value">
              <n-checkbox :value="u.value" :label="u.label" />
            </n-grid-item>
          </n-grid>
        </n-checkbox-group>
        <n-checkbox-group v-if="staffState.activeTab === 'TA'" v-model:value="staffState.tempSelectedTAs">
          <n-grid :cols="2" :y-gap="10">
            <n-grid-item v-for="u in staffState.tasList" :key="u.value">
              <n-checkbox :value="u.value" :label="u.label" />
            </n-grid-item>
          </n-grid>
        </n-checkbox-group>
        <n-checkbox-group v-if="staffState.activeTab === 'ADMIN'" v-model:value="staffState.tempSelectedAdmins">
          <n-grid :cols="2" :y-gap="10">
            <n-grid-item v-for="u in staffState.adminsList" :key="u.value">
              <n-checkbox :value="u.value" :label="u.label" />
            </n-grid-item>
          </n-grid>
        </n-checkbox-group>
      </div>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showStaffModal = false">取消</n-button>
          <n-button type="primary" @click="confirmAddStaff">确定添加所有选中</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDetailModal" preset="card" title="详情" style="width: 700px">
      <div v-if="currentDetail">
        <div class="detail-header">
          <h2 class="detail-title">
            <n-tag :type="getTypeTag(currentDetail.type)" class="mr-2">{{ currentDetail.type }}</n-tag>
            {{ currentDetail.title }}
          </h2>
          <div class="detail-meta">
            <span><n-icon>
                <PersonOutline />
              </n-icon> {{ currentDetail.publisher }}</span>
            <span><n-icon>
                <TimeOutline />
              </n-icon> {{ formatFullTime(currentDetail.publishTime) }}</span>
          </div>
        </div>
        <n-divider />
        <div class="detail-target-section">
          <div class="label mb-1">接收对象 ({{ currentDetail.targetSummary }})：</div>
          <div class="target-list-box">
            <n-scrollbar style="max-height: 150px">
              <n-space :size="[6, 6]" v-if="currentDetail.targetDetailList?.length">
                <n-tag v-for="name in currentDetail.targetDetailList" :key="name" size="small" :bordered="false"
                  type="info">
                  {{ name }}
                </n-tag>
              </n-space>
              <span v-else class="text-gray">加载中或无详细列表...</span>
            </n-scrollbar>
          </div>
        </div>
        <n-divider />
        <div class="detail-content">
          <v-md-preview :text="currentDetail.content" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import {
  NTag, NButton, type DataTableColumns, NIcon, type TagProps
} from 'naive-ui';
import {
  MegaphoneOutline, EyeOutline, PersonOutline, TimeOutline,
  SchoolOutline, BriefcaseOutline, SearchOutline
} from '@vicons/ionicons5';
import { useNotice, type SystemNotice, type UserRole } from '@/composables/admin/useNotice';

const {
  loading, showModal, showStudentModal, showStaffModal, showDetailModal,
  noticeList, formModel, broadcastState, studentState, staffState, studentTransferOptions,
  currentDetail,
  fetchMajors, fetchClasses, fetchStudents, fetchStaffList,
  openCreateModal, openStudentModal, openStaffModal,
  confirmAddStudents, confirmAddStaff, removeUserTag,
  handleSubmit, openDetailModal, formatFullTime
} = useNotice();

const pagination = { pageSize: 10 };

const typeOptions = [
  { label: '系统通知', value: 'SYSTEM' },
  { label: '紧急通知', value: 'URGENT' },
  { label: '活动通知', value: 'ACTIVITY' },
  { label: '教务通知', value: 'ACADEMIC' }
];

const getRoleColor = (role: UserRole): TagProps['type'] => {
  switch (role) {
    case 'STUDENT': return 'info';
    case 'TA': return 'warning';
    case 'TEACHER': return 'success';
    case 'ADMIN': return 'error';
    default: return 'default';
  }
}

const getTypeTag = (type: string) => {
  switch (type) {
    case 'URGENT': return 'error';
    case 'SYSTEM': return 'info';
    case 'ACADEMIC': return 'warning';
    default: return 'success';
  }
};

const columns: DataTableColumns<SystemNotice> = [
  { title: '序号', key: 'index', width: 60, render: (_, i) => i + 1 },
  { title: '标题', key: 'title', width: 250, ellipsis: { tooltip: true } },
  { title: '类型', key: 'type', width: 100, render: (row) => h(NTag, { size: 'small', bordered: false, type: getTypeTag(row.type) }, () => row.type) },
  { title: '接收对象', key: 'targetSummary', width: 220, ellipsis: { tooltip: true } },
  { title: '发布者', key: 'publisher', width: 100 },
  { title: '发布时间', key: 'publishTime', width: 160, render: (row) => formatFullTime(row.publishTime) },
  {
    title: '操作', key: 'actions', width: 100, fixed: 'right',
    render(row) {
      return h(NButton, {
        size: 'tiny', secondary: true, type: 'primary',
        onClick: () => openDetailModal(row)
      }, { icon: () => h(EyeOutline), default: () => '详情' });
    }
  }
];
</script>

<style scoped lang="less">
.detail-content {
  :deep(.github-markdown-body) {
    padding: 0 !important; 
  }
}

.modal-body-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  width: 420px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f9f9f9;
  overflow: hidden;
}

.editor-header {
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  flex-shrink: 0;
}

.editor-wrapper {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.dynamic-selection-area {
  background-color: #fafafc;
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 4px;
  min-height: 100px;
}

.scrollable-checkbox-group {
  max-height: 250px;
  overflow-y: auto;
  padding: 4px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.user-tags-wrapper {
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  background: #fff;
  flex-shrink: 0;
  z-index: 10;
}

.staff-select-box {
  height: 350px;
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 16px;
  border-radius: 4px;
  background: #fafafc;
}

.mb-2 {
  margin-bottom: 8px;
}

.text-gray {
  color: #999;
  font-size: 12px;
}

// 详情页样式
.detail-header {
  .detail-title {
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
  }

  .detail-meta {
    font-size: 13px;
    color: #999;
    display: flex;
    gap: 16px;

    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.detail-target-section {
  .label {
    font-weight: bold;
    color: #666;
    font-size: 14px;
  }

  .target-list-box {
    background: #f5f7fa;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #eee;
  }
}
</style>