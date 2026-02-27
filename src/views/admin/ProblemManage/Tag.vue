<template>
  <div class="tag-manage-container">
    <n-card title="标签管理" :bordered="false" class="main-card">
      <template #header-extra>
        <n-space>
          <n-button type="primary" @click="saveTagGroups" :loading="loading">
            保存修改
          </n-button>
          <n-button type="info" @click="handleExport">
            导出配置
          </n-button>
        </n-space>
      </template>

      <div class="content-layout">
        <!-- Left: Visual Editor -->
        <div class="visual-editor">
          <n-scrollbar style="max-height: calc(100vh - 200px)">
            <transition-group name="list" tag="div" class="tag-group-list">
              <div v-for="(group, index) in tagGroups" :key="group._id" class="tag-group-item">
                <n-card size="small" class="group-card">
                  <template #header>
                    <n-input 
                      v-model:value="group.title" 
                      placeholder="分类名称" 
                      class="group-title-input"
                    />
                  </template>
                  <template #header-extra>
                    <n-space>
                      <n-button size="tiny" quaternary circle @click="moveTagGroup(index, 'up')" :disabled="index === 0">
                        <template #icon><n-icon><ArrowUpOutline /></n-icon></template>
                      </n-button>
                      <n-button size="tiny" quaternary circle @click="moveTagGroup(index, 'down')" :disabled="index === tagGroups.length - 1">
                        <template #icon><n-icon><ArrowDownOutline /></n-icon></template>
                      </n-button>
                      <n-popconfirm @positive-click="removeTagGroup(index)">
                        <template #trigger>
                          <n-button size="tiny" quaternary circle type="error">
                            <template #icon><n-icon><TrashOutline /></n-icon></template>
                          </n-button>
                        </template>
                        确定删除该分类吗？
                      </n-popconfirm>
                    </n-space>
                  </template>
                  
                  <n-dynamic-tags v-model:value="group.tags" />
                </n-card>
              </div>
            </transition-group>

            <n-button dashed block @click="addTagGroup" class="add-btn">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              添加新分类
            </n-button>
          </n-scrollbar>
        </div>

        <!-- Right: JSON Editor -->
        <div class="json-editor">
          <div class="json-header">
            <span>JSON 配置 (双向绑定可直接修改)</span>
            <n-tag v-if="jsonError" type="error" size="small">格式错误</n-tag>
            <n-tag v-else type="success" size="small">格式正确</n-tag>
          </div>
          <div class="editor-box">
            <codemirror
              v-model="jsonString"
              placeholder="// JSON configuration..."
              :style="{ height: '100%', width: '100%' }"
              :autofocus="false"
              :indent-with-tab="true"
              :tab-size="2"
              :extensions="extensions"
              @change="handleJsonInput"
            />
          </div>
          <div v-if="jsonError" class="error-message">
            {{ jsonError }}
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, computed } from 'vue';
import { 
  NCard, NSpace, NButton, NInput, NDynamicTags, NScrollbar, 
  NIcon, NPopconfirm, NTag, useDialog, useMessage
} from 'naive-ui';
import { 
  ArrowUpOutline, ArrowDownOutline, TrashOutline, AddOutline 
} from '@vicons/ionicons5';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { useTagManage } from '@/composables/admin/useTagManage';

const dialog = useDialog();
const message = useMessage();

const {
  loading,
  tagGroups,
  jsonString,
  jsonError,
  fetchTagGroups,
  saveTagGroups,
  addTagGroup,
  removeTagGroup,
  moveTagGroup,
  handleJsonInput,
  exportJson: _exportJson
} = useTagManage();

const extensions = computed(() => [json()]);

const handleExport = () => {
  if (jsonError.value) {
    dialog.warning({
      title: '格式错误',
      content: '当前 JSON 格式不正确，是否仍要导出？',
      positiveText: '继续导出',
      negativeText: '取消',
      onPositiveClick: () => {
        downloadJson();
      }
    });
  } else {
    downloadJson();
  }
};

const downloadJson = () => {
  const blob = new Blob([jsonString.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tags-config.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  message.success('配置已导出');
};

onMounted(() => {
  fetchTagGroups();
});
</script>

<style scoped lang="less">
.tag-manage-container {
  height: 100%;
  
  .main-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    :deep(.n-card__content) {
      flex: 1;
      min-height: 0;
    }
  }
}

.content-layout {
  display: flex;
  gap: 24px;
  height: 100%;

  .visual-editor {
    flex: 1;
    min-width: 0;
    
    .tag-group-list {
      position: relative;
    }

    .tag-group-item {
      margin-bottom: 16px;
      
      .group-card {
        border: 1px solid #dcdfe6;
        transition: border-color 0.3s;
        
        &:hover {
          border-color: #2080f0;
        }
      }
      
      .group-title-input {
        font-weight: bold;
        max-width: 200px;
      }
    }

    .add-btn {
      margin-top: 16px;
      height: 48px;
    }
  }

  .json-editor {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #efeff5;
    padding-left: 24px;

    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-weight: 500;
      color: #333;
    }

    .editor-box {
      flex: 1;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      overflow: hidden;
      background-color: #fff;
      font-size: 14px;
    }

    .error-message {
      margin-top: 8px;
      color: #d03050;
      font-size: 12px;
    }
  }
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
