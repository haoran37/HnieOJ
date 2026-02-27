<template>
  <footer class="page-footer">
    <div class="content-limit-container">
      <div class="powered-info">{{ SITE_CONFIG.footer.poweredBy }}</div>

      <div class="copyright-info">
        <span>{{ SITE_CONFIG.footer.copyright }}</span>
        <span class="divider">|</span>
        <a
          :href="SITE_CONFIG.footer.icpLink"
          target="_blank"
          rel="noopener noreferrer"
          class="icp-link"
        >
          {{ SITE_CONFIG.footer.icp }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { SITE_CONFIG } from '@/configs'
</script>

<style scoped lang="less">
.page-footer {
  width: 100%;
  padding: 16px 0;
  background-color: #fff;
  border-top: 1px solid #eef2f7;
}

.content-limit-container {
  width: 100%;
  padding: 0 5%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
}

.powered-info {
  color: #8791a5;
  margin-bottom: 6px;
}

.copyright-info {
  color: #4a5468;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;

  .divider {
    margin: 0 10px;
    color: #c6ceda;
  }
}

.icp-link {
  color: #4a5468;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: var(--oj-color-primary);
  }
}

@media (max-width: 640px) {
  .content-limit-container {
    font-size: 12px;
  }
}
</style>
