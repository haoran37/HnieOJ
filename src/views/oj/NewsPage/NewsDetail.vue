<template>
  <div class="news-detail-container">
    <n-spin :show="loading">
      
      <div class="header-card">
        <div class="header-top">
          <n-button v-if="!isEditing" text class="back-btn" @click="$router.push('/news')">
            <template #icon><n-icon><ArrowBackIcon /></n-icon></template>
            返回列表
          </n-button>
          <div v-else class="editing-tip">
            <n-icon class="pulse-icon"><CreateIcon /></n-icon>
            正在编辑模式
          </div>
          
          <div class="admin-actions" v-if="userStore.isAdmin">
            <template v-if="isEditing">
              <n-button size="small" type="primary" @click="handleSave">
                <template #icon><n-icon><SaveIcon /></n-icon></template>
                保存修改
              </n-button>
              <n-button size="small" @click="cancelEdit">
                <template #icon><n-icon><CloseIcon /></n-icon></template>
                取消
              </n-button>
            </template>
            <template v-else>
              <n-button size="small" type="primary" secondary @click="startEdit">
                <template #icon><n-icon><EditIcon /></n-icon></template>
                编辑
              </n-button>
              <n-popconfirm @positive-click="handleDelete">
                <template #trigger>
                  <n-button size="small" type="error" secondary>
                    <template #icon><n-icon><TrashIcon /></n-icon></template>
                    删除
                  </n-button>
                </template>
                确定要删除这条新闻吗？
              </n-popconfirm>
            </template>
          </div>
        </div>

        <div class="title-wrapper">
          <h1 v-if="!isEditing" class="news-title">{{ detail.title }}</h1>
          <n-input 
            v-else 
            v-model:value="editForm.title" 
            placeholder="请输入新闻标题" 
            size="large"
            class="title-input"
          />
        </div>

        <div class="meta-info">
          <div class="meta-item">
            <n-icon><PersonIcon /></n-icon>
            <span>{{ detail.author }}</span>
          </div>
          <div class="meta-item">
            <n-icon><TimeIcon /></n-icon>
            <span>{{ detail.createTime }}</span>
          </div>
          <div class="meta-item">
            <n-icon><EyeIcon /></n-icon>
            <span>{{ detail.viewCount }} 阅读</span>
          </div>
        </div>
      </div>

      <n-card :bordered="false" class="content-card">
        <div v-if="!isEditing" class="markdown-body-wrapper">
          <v-md-preview :text="detail.content || '> 内容加载中...'"></v-md-preview>
        </div>

        <div v-else class="editor-wrapper">
          <v-md-editor 
            v-model="editForm.content" 
            height="600px"
            placeholder="请在此输入新闻正文..."
            :disabled-menus="[]"
            @upload-image="handleUploadImage"
          ></v-md-editor>
        </div>

      </n-card>

    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { 
  ArrowBackOutline as ArrowBackIcon,
  PersonOutline as PersonIcon,
  TimeOutline as TimeIcon,
  EyeOutline as EyeIcon,
  CreateOutline as EditIcon,
  TrashOutline as TrashIcon,
  SaveOutline as SaveIcon,
  CloseOutline as CloseIcon,
  Create as CreateIcon
} from '@vicons/ionicons5';
import { useNewsDetail } from '@/composables/useNewsDetail';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const { loading, detail, fetchNewsDetail, deleteNews, updateNews } = useNewsDetail();

const isEditing = ref(false);
const editForm = ref({ title: '', content: '' });

// 开始编辑
const startEdit = () => {
  // 确保数据已深拷贝，防止 v-model 还没渲染出来
  editForm.value = {
    title: detail.value.title,
    content: detail.value.content
  };
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  message.info('已取消编辑');
};

const handleSave = async () => {
  if (!editForm.value.title || !editForm.value.content) {
    message.warning('标题和内容不能为空');
    return;
  }
  await updateNews(detail.value.id, {
    title: editForm.value.title,
    content: editForm.value.content
  });
  isEditing.value = false;
  message.success('保存成功');
};

const handleDelete = async () => {
  await deleteNews(detail.value.id);
  message.success('删除成功');
  router.push('/news');
};

//TODO: 实现图片上传逻辑
const handleUploadImage = (event: any, insertImage: any, files: any) => {
  console.log('Upload image:', files);
  message.info('图片上传功能暂未对接后端');
  insertImage({
    url: 'https://s11.ax1x.com/2023/04/27/p9QuT2R.jpg',
    desc: '哈气',
  });
};

onMounted(() => {
  const id = route.params.id as string;
  if (id) fetchNewsDetail(id);
});
</script>

<style scoped lang="less">
.news-detail-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  background: #fff;
  padding: 16px 32px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #2080f0;
  margin-bottom: 10px;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    height: 32px;

    .back-btn { color: #666; &:hover { color: #2080f0; } }
    
    .editing-tip {
      color: #2080f0;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .admin-actions { display: flex; gap: 12px; }
  }

  .title-wrapper {
    margin: 0 0 16px 0;
    min-height: 40px;
    
    .news-title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2225;
      margin: 0;
      line-height: 1.4;
    }

    .title-input { 
      font-weight: 700; 
      font-size: 20px; 
      :deep(.n-input__input-el) {
        font-family: inherit;
      }
    }
  }

  .meta-info {
    display: flex;
    gap: 24px;
    color: #888;
    font-size: 14px;
    border-top: 1px solid #f0f0f0;
    padding-top: 16px;
    .meta-item { display: flex; align-items: center; gap: 6px; .n-icon { font-size: 16px; } }
  }
}

.content-card {
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 600px;
  padding: 16px;

  .markdown-body-wrapper {
    :deep(.github-markdown-body) {
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #2c3e50;
      h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
      p { margin-bottom: 16px; }
      blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding: 0 1em; background-color: #fafbfc; }
    }
  }
}
</style>