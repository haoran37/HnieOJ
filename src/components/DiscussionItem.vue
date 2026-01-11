<template>
  <div class="discussion-item" @click="$emit('click-card')">
    
    <div class="avatar-box">
      <n-avatar
        round
        :size="42"
        :src="avatar || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'"
      />
    </div>

    <div class="content-box">
      <div class="title" @click.stop="$emit('click-title')">
        <n-tag v-if="isTop" type="error" size="small" :bordered="false" class="top-tag">置顶</n-tag>
        <n-ellipsis
          class="title-ellipsis"
          :line-clamp="1"
          :tooltip="{ placement: 'top-start', scrollable: true }"
        >
          {{ title }}
        </n-ellipsis>
      </div>

      <div class="meta">
        <span class="username" @click.stop="$emit('click-user', username)">
          {{ username }}
        </span>
        <span class="date">发布于 {{ date }}</span>
      </div>
    </div>

    <div class="right-info-column">
      
      <div class="tags-row">
        <n-button
          v-if="problemId"
          text
          type="primary"
          class="link-btn"
          @click.stop="$emit('click-id', problemId)"
        >
          {{ problemId }}
        </n-button>

        <span class="divider" v-if="problemId">|</span>

        <n-tag 
          :type="category === 'Site' ? 'info' : 'warning'" 
          size="small" 
          :bordered="false"
          class="category-tag"
          @click.stop="$emit('click-category', category)"
        >
          {{ category === 'Site' ? '站内事务' : '题目讨论' }}
        </n-tag>
      </div>

      <div class="reply-row">
        <n-icon class="icon"><ChatbubblesIcon /></n-icon>
        <span>{{ replyCount }}</span>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatbubblesOutline as ChatbubblesIcon } from '@vicons/ionicons5';
import { NTag, NAvatar, NEllipsis, NButton, NIcon } from 'naive-ui';

defineProps<{
  title: string
  username: string
  avatar?: string
  date: string
  problemId?: string | null
  category: 'Site' | 'Problem'
  replyCount: number
  isTop?: boolean
}>()

defineEmits([
  'click-card',
  'click-title',
  'click-user',
  'click-id',
  'click-category'
])
</script>

<style scoped lang="less">
.discussion-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1.5px solid #5fb4e5;
  border-radius: 4px;
  margin-bottom: 10px;
  background-color: #fff;
  transition: all 0.2s;

  // &:hover {
    // background-color: #f0faff;
    // border-color: #007bff;
    // box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    // transform: translateX(4px); // 向右浮动
  // }
}

.avatar-box {
  margin-right: 15px;
  flex-shrink: 0;
}

.content-box {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 4px;
}

.title {
  display: flex;
  align-items: center;
  height: 22px;
  margin-bottom: 4px;
  cursor: pointer;
  color: #333;
  font-weight: 600;
  width: fit-content;
  max-width: 100%;

  .top-tag {
    margin-right: 6px;
    height: 18px;
    line-height: 18px;
    font-size: 12px;
  }

  // &:hover {
  //   color: #2080f0;
  // }
}

.title-ellipsis {
  display: block;
  width: 100%;
  overflow: hidden;
  font-size: 15px;
  line-height: 22px;
}

.meta {
  font-size: 12px;
  display: flex;
  align-items: center;
  
  .username {
    color: #18a058;
    font-weight: bold;
    margin-right: 8px;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
  }

  .date {
    color: #999;
  }
}

.right-info-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  margin-left: 16px;
  min-width: 100px; 

  .tags-row {
    display: flex;
    align-items: center;
    
    .link-btn {
      font-size: 14px;
      font-weight: 500;
      &:hover {
        text-decoration: underline;
        opacity: 0.8;
      }
    }

    .divider {
      margin: 0 8px;
      color: #ccc;
    }

    .category-tag {
      cursor: pointer;
      &:hover { opacity: 0.8; }
    }
  }

  .reply-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #999;
    
    .icon { font-size: 14px; margin-top: 1px; }
  }
}
</style>