<template>
  <div class="account-limit-container">
    <n-form-item label="添加账号" label-placement="left" :show-feedback="false">
      <n-input-group>
        <n-input 
          :value="inputValue"
          placeholder="请输入UID或用户名" 
          @update:value="$emit('update:inputValue', $event)"
          @keyup.enter="handleAdd"
        />
        <n-button type="primary" @click="handleAdd" :loading="loading">
          添加
        </n-button>
      </n-input-group>
    </n-form-item>

    <div class="account-limit-list-wrapper">
      <n-data-table
        :columns="columns"
        :data="accountList"
        :pagination="{ pageSize: 10 }"
        :row-key="(row: Account) => row.uid"
        size="small"
        class="account-table"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NFormItem, NInputGroup, NInput, NButton, NDataTable, type DataTableColumns } from 'naive-ui';

export interface Account {
  uid: string;
  username: string;
}

const props = defineProps<{
  accountList: Account[];
  loading?: boolean;
  inputValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:inputValue', value: string): void;
  (e: 'add', value: string): void;
  (e: 'remove', index: number): void;
}>();

const handleAdd = () => {
  const value = props.inputValue.trim();
  if (!value) return;
  // 输入由父级在查验成功后清空，失败时必须保留，便于修正后重试
  emit('add', value);
};

const columns: DataTableColumns<Account> = [
  { title: 'UID', key: 'uid', width: 140 },
  { title: '名称', key: 'username' },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(_row, index) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'error',
          onClick: () => emit('remove', index)
        },
        { default: () => '删除' }
      );
    }
  }
];
</script>

<style scoped>
.account-limit-container {
    margin-top: 16px;

    .account-limit-list-wrapper {
      margin-bottom: 24px;
      padding-left: 100px;  
    }
}
.account-table {
  margin-top: 16px;
}
</style>
