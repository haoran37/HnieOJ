<template>
  <div class="discuss-detail-container">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
        <div class="alert-row">
          <span>{{ error }}</span>
          <n-button size="tiny" secondary type="error" @click="handleRetryLoad">重试</n-button>
        </div>
      </n-alert>
      
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
                :submit-comment="submitCommentForRoute"
                @vote="(dir) => handleVote('answer', ans.id, dir)"
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
                <n-button
                  type="primary"
                  class="post-btn"
                  :loading="submittingAnswer"
                  :disabled="submittingAnswer"
                  @click="handlePostAnswer"
                >发布回答</n-button>
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
                <span class="val">{{ CATEGORY_LABEL[post.category] }}</span>
              </div>

              <n-divider style="margin: 16px 0;" />
              
              <div class="action-buttons">
                <n-button block secondary type="primary" class="action-btn" @click="scrollToEditor">
                  回复问题
                </n-button>
              </div>
            </n-card>

            <n-card :bordered="false" title="相关问题" class="sidebar-card related-card">
              <n-alert
                v-if="relatedError"
                type="error"
                :bordered="false"
                size="small"
                class="related-error"
              >
                <div class="alert-row">
                  <span>{{ relatedError }}</span>
                  <n-button size="tiny" secondary type="error" @click="retryRelated">重试</n-button>
                </div>
              </n-alert>
              <ul class="related-list" v-else-if="relatedDiscussions.length > 0">
                <li v-for="item in relatedDiscussions" :key="item.id">
                  <a href="#" @click.prevent="router.push(`/discuss/${item.id}`)">{{ item.title }}</a>
                </li>
              </ul>
              <n-empty v-else description="暂无相关讨论" size="small" />
            </n-card>

            
          </div>
        </n-grid-item>

      </n-grid>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { CaretUpOutline as CaretUp, CaretDownOutline as CaretDown } from '@vicons/ionicons5';
import { useDiscussDetail, CATEGORY_LABEL } from '@/composables/oj/useDiscussDetail';
import { getRelatedDiscussions } from '@/utils/api';
import DiscussAnswerItem from './components/DiscussAnswerItem.vue';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const {
  loading, error, post, sortedAnswers, submittingAnswer,
  fetchDetail, reload, handleVote, submitComment, submitAnswer
} = useDiscussDetail();

const answerDraft = ref('');
const relatedDiscussions = ref<{ id: number; title: string }[]>([]);
const relatedError = ref<string | null>(null);
// 局部序号：切换题目/帖子后作废更早的在途相关讨论请求
let relatedSeq = 0;
// 路由加载世代：loadByRoute 每次递增，用于识别陈旧的写入完成回调
let loadSeq = 0;

const fetchRelatedDiscussions = async (problemCode: string) => {
  const current = ++relatedSeq;
  relatedError.value = null;
  if (!problemCode) {
    relatedDiscussions.value = [];
    return;
  }
  try {
    const list = await getRelatedDiscussions(problemCode, 5);
    if (current !== relatedSeq) return;
    relatedDiscussions.value = list ?? [];
  } catch (err) {
    if (current !== relatedSeq) return;
    relatedDiscussions.value = [];
    relatedError.value = err instanceof Error ? err.message : '相关讨论加载失败';
  }
};

const retryRelated = () => {
  if (post.value?.problemCode) void fetchRelatedDiscussions(post.value.problemCode);
};


// 只有确认写入成功、且路由世代与目标都未变化时才清空草稿：
// 失败保留内容供用户重试；切换路由（含 A->B->A）后旧写入完成不得清空新路由草稿。
const handlePostAnswer = async () => {
  const content = answerDraft.value;
  if (!content.trim()) {
    message.warning('回答内容不能为空');
    return;
  }
  // B 加载中而 post 仍为 A 时，回答不能提交到错误的目标 A
  const targetId = String(route.params.id);
  if (!post.value || post.value.id !== targetId) return;
  const generation = loadSeq;
  const submitted = await submitAnswer(content);
  if (!submitted) return;
  if (generation !== loadSeq || String(route.params.id) !== targetId) return;
  answerDraft.value = '';
};

// 评论写入完成时若路由世代已变化，返回 false 让子组件保留新路由的草稿并保持编辑框打开
const submitCommentForRoute = async (answerId: number, content: string): Promise<boolean> => {
  const targetId = String(route.params.id);
  // B 加载中而 post 仍为 A 时，评论不能写到 A 的旧回答上：成功后的刷新会作废 B
  if (!post.value || post.value.id !== targetId) return false;
  const generation = loadSeq;
  const submitted = await submitComment(answerId, content);
  if (!submitted) return false;
  return generation === loadSeq && String(route.params.id) === targetId;
};

const scrollToEditor = () => {
  document.querySelector('.editor-section')?.scrollIntoView({ behavior: 'smooth' });
};

// 路由参数变化（点击“相关讨论”在同一组件内跳转）时立即重新加载并作废旧请求
const loadByRoute = async (id: string) => {
  const generation = ++loadSeq;
  answerDraft.value = '';
  relatedSeq += 1;
  relatedDiscussions.value = [];
  relatedError.value = null;
  const ok = await fetchDetail(id);
  if (!ok || generation !== loadSeq || String(route.params.id) !== id) return;
  if (post.value?.problemCode) {
    void fetchRelatedDiscussions(post.value.problemCode);
  }
};

// 详情已加载但刷新失败时，重试只重新拉取，不重新提交回答
const handleRetryLoad = async () => {
  if (post.value) {
    const ok = await reload();
    if (ok && post.value?.problemCode) void fetchRelatedDiscussions(post.value.problemCode);
    return;
  }
  await loadByRoute(String(route.params.id));
};

watch(
  () => route.params.id,
  (id) => {
    if (id) void loadByRoute(String(id));
  },
);

onMounted(() => {
  void loadByRoute(String(route.params.id));
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

.alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.related-error {
  margin: 0;
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