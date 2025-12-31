<template>
  <footer class="page-footer">
    <div class="content-limit-container">
      <div class="powered-info">
        {{ SITE_CONFIG.footer.poweredBy }}
      </div>
      
      <div class="copyright-info">
        <span>{{ SITE_CONFIG.footer.copyright }}</span>
        <span class="divider">|</span>
        <a :href="SITE_CONFIG.footer.icpLink" target="_blank" class="icp-link">
          {{ SITE_CONFIG.footer.icp }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { SITE_CONFIG } from '@/configs';
</script>

<style scoped lang="less">
@side-padding: 5%;

@color-gray: #999999;
@color-dark: #333333;

.page-footer {
  width: 100%;
  padding: 10px 0;
  background-color: #f9f9f9;
  border-top: 1px solid #eeeeee;
  display: flex;
  justify-content: center;
}

.content-limit-container {
  width: 100%;
  padding: 0 5%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center; // 居中排列
  text-align: center;
  font-size: 14px;
  line-height: 1;
}

.powered-info {
  color: @color-gray;
  margin-bottom: 8px;
}

.copyright-info {
  color: @color-dark;
  display: flex;
  align-items: center;
  flex-wrap: wrap; // 手机端自动换行
  justify-content: center;

  .divider {
    margin: 0 12px;
    color: #ccc;
  }

  .icp-link {
    color: @color-dark;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #1a3968;
    }
    // 禁用原生过渡效果
    .n-menu-item-content,
    .n-menu-item-content-header,
    .n-menu-item-content-header a {
        transition: none !important; 
    }
  }
}

/* 适配手机端 */
@media (max-width: 640px) {
  .page-footer {
    padding: 24px 0;
  }
  .content-limit-container {
    font-size: 12px;
  }
}
</style>