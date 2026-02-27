<template>
  <div class="account-limit-container">
    <n-form-item label="添加账号" label-placement="left" :show-feedback="false">
      <n-input-group>
        <n-input 
          v-model:value="inputValue" 
          placeholder="请输入UID或用户名" 
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
        size="small"
        class="account-table"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
//TODO: 实现对学院、年纪、专业的限定
import { ref, h } from 'vue';
import { NFormItem, NInputGroup, NInput, NButton, NDataTable, type DataTableColumns } from 'naive-ui';

interface Account {
  uid: string;
  username: string;
  type: 'Personal' | 'Team';
}

defineProps<{
  accountList: Account[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add', value: string): void;
  (e: 'remove', index: number): void;
}>();

const inputValue = ref('');

const handleAdd = () => {
  if (!inputValue.value) return;
  emit('add', inputValue.value);
  inputValue.value = '';
};

const columns: DataTableColumns<Account> = [
  { title: 'UID', key: 'uid', width: 120 },
  { title: '名称', key: 'username' },
  { 
    title: '账号类型', 
    key: 'type',
    width: 120,
    render(row) {
      return row.type === 'Personal' ? '个人账号' : '团队账号';
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row, index) {
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
