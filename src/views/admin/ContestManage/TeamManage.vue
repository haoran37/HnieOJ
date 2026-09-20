<template>
  <div class="team-manage-container">
    <n-card :bordered="false">
      <div class="header">
        <div class="title">比赛队伍管理</div>
        <n-space>
          <n-popconfirm @positive-click="handleBatchDelete" :disabled="checkedRowKeys.length === 0">
            <template #trigger>
              <n-button type="error" :disabled="checkedRowKeys.length === 0">
                批量删除
              </n-button>
            </template>
            确定要删除选中的 {{ checkedRowKeys.length }} 个队伍吗？
          </n-popconfirm>
          <n-button type="primary" :disabled="!selectedCid" @click="handleAdd">
            添加队伍
          </n-button>
        </n-space>
      </div>

      <n-space vertical :size="16">
        <n-select
          :value="selectedCid"
          :options="contestOptions"
          :loading="contestLoading"
          placeholder="请选择比赛"
          filterable
          remote
          :filter="() => true"
          style="width: 320px"
          @search="handleContestSearch"
          @update:value="handleCidChange"
        />

        <n-data-table
          remote
          :columns="columns"
          :data="teamList"
          :loading="loading"
          :pagination="pagination"
          :row-key="(row) => row.id"
          :checked-row-keys="checkedRowKeys"
          @update:checked-row-keys="handleCheck"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
          :scroll-x="1500"
        />
      </n-space>
    </n-card>

    <n-modal v-model:show="showModal">
      <n-card
        style="width: 600px"
        :title="modalType === 'add' ? '添加队伍' : '编辑队伍'"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <n-form
          ref="formRef"
          :model="formValue"
          :rules="rules"
          label-placement="left"
          label-width="130"
          require-mark-placement="right-hanging"
        >
          <n-form-item label="队伍名称" path="name">
            <n-input v-model:value="formValue.name" placeholder="请输入队伍名称" />
          </n-form-item>
          <n-form-item label="(队长) 成员1 UID" path="member1Uid">
            <n-input v-model:value="formValue.member1Uid" placeholder="请输入队长UID" />
          </n-form-item>
          <n-form-item label="成员2 UID" path="member2Uid">
            <n-input v-model:value="formValue.member2Uid" placeholder="请输入成员2 UID" />
          </n-form-item>
          <n-form-item label="成员3 UID" path="member3Uid">
            <n-input v-model:value="formValue.member3Uid" placeholder="请输入成员3 UID" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="closeModal">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSubmit">
              确定
            </n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { 
  NCard, 
  NButton, 
  NSpace, 
  NDataTable, 
  NModal, 
  NForm, 
  NFormItem, 
  NInput,
  NSelect,
  NPopconfirm,
  type FormRules
} from 'naive-ui';
import { useTeamManage } from '@/composables/admin/useTeamManage';

const {
  loading,
  saving,
  teamList,
  pagination,
  columns,
  checkedRowKeys,
  showModal,
  modalType,
  formValue,
  formRef,
  contestOptions,
  contestLoading,
  selectedCid,
  init,
  handleContestSearch,
  handleCidChange,
  handleAdd,
  handleBatchDelete,
  handleSubmit,
  closeModal,
  invalidate,
  handleCheck,
  handlePageChange,
  handlePageSizeChange
} = useTeamManage();

const rules: FormRules = {
  name: {
    required: true,
    message: '请输入队伍名称',
    trigger: ['blur', 'input']
  },
  member1Uid: {
    required: true,
    message: '请输入队长UID',
    trigger: ['blur', 'input']
  }
};

onMounted(() => {
  void init();
});

onUnmounted(() => {
  invalidate();
});
</script>

<style scoped lang="less">
.team-manage-container {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .title {
      font-size: 18px;
      font-weight: bold;
      text-align: left;
    }
  }
}
</style>
