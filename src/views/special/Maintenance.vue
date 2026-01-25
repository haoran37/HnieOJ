<template>
  <div class="maintenance-page">
    <div class="content">
      <n-icon size="120" color="#f0a020">
        <ConstructOutline />
      </n-icon>
      <h1>系统维护中</h1>
      <p>我们正在对系统进行升级维护，请稍后再访问。</p>
      <div class="footer">
        HnieOJ Team
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
//占位页面
import { NIcon } from 'naive-ui';
import { ConstructOutline } from '@vicons/ionicons5';
</script>

<style scoped lang="less">
.maintenance-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  
  .content {
    text-align: center;
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    max-width: 500px;
    width: 90%;
    
    h1 {
      margin: 20px 0 10px;
      color: #333;
      font-size: 24px;
    }
    
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    
    .footer {
      color: #999;
      font-size: 14px;
      margin-top: 20px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
  }
}
</style>
