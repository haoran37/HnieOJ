<template>
  <div class="comments-section">
    <n-divider style="margin: 12px 0 8px 0; opacity: 0.6;" />
    
    <div class="comment-list" v-if="comments.length > 0">
      <div v-for="comment in comments" :key="comment.id" class="comment-row">
        
        <div class="comment-main">
          <span class="comment-content">{{ comment.content }}</span>
          <span class="comment-meta">
            – 
            <span class="comment-user" @click="$emit('reply-user', comment.user.username)">
              {{ comment.user.username }}
            </span>
            <span class="comment-time">{{ comment.time }}</span>
          </span>
        </div>
        
        <div class="comment-actions">
           <n-button text size="tiny" class="action-icon like" title="点赞" @click="handleLike(comment.id)">
             <template #icon><n-icon><ThumbsUp /></n-icon></template>
             <span v-if="comment.likes > 0" class="count">{{ comment.likes }}</span>
           </n-button>
           
           <n-button text size="tiny" class="action-icon reply" title="回复" @click="$emit('reply-user', comment.user.username)">
             <template #icon><n-icon><ReplyIcon /></n-icon></template>
           </n-button>

           <n-button text size="tiny" class="action-icon delete" title="删除" @click="handleDelete(comment.id)">
             <template #icon><n-icon><TrashBin /></n-icon></template>
           </n-button>
        </div>
      </div>
    </div>

    <div v-if="visible" class="comment-editor-box">
      <n-input
        v-model:value="inputValue"
        type="textarea"
        placeholder="使用评论询问更多细节..."
        :autosize="{ minRows: 2, maxRows: 4 }"
        size="small"
        ref="inputRef"
      />
      <div class="editor-actions">
        <n-button type="primary" size="tiny" @click="handleSubmit">提交评论</n-button>
        <n-button size="tiny" text @click="$emit('close')">取消</n-button>
      </div>
    </div>
    
    <div v-else class="add-comment-link">
      <n-button text size="tiny" type="primary" style="opacity: 0.7" @click="$emit('open')">
        添加评论
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { 
  ThumbsUpOutline as ThumbsUp, 
  TrashOutline as TrashBin,
  ChatboxOutline as ReplyIcon 
} from '@vicons/ionicons5';
import { useMessage } from 'naive-ui';

const message = useMessage();

const props = defineProps<{
  comments: any[];
  visible: boolean;
  initialText?: string;
}>();

const emit = defineEmits(['submit', 'close', 'open', 'reply-user']);

const inputValue = ref('');
const inputRef = ref();

watch(() => props.initialText, (val) => {
  if (val) {
    inputValue.value = val;
    nextTick(() => inputRef.value?.focus());
  }
});

const handleSubmit = () => {
  if (!inputValue.value.trim()) return;
  emit('submit', inputValue.value);
  inputValue.value = '';
};

//TODO: 实现逻辑
const handleLike = (id: number) => {
  message.info(`[事件] 给评论 ${id} 点赞`);
};

//TODO: 实现逻辑
const handleDelete = (id: number) => {
  message.info(`[事件] 删除评论 ${id}`);
};
</script>

<style scoped lang="less">
.comments-section {
  padding: 0 4px;
}

.comment-row {
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  line-height: 1.4;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;

  &:last-child { border-bottom: none; }

  .comment-main {
    flex: 1;
    word-break: break-word;
    
    .comment-content { color: #232629; margin-right: 6px; }
    .comment-meta {
      color: #999;
      font-size: 12px;
      white-space: nowrap;
      
      .comment-user { 
        color: #0074cc; 
        cursor: pointer; 
        margin-right: 4px;
        &:hover { text-decoration: underline; }
      }
    }
  }

  .comment-actions {
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;

    .action-icon {
      color: #aaa;
      &:hover { color: #2080f0; }
      &.delete:hover { color: #d03050; }
      .count { margin-left: 2px; font-size: 12px; }
    }
  }

  &:hover .comment-actions { opacity: 1; }
}

.comment-editor-box {
  margin-top: 12px;
  background: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
  
  .editor-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
}

.add-comment-link {
  margin-top: 8px;
}
</style>