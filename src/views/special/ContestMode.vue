<template>
  <div class="contest-mode-page">
    <div class="contest-card">
      <div class="header">
        <n-icon size="64" color="#18a058">
          <TrophyOutline />
        </n-icon>
        <h2>当前处于比赛模式</h2>
      </div>

      <div class="contest-info" v-if="contest">
        <h1 class="title">{{ contest.title }}</h1>
        <div class="time-info">
          <div class="time-block">
            <span class="label">开始时间</span>
            <span class="value">{{ contest.startTime }}</span>
          </div>
          <div class="time-block">
            <span class="label">结束时间</span>
            <span class="value">{{ contest.endTime }}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <n-button type="primary" size="large" block @click="enterContest">
          进入比赛
        </n-button>
        <div class="login-link" v-if="!isLoggedIn">
          <n-button text type="primary" @click="goToLogin">
            登录账号
          </n-button>
        </div>
        <div class="user-info" v-else>
          当前登录: {{ username }}
          <n-button text type="error" size="small" @click="logout" class="ml-2">
            退出
          </n-button>
        </div>
      </div>
      
      <div class="note">
        注意：比赛模式下仅开放比赛相关功能
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
//占位页面
import { ref, onMounted } from 'vue';
import { NIcon, NButton, useMessage } from 'naive-ui';
import { TrophyOutline } from '@vicons/ionicons5';
import { useRouter } from 'vue-router';

const router = useRouter();
const message = useMessage();

const contest = ref({
  id: '1001',
  title: 'HnieOJ 2024 程序设计竞赛',
  startTime: '2024-05-20 12:00:00',
  endTime: '2024-05-20 17:00:00'
});

const isLoggedIn = ref(false);
const username = ref('User001');

const enterContest = () => {
  if (!isLoggedIn.value) {
    message.warning('请先登录');
    router.push('/login');
    return;
  }
  router.push(`/contest/${contest.value.id}`);
};

const goToLogin = () => {
  router.push('/login');
};

const logout = () => {
  isLoggedIn.value = false;
  message.success('已退出登录');
};

onMounted(() => {
  const token = localStorage.getItem('token');
  if (token) {
    isLoggedIn.value = true;
  }
});
</script>

<style scoped lang="less">
.contest-mode-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  
  .contest-card {
    background: #fff;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 480px;
    text-align: center;
    
    .header {
      margin-bottom: 24px;
      h2 {
        margin: 10px 0 0;
        font-size: 20px;
        color: #333;
        font-weight: normal;
      }
    }
    
    .contest-info {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
      
      .title {
        font-size: 22px;
        color: #18a058;
        margin: 0 0 16px;
      }
      
      .time-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .time-block {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          
          .label {
            color: #666;
          }
          .value {
            color: #333;
            font-weight: 500;
          }
        }
      }
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      
      .login-link, .user-info {
        font-size: 14px;
        color: #666;
      }
      
      .ml-2 {
        margin-left: 8px;
      }
    }
    
    .note {
      margin-top: 24px;
      font-size: 12px;
      color: #999;
    }
  }
}
</style>
