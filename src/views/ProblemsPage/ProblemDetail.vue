<template>
  <div class="problem-detail-container">
    <n-spin :show="loading">
      
      <n-card :bordered="false" class="header-card">
        <div class="header-content">
          <div class="title-section">
            <h1 class="problem-title">
              <span class="pid">{{ problem.id }}</span>
              {{ problem.title }}
            </h1>
          </div>
          
          <div class="stats-section">
            <div class="stat-item">
              <n-icon size="16" color="#666"><TimeIcon /></n-icon>
              <span>Time Limit: <span class="highlight">{{ problem.timeLimit }}ms</span></span>
            </div>
            <div class="stat-item">
              <n-icon size="16" color="#666"><HardwareChipIcon /></n-icon>
              <span>Memory Limit: <span class="highlight">{{ problem.memoryLimit }}KB</span></span>
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
              <ProblemSubmit />
            </div>

            <div v-else>
              <div class="section-block" v-if="problem.description">
                <div class="section-title">题目描述</div>
                <v-md-preview :text="problem.description"></v-md-preview>
              </div>

              <div class="section-block" v-if="problem.inputFormat">
                <div class="section-title">输入格式</div>
                <v-md-preview :text="problem.inputFormat"></v-md-preview>
              </div>

              <div class="section-block" v-if="problem.outputFormat">
                <div class="section-title">输出格式</div>
                <v-md-preview :text="problem.outputFormat"></v-md-preview>
              </div>

              <div class="section-block" v-for="(sample, index) in problem.samples" :key="index">
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
            </div>

          </n-card>
        </n-grid-item>

        <n-grid-item span="1">
          <n-space vertical size="large">
            
            <n-card :bordered="false" size="small" class="sidebar-card info-card">
              <n-space vertical>
                <div class="info-row">
                  <span class="label">上传者</span>
                  <a class="value link user-link">{{ problem.uploader }}</a>
                </div>
                <div class="info-row">
                  <span class="label">提交记录</span>
                  <a class="value link" @click="$router.push(`/status?pid=${problem.id}`)">查看记录</a>
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
                  <n-empty description="暂无讨论" size="small" />
                  <template #header-extra>
                    <n-button text size="tiny" type="primary">进入讨论版</n-button>
                  </template>
                </n-collapse-item>
              </n-collapse>
            </n-card>

            <n-card :bordered="false" size="small" class="sidebar-card">
              <n-collapse arrow-placement="right" :default-expanded-names="['2']">
                <n-collapse-item title="推荐题目" name="2">
                  <n-list hoverable clickable size="small" class="rec-list">
                    <n-list-item v-for="rec in recommendedProblems" :key="rec.id">
                      <div class="rec-item" @click="handleRecClick(rec.id)">
                        <div class="status-icon">
                          <component :is="renderStatusIcon(userStore.getProblemStatus(rec.id), 16)" />
                        </div>
                        <span class="rec-id">{{ rec.id }}</span>
                        <span class="rec-title" :title="rec.title">{{ rec.title }}</span>
                      </div>
                    </n-list-item>
                  </n-list>
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
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { 
  TimeOutline as TimeIcon, 
  HardwareChipOutline as HardwareChipIcon, 
  BarChartOutline as BarChartIcon,
  CopyOutline as CopyIcon,
  CloudUploadOutline as CloudUploadIcon,
  ArrowBackOutline as ReturnIcon
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores/userStore';
import { renderStatusIcon } from '@/utils/statusUtils';
import ProblemSubmit from './components/ProblemSubmit.vue';

interface ProblemSample {
  input: string;
  output: string;
}

interface Problem {
  id: string;
  title: string;
  timeLimit: number;
  memoryLimit: number;
  accepted: number;
  submitted: number;
  difficulty: string;
  uploader: string;
  tags: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  samples: ProblemSample[];
  hint: string;
}

const route = useRoute();
const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const loading = ref(false);
const isSubmitMode = ref(false); // 是否处于提交模式

const problem = ref<Problem>({
  id: '',
  title: '',
  timeLimit: 0,
  memoryLimit: 0,
  accepted: 0,
  submitted: 0,
  difficulty: '',
  uploader: '',
  tags: [],
  description: '',
  inputFormat: '',
  outputFormat: '',
  samples: [],
  hint: ''
});

const recommendedProblems = ref<any[]>([]);

const fetchProblemDetail = async (pid: string) => {
  loading.value = true;
  
  setTimeout(() => {
    problem.value = {
      id: pid,
      title: '奶牛的二叉搜索树',
      timeLimit: 1000,
      memoryLimit: 256,
      accepted: 30,
      submitted: 192,
      difficulty: '困难',
      uploader: 'VinstaG173',
      tags: ['树', 'DP', '搜索', '组合数学'],
      description: `
为了迎接新年，Farmer John 决定给他的奶牛们一个节点数为 $N$ 的二叉搜索树！

为了生成这个二叉搜索树，Farmer John 从一个 $1 \\dots N$ 的排列 $a = \\{1, 2, \\dots, N\\}$ 开始。然后他运行如下的伪代码：

\`\`\`cpp
generate(l, r):
  if l > r, return empty subtree;
  x = argmin_{l <= i <= r} a_i; // index of min a_i in {a_l, ..., a_r}
  return a BST with x as the root, 
    generate(l, x-1) as the left subtree,
    generate(x+1, r) as the right subtree;
\`\`\`

例如，排列 $\\{3, 2, 5, 1, 4\\}$ 将产生如下的二叉搜索树：

![BST示例](https://cdn.luogu.com.cn/upload/image_hosting/gw6ursc0.png)
      `,
      inputFormat: `输入只有一行，包含三个整数 $N, K, M$。`,
      outputFormat: `输出一行 $N$ 个整数，第 $i$ 个整数表示 $\\sum_a d_i(a) \\pmod M$。`,
      samples: [
        { input: "3 0 19260817", output: "1 2 3" },
        { input: "3 1 144408983", output: "3 4 4" }
      ],
      hint: `
**数据范围**

对于全部数据，$1 \\le N \\le 300$， $0 \\le K \\le \\frac{N(N-1)}{2}$。

**来源**

洛谷
      `
    };

    recommendedProblems.value = [
      { id: '1001', title: 'A+B Problem (High Precision)' }, 
      { id: '1002', title: '矩阵乘法' },    
      { id: '1005', title: '线段树模版' },
      { id: '1007', title: '最长公共子序列' }   
    ];

    loading.value = false;
  }, 300);
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
  } catch (err) {
    message.error('复制失败');
  }
  document.body.removeChild(textArea);
};

const handleRecClick = (id: string) => {
  router.push(`/problem/${id}`);
  isSubmitMode.value = false;
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
      fetchProblemDetail(newId as string);
      isSubmitMode.value = false;
    }
  }
);

onMounted(() => {
  const pid = (route.params.id as string) || 'P1001';
  fetchProblemDetail(pid);
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
  margin-bottom: 32px;

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
      transition: all 0.3s;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(32, 128, 240, 0.4);
      }
    }
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