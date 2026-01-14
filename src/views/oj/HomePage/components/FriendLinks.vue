<template>
  <BoardCard title="友情链接" class="friend-links-card">
    <template #icon>
      <n-icon size="22"><LinkIcon /></n-icon>
    </template>

    <n-flex vertical size="large" class="links-container">
      
      <div class="link-group">
        <div class="group-title">校内资源</div>
        <n-flex :size="[0, 0]" align="center" class="link-content">
          <a :href="placeholderUrl" target="_blank">校内镜像站</a>
          <span class="divider">|</span>
          <a :href="placeholderUrl" target="_blank">Jupyter Notebook在线实验环境</a>
          <span class="divider">|</span>
          <a :href="placeholderUrl" target="_blank">MicroLinux在线Linux实验环境</a>
        </n-flex>
      </div>

      <div class="link-group">
        <div class="group-title">公开资源</div>
        <n-flex :size="[0, 0]" align="center" class="link-content">
          <a :href="placeholderUrl" target="_blank">GitHub仓库</a>
          <span class="divider">|</span>
          <a :href="placeholderUrl" target="_blank">Gitee仓库</a>
          <span class="divider">|</span>
          <a :href="placeholderUrl" target="_blank">收藏夹</a>
        </n-flex>
      </div>

      <div class="link-group">
        <div class="group-title">实验室资源</div>
        <n-flex :size="[0, 0]" align="center" class="link-content">
          <template v-for="(item, index) in labResources" :key="item">
            <a :href="placeholderUrl" target="_blank">{{ item }}</a>
            <span v-if="index !== labResources.length - 1" class="divider">|</span>
          </template>
        </n-flex>
      </div>

      <div class="link-group">
        <div class="group-title">关于我们</div>
        <n-flex :size="[0, 0]" align="center" class="link-content">
          <a :href="placeholderUrl" target="_blank">HNIEOJ项目介绍</a>
          <span class="divider">|</span>
          <a :href="placeholderUrl" target="_blank">ACM实验介绍</a>
        </n-flex>
      </div>

    </n-flex>
  </BoardCard>
</template>

<script setup lang="ts">
import { LinkOutline as LinkIcon } from '@vicons/ionicons5';
import BoardCard from '@/components/BoardCard.vue';

// TODO: 占位链接，后续替换为真实链接
const placeholderUrl = "https://whatcanisay.man";
const labResources = ['GitLab仓库', 'Alist云盘', 'AutoDL', 'PVE', 'NAS', 'ChatGPT', '打印机驱动'];
</script>

<style scoped lang="less">
.friend-links-card {
  :deep(.n-card__content) {
    padding: 12px 15px;
  }
}

.link-group {
  .group-title {
    font-size: 15px;
    font-weight: bold;
    color: #333;
  }

  .link-content {
    a {
      color: #2080f0;
      text-decoration: none;
      font-size: 14px;
      white-space: nowrap;
      
      &:hover {
        text-decoration: underline;
      }
    }

    .divider {
      margin: 0 8px;
      color: #999;
      font-size: 12px;
    }
  }
}
</style>