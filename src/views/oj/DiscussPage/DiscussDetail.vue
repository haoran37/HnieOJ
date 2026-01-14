<template>
  <div class="discuss-detail-container">
    <n-spin :show="loading">
      
      <div class="page-header-card" v-if="post">
        <div class="header-left">
          <h1 class="page-title">{{ post.title }}</h1>
          <div class="tags-row">
            <n-tag v-for="tag in post.tags" :key="tag" size="small" :bordered="false" type="info" class="tag">
              {{ tag }}
            </n-tag>
          </div>
        </div>
        <div class="header-right">
          <div class="stat-item">
            <div class="num">{{ post.viewCount }}</div>
            <div class="label">浏览</div>
          </div>
          <n-divider vertical />
          <div class="stat-item">
            <div class="num">{{ post.voteCount }}</div>
            <div class="label">推荐</div>
          </div>
        </div>
      </div>

      <n-grid x-gap="20" cols="1 l:4" responsive="screen" v-if="post">
        
        <n-grid-item span="3">
          
          <div class="white-card post-card">
            <div class="post-layout">
              <div class="vote-column">
                <n-tooltip trigger="hover" placement="right">
                  <template #trigger>
                    <n-button text class="vote-btn up" :class="{ active: post.upvoted }" @click="handleVote('post', post!.id, 'up')">
                      <n-icon size="32"><CaretUp /></n-icon>
                    </n-button>
                  </template>
                  这个提问体现了解题思考
                </n-tooltip>

                <span class="vote-count">{{ post.voteCount }}</span>

                <n-tooltip trigger="hover" placement="right">
                  <template #trigger>
                    <n-button text class="vote-btn down" :class="{ active: post.downvoted }" @click="handleVote('post', post!.id, 'down')">
                      <n-icon size="32"><CaretDown /></n-icon>
                    </n-button>
                  </template>
                  这个提问表述不清晰
                </n-tooltip>
              </div>

              <div class="content-column">
                <v-md-preview :text="post.content" />
              </div>
            </div>
          </div>

          <div class="answers-wrapper">
            <div class="answers-divider" v-if="sortedAnswers.length > 0">
              <h3>{{ sortedAnswers.length }} 个回答</h3>
            </div>

            <div class="answers-list">
              <DiscussAnswerItem
                v-for="ans in sortedAnswers"
                :key="ans.id"
                :answer="ans"
                :can-delete="isAdmin"
                @vote="(dir) => handleVote('answer', ans.id, dir)"
                @submit-comment="(text) => submitComment(ans.id, text)"
              />
            </div>
          </div>

          <div class="editor-section">
            <h3>撰写回答</h3>
            <div class="white-card editor-box">
              <v-md-editor 
                v-model="answerDraft" 
                height="300px" 
                placeholder="请确保你的回答能够提供帮助，代码请使用 Markdown 代码块格式。"
              />
              <div class="editor-footer">
                <n-button type="primary" class="post-btn" @click="handlePostAnswer">发布回答</n-button>
              </div>
            </div>
          </div>

        </n-grid-item>

        <n-grid-item span="1">
          <div class="sidebar-wrapper">
            
            <n-card :bordered="false" size="small" class="sidebar-card info-card">
              <div class="info-item user-item">
                <span class="label">提出者</span>
                <div class="user-val">
                  <n-avatar round size="small" :src="post.user.avatar" class="avatar-small" />
                  <span class="val user">{{ post.user.username }}</span>
                </div>
              </div>
              <div class="info-item">
                <span class="label">提出时间</span>
                <span class="val">{{ post.time }}</span>
              </div>
              <div class="info-item">
                <span class="label">所属板块</span>
                <span class="val">{{ post.category }}</span>
              </div>

              <n-divider style="margin: 16px 0;" />
              
              <div class="action-buttons">
                <n-button v-if="isAuthor" block secondary type="info" class="action-btn" @click="message.info('跳转编辑')">
                  修改问题
                </n-button>
                
                <n-button v-else block secondary type="primary" class="action-btn" @click="scrollToEditor">
                  回复问题
                </n-button>

                <n-button v-if="isAdmin" block secondary type="error" class="action-btn" @click="message.warning('删除帖子')">
                  删除帖子
                </n-button>
              </div>
            </n-card>

            <n-card :bordered="false" title="相关问题" class="sidebar-card related-card">
              <ul class="related-list">
                <li><a href="#">xxxxxxxxTODO:推荐系统xxxxxxxx</a></li>
                <li><a href="#">xxxxxxxxTODO:推荐系统xxxxxxxx</a></li>
                <li><a href="#">xxxxxxxxTODO:推荐系统xxxxxxxx</a></li>
              </ul>
            </n-card>

            <n-alert title="系统提示" type="warning" :bordered="false" style="margin-top: 16px; border-radius: 8px;">
              该讨论系统还在开发中，如有问题欢迎到 
              <n-button text type="primary" tag="a" href="#" target="_blank">
                GitHub Issue
              </n-button> 
              提出。
            </n-alert>
            
          </div>
        </n-grid-item>

      </n-grid>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import { CaretUpOutline as CaretUp, CaretDownOutline as CaretDown } from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';
import { useDiscussDetail } from '@/composables/useDiscussDetail';
import DiscussAnswerItem from './components/DiscussAnswerItem.vue';

const route = useRoute();
const message = useMessage();
const userStore = useUserStore();

const { 
  loading, post, sortedAnswers, 
  fetchDetail, handleVote, submitComment, submitAnswer 
} = useDiscussDetail();

const answerDraft = ref('');

// 权限计算：确保 post 加载后进行比较
const isAuthor = computed(() => {
  if (!post.value) return false;
  return post.value.user.id === userStore.userInfo.id;
});
const isAdmin = computed(() => userStore.isAdmin);

const handlePostAnswer = () => {
  if (!answerDraft.value.trim()) {
    message.warning('回答内容不能为空');
    return;
  }
  submitAnswer(answerDraft.value);
  answerDraft.value = '';
  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
};

const scrollToEditor = () => {
  document.querySelector('.editor-section')?.scrollIntoView({ behavior: 'smooth' });
};

onMounted(() => {
  fetchDetail(route.params.id as string);
});
</script>

<style scoped lang="less">
.discuss-detail-container {
  // width: 100%;
  // max-width: 1200px;
  margin: 0 auto;
  // padding: 24px 16px 60px;
  min-height: 100vh;

  @media (min-width: 768px) {
    padding: 0 24px 60px;
  }
}

.white-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 24px;
}

// 顶部 Header
.page-header-card {
  .white-card();
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-left: 6px solid #2080f0;
  padding-left: 32px;

  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .tags-row { display: flex; gap: 8px; }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 24px;
    padding-top: 4px;
    
    .stat-item {
      text-align: center;
      .num { font-size: 20px; font-weight: bold; color: #333; line-height: 1.2; }
      .label { font-size: 12px; color: #999; }
    }
  }
}

// 帖子布局
.post-layout {
  display: flex;
  gap: 20px;
}

.vote-column {
  width: 40px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .vote-btn {
    color: #babfc4;
    cursor: pointer;
    &:hover { color: #666; }
    &.active { color: #f48024; }
  }
  .vote-count {
    font-size: 20px;
    font-weight: 600;
    color: #6a737c;
    margin: 4px 0;
  }
}

.content-column {
  flex: 1;
  min-width: 0;
}

.answers-divider {
  margin: 32px 0 16px;
  h3 { font-size: 20px; color: #333; font-weight: 500; margin: 0; }
}

// 编辑器区域
.editor-section {
  margin-top: 40px;
  h3 { font-size: 18px; margin-bottom: 16px; }
  
  .editor-box {
    .white-card();
    padding: 0; 
    border: 1px solid #e0e0e0;
    overflow: hidden;
  }
  .editor-footer {
    padding: 12px 16px;
    background: #f9f9f9;
    border-top: 1px solid #e0e0e0;
  }
}

// 侧边栏
.sidebar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .sidebar-card {
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    background: #fff;
  }

  .info-card {
    padding: 16px 20px;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
      
      .label { color: #888; }
      .val { color: #333; font-weight: 500; }
      
      .user-val {
        display: flex;
        align-items: center;
        gap: 8px;
        .avatar-small { width: 24px; height: 24px; }
        .user { color: #0074cc; }
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      .action-btn { height: 36px; }
    }
  }

  .related-card {
    .related-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        margin-bottom: 12px;
        padding-left: 14px;
        position: relative;
        &::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          width: 4px;
          height: 4px;
          background: #ccc;
          border-radius: 50%;
        }
        a { 
          font-size: 14px; color: #0074cc; text-decoration: none; line-height: 1.4;
          &:hover { text-decoration: underline; }
        }
      }
    }
  }
}

:deep(.github-markdown-body) { padding: 0; }
</style>