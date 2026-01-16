<template>
  <div class="announcement-page">
    <n-space vertical size="large">
      
      <n-card :bordered="false" title="普通公告管理">
        <template #header-extra>
          <n-button type="primary" @click="openCreateModal">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新建普通公告
          </n-button>
        </template>

        <n-data-table
          :columns="columns"
          :data="generalAnnouncements"
          :pagination="pagination"
          :loading="loading"
          :row-key="(row: GeneralAnnouncement) => row.id" 
        />
      </n-card>

      <n-card :bordered="false" title="新用户欢迎页配置">
        <template #header-extra>
          <n-switch v-model:value="newUserConfig.enabled" size="large">
            <template #checked>功能已开启</template>
            <template #unchecked>功能已关闭</template>
          </n-switch>
        </template>

        <div class="new-user-section">
          <n-alert type="info" show-icon class="mb-4" :bordered="false">
            开启后，新注册的用户在首次登录时，系统将自动弹出此欢迎公告。
          </n-alert>

          <n-form
            :disabled="!newUserConfig.enabled"
            label-placement="top"
            class="mt-4"
            style="max-width: 100%"
          >
            <n-form-item label="公告内容">
              <n-input
                v-model:value="newUserConfig.content"
                type="textarea"
                placeholder="支持 Markdown 语法..."
                :autosize="{ minRows: 6, maxRows: 12 }"
              />
            </n-form-item>

            <n-form-item label="交互设置">
              <n-space align="center">
                <span>强制确认已读：</span>
                <n-switch v-model:value="newUserConfig.requireRead" />
                <span class="tip-text">（开启后，用户必须点击“我已阅读”按钮才能关闭弹窗）</span>
              </n-space>
            </n-form-item>

            <div class="form-footer">
               <n-button 
                type="primary" 
                size="medium" 
                :loading="savingConfig"
                :disabled="!newUserConfig.enabled"
                @click="saveNewUserConfig"
              >
                保存配置
              </n-button>
            </div>
          </n-form>
        </div>
      </n-card>

    </n-space>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="modalTitle"
      style="width: 600px"
    >
      <n-form
        ref="formRef"
        :model="formModel"
        :rules="rules"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="公告标题" path="title">
          <n-input v-model:value="formModel.title" placeholder="请输入标题" />
        </n-form-item>

        <n-form-item label="公告类型" path="type">
          <n-radio-group v-model:value="formModel.type">
            <n-radio-button value="NORMAL">普通通知</n-radio-button>
            <n-radio-button value="MAINTENANCE">系统维护</n-radio-button>
            <n-radio-button value="CONTEST">比赛相关</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="生效时间" path="dateRange">
          <n-date-picker
            v-model:value="formModel.dateRange"
            type="datetimerange"
            clearable
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item label="强制确认" path="requireRead">
          <n-switch v-model:value="formModel.requireRead" />
        </n-form-item>

        <n-form-item label="内容" path="content">
          <n-input
            v-model:value="formModel.content"
            type="textarea"
            placeholder="支持 Markdown..."
            :autosize="{ minRows: 5, maxRows: 10 }"
          />
        </n-form-item>
      </n-form>
      
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmit">提交</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
//TODO: 支持markdown
import { computed, h, ref } from 'vue';
import { 
  NTag, NButton, NSpace, NPopconfirm, NSwitch, NTooltip 
} from 'naive-ui';
import { 
  AddOutline, CreateOutline, TrashOutline, PowerOutline
} from '@vicons/ionicons5';
import type { DataTableColumns } from 'naive-ui';
import { useAnnouncement, type GeneralAnnouncement } from '@/composables/admin/useAnnouncement';
import { formatFullTime } from '@/composables/useTime';

const {
  loading,
  savingConfig,
  showModal,
  modalMode,
  newUserConfig,
  generalAnnouncements,
  formModel,
  openCreateModal,
  handleEdit,
  toggleActive,
  handleSubmit,
  handleDelete,
  saveNewUserConfig,
  getStatus
} = useAnnouncement();

const formRef = ref(null);
const rules = {
  title: { required: true, message: '请输入标题', trigger: 'blur' },
  content: { required: true, message: '请输入内容', trigger: 'blur' }
};

const modalTitle = computed(() => modalMode.value === 'create' ? '新建公告' : '编辑公告');
const pagination = { pageSize: 5 };

// --- 表格列定义 ---
const columns: DataTableColumns<GeneralAnnouncement> = [
  { title: '标题', key: 'title', width: 220, ellipsis: { tooltip: true } },
  { 
    title: '类型', 
    key: 'type', 
    width: 90,
    render(row) {
      const map: Record<string, string> = { NORMAL: '普通', MAINTENANCE: '维护', CONTEST: '比赛' };
      return h(NTag, { bordered: false, size: 'small' }, () => map[row.type] || row.type);
    }
  },
  {
    title: '生效时间范围',
    key: 'time',
    width: 240,
    render(row) {
      if (!row.startTime || !row.endTime) return '永久有效';
      return h('div', { class: 'time-cell' }, [
        h('div', { class: 'time-row' }, [
          h('span', { class: 'time-label' }, 'begin: '),
          h('span', { class: 'time-value' }, formatFullTime(row.startTime)) 
        ]),
        h('div', { class: 'time-row' }, [
          h('span', { class: 'time-label' }, 'end: '),
          h('span', { class: 'time-value' }, formatFullTime(row.endTime))
        ])
      ]);
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row) {
      const status = getStatus(row);
      return h(NTag, { type: status.type, bordered: false, size: 'small' }, () => status.label);
    }
  },
  {
    title: '更新时间',
    key: 'updateTime',
    width: 160,
    render(row) {
      return formatFullTime(row.updateTime);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row) {
      const status = getStatus(row);
      return h(NSpace, { align: 'center' }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () => h(NButton, {
              size: 'tiny',
              secondary: true,
              disabled: status.isExpired, 
              type: row.isDisabled ? 'success' : 'warning',
              onClick: () => toggleActive(row)
            }, { icon: () => h(PowerOutline) }),
            default: () => {
              if (status.isExpired) return '公告已过期，无法操作';
              return row.isDisabled ? '点击激活' : '点击停用';
            }
          }),
          h(NButton, { 
            size: 'tiny', 
            secondary: true, 
            type: 'primary',
            onClick: () => handleEdit(row)
          }, { icon: () => h(CreateOutline) }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row.id)
          }, {
            trigger: () => h(NButton, { size: 'tiny', secondary: true, type: 'error' }, { icon: () => h(TrashOutline) }),
            default: () => '确定删除吗？'
          })
        ]
      });
    }
  }
];
</script>

<style scoped lang="less">
.tip-text {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }

.form-footer {
  display: flex;
  justify-content: flex-end;
}

:deep(.time-cell) {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  
  .time-row {
    display: flex;
    align-items: center;
  }

  .time-label {
    color: #999;
    margin-right: 4px;
    width: 40px;
    text-align: right;
  }
  
  .time-value {
    color: #333;
  }
}
</style>