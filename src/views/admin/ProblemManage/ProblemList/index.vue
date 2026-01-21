<template>
  <div class="problem-list-container">
    <n-card :bordered="false" class="main-card">
      <div class="header-row">
        <div class="title">题目列表</div>
        <div class="actions">
          <n-space>
            <n-input-group>
              <n-input v-model:value="searchKeyword" placeholder="输入题目或PID搜索" @keyup.enter="handleSearch" />
              <n-button type="primary" ghost @click="handleSearch">
                <template #icon><n-icon><SearchOutline /></n-icon></template>
              </n-button>
            </n-input-group>
            <n-button type="primary" @click="router.push({ name: 'AdminProblemAdd' })">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加
            </n-button>
            <n-button type="info" @click="showImportModal = true">
              <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
              导入
            </n-button>
            <n-button type="warning" @click="showExportModal = true">
              <template #icon><n-icon><CloudDownloadOutline /></n-icon></template>
              导出
            </n-button>
            <n-button type="success" @click="showRemoteModal = true">
              <template #icon><n-icon><GlobeOutline /></n-icon></template>
              添加远程OJ题目
            </n-button>
          </n-space>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll-x="1200"
        @update:page="handlePageChange"
        class="problem-table"
      />
    </n-card>

    <!-- 导入模态框 -->
    <n-modal v-model:show="showImportModal" preset="card" title="导入题目" style="width: 600px">
      <n-tabs type="line" animated>
        <n-tab-pane name="FPS" tab="FPS">
          <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f">
            <n-button>上传 FPS 文件</n-button>
          </n-upload>
        </n-tab-pane>
        <n-tab-pane name="QDUOJ" tab="QDUOJ">
          <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f">
            <n-button>上传 QDUOJ 文件</n-button>
          </n-upload>
        </n-tab-pane>
        <n-tab-pane name="Hydro" tab="Hydro">
          <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f">
            <n-button>上传 Hydro 文件</n-button>
          </n-upload>
        </n-tab-pane>
      </n-tabs>
    </n-modal>

    <!-- 导出模态框 -->
    <n-modal v-model:show="showExportModal" preset="card" title="导出题目" style="width: 800px">
      <div class="export-filter">
        <n-input v-model:value="exportSearchKeyword" placeholder="输入题目或PID搜索" />
        <n-button type="primary" @click="handleExportSearch">搜索</n-button>
      </div>
      <n-data-table
        :columns="exportColumns"
        :data="exportTableData"
        :row-key="(row: any) => row.id"
        @update:checked-row-keys="handleExportSelection"
      />
      <template #footer>
        <n-button type="primary" @click="handleExport">导出选中题目</n-button>
      </template>
    </n-modal>

    <!-- 添加远程OJ题目模态框 -->
    <n-modal v-model:show="showRemoteModal" preset="card" title="添加远程OJ题目" style="width: 500px">
      <n-form>
        <n-form-item label="远程OJ">
          <n-select v-model:value="remoteOJ" :options="remoteOJOptions" />
        </n-form-item>
        <n-form-item label="题目ID">
          <n-input v-model:value="remoteProblemId" placeholder="请输入远程题目ID" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button type="primary" @click="handleAddRemoteProblem">添加</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  AddOutline, CloudUploadOutline, CloudDownloadOutline,
  GlobeOutline, SearchOutline
} from '@vicons/ionicons5';
import { useProblemManage } from '@/composables/admin/useProblemManage';

const router = useRouter();
const {
  showImportModal,
  showExportModal,
  showRemoteModal,
  searchKeyword,
  loading,
  tableData,
  pagination,
  columns,
  handleSearch,
  handlePageChange,
  exportSearchKeyword,
  exportTableData,
  exportColumns,
  handleExportSearch,
  handleExportSelection,
  handleExport,
  remoteOJ,
  remoteProblemId,
  remoteOJOptions,
  handleAddRemoteProblem
} = useProblemManage();
</script>

<style scoped lang="less">
.problem-list-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-card {
  display: flex;
  flex-direction: column;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title {
    font-size: 18px;
    font-weight: bold;
    color: #333;
  }

  .actions {
    display: flex;
    align-items: center;
  }
}

.export-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
</style>
