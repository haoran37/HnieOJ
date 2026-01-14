<template>
  <div class="discuss-answer-item white-card">
    
    <div class="answer-header">
      <n-avatar round size="small" :src="answer.user.avatar" />
      <div class="user-info">
        <span class="username">{{ answer.user.username }}</span>
        <span class="time">回答于 {{ answer.time }}</span>
      </div>
    </div>

    <div class="answer-body-layout">
      <div class="vote-column">
        <n-tooltip trigger="hover" placement="right">
          <template #trigger>
            <n-button text class="vote-btn up" :class="{ active: answer.upvoted }" @click="$emit('vote', 'up')">
              <n-icon size="32"><CaretUp /></n-icon>
            </n-button>
          </template>
          这个答案有帮助
        </n-tooltip>

        <span class="vote-count">{{ answer.voteCount }}</span>

        <n-tooltip trigger="hover" placement="right">
          <template #trigger>
            <n-button text class="vote-btn down" :class="{ active: answer.downvoted }" @click="$emit('vote', 'down')">
              <n-icon size="32"><CaretDown /></n-icon>
            </n-button>
          </template>
          这答案没帮助
        </n-tooltip>
      </div>

      <div class="content-column">
        <div class="md-content">
          <v-md-preview :text="answer.content" />
        </div>

        <div class="answer-actions">
          <span class="text-btn reply" @click="toggleComment">回复</span>
          <span v-if="canDelete" class="text-btn delete" @click="handleDeleteAnswer">删除</span>
        </div>

        <DiscussComments
          v-if="showCommentEditor || answer.comments.length > 0"
          :comments="answer.comments"
          :visible="showCommentEditor"
          :initial-text="commentText"
          @open="toggleComment"
          @close="showCommentEditor = false"
          @reply-user="handleReplyUser"
          @submit="(text) => { $emit('submit-comment', text); showCommentEditor = false; }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { CaretUpOutline as CaretUp, CaretDownOutline as CaretDown } from '@vicons/ionicons5';
import DiscussComments from './DiscussComments.vue';


const message = useMessage();

const props = defineProps<{
  answer: any;
  canDelete?: boolean;
}>();

const emit = defineEmits(['vote', 'submit-comment']);

const showCommentEditor = ref(false);
const commentText = ref('');

const toggleComment = () => {
  showCommentEditor.value = !showCommentEditor.value;
  if (!showCommentEditor.value) commentText.value = '';
};

const handleReplyUser = (username: string) => {
  showCommentEditor.value = true;
  commentText.value = `@${username} `;
};


const handleDeleteAnswer = () => {
  message.info(`[事件] 删除回答 ${props.answer.id}`);
};
</script>

<style scoped lang="less">
.white-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 16px;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  
  .user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
    .username { color: #333; font-weight: 600; font-size: 14px; }
    .time { color: #999; font-size: 12px; }
  }
}

.answer-body-layout {
  display: flex;
  gap: 20px;
}

.vote-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
  flex-shrink: 0;
  
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
    margin: 6px 0;
  }
}

.content-column {
  flex: 1;
  min-width: 0;
}

.md-content {
  :deep(.github-markdown-body) { padding: 0; }
}

.answer-actions {
  margin-top: 16px;
  display: flex;
  gap: 16px;
  
  .text-btn {
    font-size: 13px; color: #888; cursor: pointer;
    &:hover { color: #2080f0; }
    &.delete:hover { color: #d03050; }
  }
}
</style>