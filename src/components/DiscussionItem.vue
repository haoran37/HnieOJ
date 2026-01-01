<template>
  <div class="discussion-item" @click="$emit('click-card')">
    <div class="avatar-box">
      <n-avatar
        round
        :size="42"
        src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
      />
    </div>

    <div class="content-box">
      <div class="title" @click.stop="$emit('click-title')">
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
        <span class="date">@{{ date }}</span>
      </div>
    </div>

     <div class="info-box">
      <n-button
        text
        type="primary"
        class="link-btn"
        @click.stop="$emit('click-id', problemId)"
      >
        {{ problemId }}
      </n-button>

      <span class="divider">|</span>

      <n-button
        text
        type="primary"
        class="link-btn"
        @click.stop="$emit('click-type', problemType)"
      >
        {{ problemType }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  username: string
  date: string
  problemId: string | number
  problemType: string
}>()

defineEmits([
  'click-card',
  'click-title',
  'click-user',
  'click-id',
  'click-type'
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
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f0faff;
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    transform: translateX(4px);
  }
}

.avatar-box {
  margin-right: 15px;
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
  color: #007bff;

  &:hover {
    text-decoration: underline;
  }
}

.title-ellipsis {
  display: block;
  width: 100%;
  overflow: hidden;

  font-size: 15px;
  font-weight: 500;
  color: #007bff;
  line-height: 22px;
}

.meta {
  font-size: 12px;

  .username {
    color: #18a058;
    font-weight: bold;
    margin-right: 8px;

    &:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
  }

  .date {
    color: #999;
  }
}

.info-box {
  display: flex;
  align-items: center;
  margin-left: 10px;
  white-space: nowrap;

  .link-btn {
    font-size: 14px;
    font-weight: 400;
  }

  .divider {
    margin: 0 8px;
    color: #007bff;
    opacity: 0.5;
  }
}
</style>
