<template>
  <div class="status-code-view">
    
    <n-alert v-if="detail?.compilerOutput" type="warning" title="编译器信息" class="compiler-msg">
      <pre class="msg-content">{{ detail.compilerOutput }}</pre>
    </n-alert>

    <div class="code-container">
      <div class="code-toolbar">
        <div class="lang-info">
          <span class="lang">{{ detail?.language }}</span>
          <span class="size">{{ detail?.codeLength }}</span>
        </div>
        <n-button size="tiny" secondary type="primary" class="copy-btn" @click="handleCopy">
          复制
        </n-button>
      </div>
      
      <n-scrollbar x-scrollable style="max-height: 600px">
        <n-code 
          :code="detail?.code" 
          language="cpp" 
          :hljs="hljs" 
          show-line-numbers 
          class="code-content"
        />
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { StatusDetail } from '@/composables/useStatusDetail';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';

// 如果需要其他语言需要在这里继续 register
// hljs.registerLanguage('cpp', cpp);

const props = defineProps<{ detail: StatusDetail }>();
const message = useMessage();

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
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  
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

const handleCopy = () => {
  if (props.detail?.code) {
    copyText(props.detail.code);
  }
};
</script>

<style scoped lang="less">
.compiler-msg {
  margin-bottom: 16px;
  .msg-content {
    margin: 0;
    font-family: 'Consolas', monospace;
    font-size: 13px;
    white-space: pre-wrap;
  }
}

.code-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;

  .code-toolbar {
    background: #f5f7fa;
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
    
    .lang-info {
      display: flex;
      gap: 12px;
      font-size: 13px;
      
      .lang { font-weight: bold; color: #333; }
      .size { color: #999; }
    }
  }

  .code-content {
    padding: 16px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
  }
}
</style>