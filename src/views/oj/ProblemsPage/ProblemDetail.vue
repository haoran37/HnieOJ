<template>
  <div class="problem-detail-container">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :bordered="false" style="margin-bottom: 12px">
        {{ error }}
      </n-alert>
      
      <n-card :bordered="false" class="header-card">
        <div class="header-content">
          <div class="title-section">
            <h1 class="problem-title">
              <span class="pid">{{ problem.problemCode }}</span>
              {{ problem.title }}
            </h1>
            <n-button size="small" :loading="favoriteLoading" @click="toggleFavorite">{{ isFavorite ? '取消收藏' : '收藏题目' }}</n-button>
          </div>
          
          <div class="stats-section">
            <div class="stat-item">
              <n-icon size="16" color="#666"><TimeIcon /></n-icon>
              <span>Time Limit: <span class="highlight">{{ problem.timeLimit }}ms</span></span>
            </div>
            <div class="stat-item">
              <n-icon size="16" color="#666"><HardwareChipIcon /></n-icon>
              <span>Memory Limit: <span class="highlight">{{ problem.memoryLimit }}MB</span></span>
            </div>
            <div class="stat-item">
              <n-icon size="16" color="#666"><BarChartIcon /></n-icon>
              <span>
                Ratio: 
                <span class="highlight">
                  {{ problem.submitted ? ((problem.accepted / problem.submitted) * 100).toFixed(1) : 0 }}%
                </span>
                <span class="sub-text">({{ problem.accepted }} / {{ problem.submitted }})</span>
              </span>
            </div>
          </div>
        </div>
      </n-card>

      <n-grid :x-gap="20" :y-gap="20" cols="1 l:4" responsive="screen" class="main-grid">
        
        <n-grid-item span="3">
          <n-card :bordered="false" class="problem-card">
            
            <div v-if="isSubmitMode">
              <ProblemSubmit :problem-code="problem.problemCode" :contest-id="queryId(route.query.cid)" :homework-id="queryId(route.query.hid)" />
            </div>

            <div v-else>
              <div class="section-block" v-if="problem.description">
                <div class="section-title">题目描述</div>
                <v-md-preview :text="problem.description"></v-md-preview>
              </div>

              <div class="section-block" v-if="problem.input">
                <div class="section-title">输入格式</div>
                <v-md-preview :text="problem.input"></v-md-preview>
              </div>

              <div class="section-block" v-if="problem.output">
                <div class="section-title">输出格式</div>
                <v-md-preview :text="problem.output"></v-md-preview>
              </div>

              <div class="section-block" v-for="(sample, index) in problem.examples" :key="index">
                <div class="section-title">输入输出样例 {{ index + 1 }}</div>
                <n-grid :x-gap="12" cols="1 s:2" responsive="screen">
                  <n-grid-item>
                    <div class="sample-box">
                      <div class="sample-header">
                        <span>输入</span>
                        <n-button text size="tiny" @click="copyText(sample.input)">
                          <template #icon><n-icon><CopyIcon /></n-icon></template> 复制
                        </n-button>
                      </div>
                      <pre class="sample-content">{{ sample.input }}</pre>
                    </div>
                  </n-grid-item>
                  <n-grid-item>
                    <div class="sample-box">
                      <div class="sample-header">
                        <span>输出</span>
                        <n-button text size="tiny" @click="copyText(sample.output)">
                          <template #icon><n-icon><CopyIcon /></n-icon></template> 复制
                        </n-button>
                      </div>
                      <pre class="sample-content">{{ sample.output }}</pre>
                    </div>
                  </n-grid-item>
                </n-grid>
              </div>

              <div class="section-block" v-if="problem.hint">
                <div class="section-title">说明 / 提示</div>
                <v-md-preview :text="problem.hint"></v-md-preview>
              </div>
              <div class="section-block" v-if="problem.source">
                <div class="section-title">来源</div>
                  <div class="problem-tag">
                    <n-tag size="medium" :bordered="false" type="default">
                      {{ problem.source }}
                    </n-tag>
                  </div>
              </div>
            </div>

          </n-card>
        </n-grid-item>

        <n-grid-item span="1">
          <n-space vertical size="large">
            
            <n-card :bordered="false" size="small" class="sidebar-card info-card">
              <n-space vertical>
                <div class="info-row">
                  <span class="label">上传者</span>
                  <span class="value user-link">{{ problem.uploader }}</span>
                </div>
                <div class="info-row">
                  <span class="label">提交记录</span>
                  <button class="value link link-btn" type="button" @click="$router.push(`/status?pid=${problem.problemCode}`)">查看记录</button>
                </div>
                <div class="info-row">
                  <span class="label">难度</span>
                  <n-tag :color="{ color: '#FE4C61', textColor: '#fff', borderColor: '#FE4C61' }" size="small" round>
                    {{ problem.difficulty }}
                  </n-tag>
                </div>
                <div class="info-row">
                  <span class="label">标签</span>
                  <div class="tags-wrapper">
                    <n-tag v-for="tag in problem.tags" :key="tag" size="small" :bordered="false" type="info" class="sidebar-tag">
                      {{ tag }}
                    </n-tag>
                  </div>
                </div>
              </n-space>

              <div class="submit-btn-wrapper">
                <n-button 
                  v-if="!isSubmitMode"
                  type="primary" 
                  block 
                  size="large" 
                  class="submit-btn"
                  @click="toggleSubmitMode"
                >
                  <template #icon><n-icon><CloudUploadIcon /></n-icon></template>
                  提交代码
                </n-button>

                <n-button 
                  v-else
                  secondary
                  type="info" 
                  block 
                  size="large" 
                  class="submit-btn"
                  @click="toggleSubmitMode"
                >
                  <template #icon><n-icon><ReturnIcon /></n-icon></template>
                  返回题目
                </n-button>
              </div>
            </n-card>

            <n-card :bordered="false" size="small" class="sidebar-card">
              <n-collapse arrow-placement="right">
                <n-collapse-item title="相关讨论" name="1">
                  <n-alert v-if="relatedError" type="warning" :bordered="false" size="small" style="margin-bottom: 8px">
                    {{ relatedError }}
                  </n-alert>
                  <div v-if="relatedDiscussions.length > 0">
                    <n-list hoverable clickable size="small" class="rec-list">
                      <n-list-item v-for="discuss in relatedDiscussions" :key="discuss.id">
                        <div class="rec-item" @click="handleDiscussClick(discuss.id)">
                           <n-icon size="16" color="#666"><ChatbubblesIcon /></n-icon>
                           <span class="rec-title">{{ discuss.title }}</span>
                        </div>
                      </n-list-item>
                    </n-list>
                  </div>
                  <n-empty v-else description="暂无讨论" size="small" />
                  <template #header-extra>
                    <n-button text size="tiny" type="primary" @click.stop="handleCreateDiscuss">新建讨论</n-button>
                  </template>
                </n-collapse-item>
              </n-collapse>
            </n-card>

            <n-card :bordered="false" size="small" class="sidebar-card">
              <n-collapse arrow-placement="right" :default-expanded-names="['2']">
                <n-collapse-item title="推荐题目" name="2">
                  <n-spin :show="recLoading" size="small">
                    <n-alert v-if="recError" type="warning" :bordered="false" size="small" style="margin-bottom: 8px">
                      {{ recError }}
                      <n-button size="tiny" secondary type="warning" style="margin-left: 8px"
                        @click="fetchRecommendations(problem.problemCode)">
                        重试
                      </n-button>
                    </n-alert>
                    <n-empty
                      v-else-if="recommendedProblems.length === 0 && !recLoading"
                      description="暂无推荐"
                      size="small"
                    />
                    <n-list v-else hoverable clickable size="small" class="rec-list">
                      <n-list-item v-for="rec in recommendedProblems" :key="rec.problemCode">
                        <a
                          class="rec-item"
                          :href="`/problem/${rec.problemCode}`"
                          @click.prevent="handleRecClick(rec.problemCode)"
                        >
                          <div class="status-icon">
                            <component :is="renderStatusIcon(userStore.getProblemStatus(rec.problemCode), 16)" />
                          </div>
                          <span class="rec-id">{{ rec.problemCode }}</span>
                          <span class="rec-title" :title="rec.title">{{ rec.title }}</span>
                        </a>
                      </n-list-item>
                    </n-list>
                  </n-spin>
                </n-collapse-item>
              </n-collapse>
            </n-card>

          </n-space>
        </n-grid-item>
      </n-grid>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { useFavorite } from '@/composables/oj/useFavorite';
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { 
  TimeOutline as TimeIcon, 
  HardwareChipOutline as HardwareChipIcon, 
  BarChartOutline as BarChartIcon,
  CopyOutline as CopyIcon,
  CloudUploadOutline as CloudUploadIcon,
  ArrowBackOutline as ReturnIcon,
  ChatbubblesOutline as ChatbubblesIcon
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';
import { renderStatusIcon } from '@/utils/statusUtils';
import { getProblemDetail, getProblemRecommendations, getRelatedDiscussions } from '@/utils/api';
import { difficultyLabel } from '@/types/problem';
import ProblemSubmit from './components/ProblemSubmit.vue';

interface ProblemSample {
  input: string;
  output: string;
}

interface Problem {
  problemCode: string;
  title: string;
  timeLimit: number;
  memoryLimit: number;
  accepted: number;
  submitted: number;
  difficulty: string;
  uploader: string;
  tags: string[];
  source: string;
  description: string;
  input: string;
  output: string;
  examples: ProblemSample[];
  hint: string;
}

const route = useRoute();
const queryId = (value: string | null | (string | null)[] | undefined): string | undefined =>
  (typeof value === 'string' ? value : Array.isArray(value) ? value.find(item => typeof item === 'string') : undefined) || undefined;
const { saved: isFavorite, loading: favoriteLoading, toggle: toggleFavorite } = useFavorite('problem', () => String(route.params.id ?? ''));
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const loading = ref(false);
const error = ref<string | null>(null);
const isSubmitMode = ref(false); // 是否处于提交模式

const emptyProblem = (): Problem => ({
  problemCode: '',
  title: '',
  timeLimit: 0,
  memoryLimit: 0,
  accepted: 0,
  submitted: 0,
  difficulty: '未评级',
  uploader: '',
  tags: [],
  source: '',
  description: '',
  input: '',
  output: '',
  examples: [],
  hint: '',
});

const problem = ref<Problem>(emptyProblem());

interface RecommendedProblem {
  /** 内部数字 id，仅用于本地做题状态展示 */
  id: string;
  /** 展示编号，用于导航与去重 */
  problemCode: string;
  title: string;
}

interface RelatedDiscussion {
  id: string;
  title: string;
}

const recommendedProblems = ref<RecommendedProblem[]>([]);
const recLoading = ref(false);
const recError = ref<string | null>(null);
const relatedDiscussions = ref<RelatedDiscussion[]>([]);
const relatedError = ref<string | null>(null);

// 路由 ID 变更时旧响应必须作废，避免混入上一题的题面
let detailSeq = 0;
let relatedSeq = 0;
let recSeq = 0;

const fetchRecommendations = async (problemCode: string) => {
  const seq = ++recSeq;
  if (!problemCode) return;
  recLoading.value = true;
  recError.value = null;
  // 切换题目时同步清空旧结果，避免上一题推荐留在当前题
  recommendedProblems.value = [];
  try {
    const list = await getProblemRecommendations(problemCode, 5);
    if (seq !== recSeq) return;
    recommendedProblems.value = (list ?? []).map((item) => ({
      id: String(item.id),
      problemCode: item.problemCode,
      title: item.title,
    }));
  } catch (err) {
    if (seq !== recSeq) return;
    recommendedProblems.value = [];
    recError.value = err instanceof Error ? err.message : '推荐题目加载失败';
  } finally {
    if (seq === recSeq) recLoading.value = false;
  }
};

const fetchRelatedDiscussions = async (problemCode: string) => {
  const seq = ++relatedSeq;
  relatedError.value = null;
  try {
    const list = await getRelatedDiscussions(problemCode, 5);
    if (seq !== relatedSeq) return;
    relatedDiscussions.value = (list ?? []).map((item) => ({ id: String(item.id), title: item.title }));
  } catch (err) {
    if (seq !== relatedSeq) return;
    relatedDiscussions.value = [];
    relatedError.value = err instanceof Error ? err.message : '相关讨论加载失败';
  }
};

const fetchProblemDetail = async (problemCode: string) => {
  const seq = ++detailSeq;
  loading.value = true;
  error.value = null;
  try {
    const detail = await getProblemDetail(problemCode, queryId(route.query.cid));
    if (seq !== detailSeq) return;
    problem.value = {
      problemCode: detail.problemCode,
      title: detail.title,
      timeLimit: detail.timeLimit ?? 0,
      memoryLimit: detail.memoryLimit ?? 0,
      accepted: detail.acceptedCount ?? 0,
      submitted: detail.submissionCount ?? 0,
      difficulty: difficultyLabel(detail.difficulty),
      uploader: detail.author ?? '',
      // 后端题目详情 VO 暂未返回标签，详情页标签区保持为空
      tags: [],
      source: detail.source ?? '',
      description: detail.description ?? '',
      input: detail.input ?? '',
      output: detail.output ?? '',
      examples: (detail.examples ?? [])
        .filter((item) => (item.input ?? '') !== '' || (item.output ?? '') !== '')
        .map((item) => ({ input: item.input ?? '', output: item.output ?? '' })),
      hint: detail.hint ?? '',
    };
  } catch (err) {
    if (seq !== detailSeq) return;
    problem.value = emptyProblem();
    relatedDiscussions.value = [];
    error.value = err instanceof Error ? err.message : '题目详情加载失败';
  } finally {
    if (seq === detailSeq) loading.value = false;
  }
};

// 兼容性复制函数
const copyText = (text: string) => {
  if (!text) return;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      message.success('复制成功');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
};

const fallbackCopyText = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) message.success('复制成功');
    else message.error('复制失败');
  } catch {
    message.error('复制失败');
  }
  document.body.removeChild(textArea);
};

const handleRecClick = (problemCode: string) => {
  router.push(`/problem/${problemCode}`);
  isSubmitMode.value = false;
};

const handleDiscussClick = (id: string) => {
  router.push(`/discuss/${id}`);
};

const handleCreateDiscuss = () => {
  router.push(`/discuss/add?problemCode=${encodeURIComponent(problem.value.problemCode)}`);
};

// 切换提交模式
const toggleSubmitMode = () => {
  isSubmitMode.value = !isSubmitMode.value;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      void fetchProblemDetail(newId as string);
      void fetchRelatedDiscussions(newId as string);
      void fetchRecommendations(newId as string);
      isSubmitMode.value = false;
    }
  },
  // 路由变更必须同步作废旧请求：抢在渲染/请求前清空上一题推荐并递增序号
  { flush: 'sync' },
);

onMounted(() => {
  const pid = route.params.id as string;
  if (!pid) {
    error.value = '缺少题目编号';
    return;
  }
  void fetchProblemDetail(pid);
  void fetchRelatedDiscussions(pid);
  void fetchRecommendations(pid);
});
</script>

<style scoped lang="less">
.problem-detail-container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  border-radius: 4px;
  margin-bottom: 10px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .title-section {
    .problem-title {
      margin: 0;
      font-size: 26px;
      color: #333;
      display: flex;
      align-items: baseline;
      gap: 12px;

      .pid {
        font-size: 26px;
        color: #666;
        font-weight: 500;
        font-family: monospace;
      }
    }
  }

  .stats-section {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #555;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      
      .highlight {
        color: #333;
        font-weight: bold;
      }
      .sub-text {
        font-size: 14px;
        color: #999;
        margin-left: 2px;
      }
    }
  }
}

.main-grid {
  align-items: start;
}

.section-block {
  margin-bottom: 24px;

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    border-left: 4px solid #2080f0;
    padding-left: 12px;
    line-height: 1.2;
  }

  :deep(.github-markdown-body) {
    padding: 0;
    font-size: 15px;
    color: #2c3e50;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}

.sample-box {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
  background: #fff;

  .sample-header {
    background-color: #f5f7fa;
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dcdfe6;
    
    span {
      font-size: 13px;
      font-weight: 600;
      color: #606266;
    }
  }

  .sample-content {
    margin: 0;
    padding: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.5;
    color: #333;
    white-space: pre-wrap;
    word-break: break-all;
    background: #fff;
  }
}

// 侧边栏样式
.sidebar-card {
  border-radius: 4px;
  
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.6;

    .label {
      color: #666;
      width: 70px;
      flex-shrink: 0;
    }

    .value {
      color: #333;
      text-align: right;
      
      &.link {
        color: #2080f0;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }
      &.user-link {
        color: #333; 
        font-weight: 500;
      }
    }
    
    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 4px;
    }
  }

  .submit-btn-wrapper {
    margin-top: 24px;
    .submit-btn {
      font-weight: bold;
      height: 42px;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(32, 128, 240, 0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(32, 128, 240, 0.4);
      }
    }
  }
}

.link-btn {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--oj-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.rec-list {
  background: transparent;
}

.rec-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  padding: 4px 0;
  flex-wrap: wrap;
  text-decoration: none;
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--oj-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
  
  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .rec-id {
    font-family: monospace;
    font-weight: bold;
    color: #333;
    min-width: 40px;
    flex-shrink: 0;
  }
  
  .rec-title {
    color: #2080f0;
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
    flex: 1;
    font-size: 13px;
    min-width: 80px;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
