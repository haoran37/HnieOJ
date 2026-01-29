<template>
  <div class="contest-mode-container">
    <!-- Header -->
    <header class="header">
      <img src="@/assets/hie.svg" alt="HIE Logo" class="logo">
      <div class="divider"></div>
      <div class="brand-info">
        <div class="brand-top">
          <h2 class="brand-name">HnieOJ</h2>
          <span class="brand-tag">CONTEST NODE</span>
        </div>
        <div class="brand-bottom">
          <span class="brand-desc">Online Judge System</span>
        </div>
      </div>
    </header>

    <!-- Server Status (Top Right) -->
    <div class="server-status">
      <div class="status-group">
        <div class="status-item">
          <span class="status-dot"></span>
          <span>Server_Online: {{ contestInfo.serverNode }}</span>
        </div>
        
        <div class="latency-item">
          LATENCY: <span class="latency-value">{{ contestInfo.latency }}</span>
        </div>
        
        <div class="status-divider"></div>
        
        <div class="time-item">
          <span>System_Time: </span>
          <span class="mono-text">{{ systemTime }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="main-content">
      <n-spin :show="loading">
        <div class="title-section">
          <h1 class="main-title">{{ contestInfo.title }}</h1>
          <p class="subtitle">
            {{ contestInfo.subtitle }}
          </p>
        </div>

        <div class="timer-section">
          <div class="timer-display">
            <div class="timer-block">
              <span class="timer-value">{{ timeRemaining.hours }}</span>
              <span class="timer-label">Hours</span>
            </div>
            <span class="timer-separator">:</span>
            <div class="timer-block">
              <span class="timer-value">{{ timeRemaining.minutes }}</span>
              <span class="timer-label">Minutes</span>
            </div>
            <span class="timer-separator">:</span>
            <div class="timer-block">
              <span class="timer-value accent">{{ timeRemaining.seconds }}</span>
              <span class="timer-label accent">Seconds</span>
            </div>
          </div>
          
          <p class="timer-footer">距离比赛开始仅剩</p>
        </div>

        <div class="action-section">
          <router-link to="/login" class="login-btn">
            <span class="btn-bg"></span>
            <span class="btn-content">
              <span class="btn-text">登录比赛系统</span>
              <n-icon size="16">
                <ArrowForward />
              </n-icon>
            </span>
          </router-link>
          <p class="login-hint">请使用统一分配的账号与密码登录</p>
        </div>
      </n-spin>
    </main>

    <!-- Background Watermark -->
    <div class="bg-watermark">
      <span class="watermark-text">HNIEOJ</span>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-divider"></div>
      
      <div class="footer-org">
        主办单位：计算机科学与技术学院
      </div>
      
      <div class="footer-info">
        <div class="footer-text">
          MANAGED BY ACM LAB ALGORITHM TEAM
        </div>
        
        <div class="footer-text">
          VER. 4.2.0 <span class="footer-sep">/</span> BUILD 2024.10
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useContestMode } from '@/composables/admin/useContestMode';
import { ArrowForward } from '@vicons/ionicons5';
import { NSpin, NIcon } from 'naive-ui';

const { contestInfo, loading, timeRemaining, systemTime } = useContestMode();
</script>

<style lang="less" scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;700&family=JetBrains+Mono:wght@300;400;500;700&family=Inter:wght@400;500;600&display=swap');

:deep(body) {
  margin: 0;
  padding: 0;
}

.contest-mode-container {
  --primary-blue: #0A2463;
  --accent-blue: #1E40AF;
  
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  user-select: none;
  background-color: #FAFAFA;
  color: #1F2937;
  font-family: 'Inter', sans-serif;

  // 网格背景
  // Background Grid Pattern
  // background-image: 
  //   linear-gradient(#E5E7EB 1px, transparent 1px),
  //   linear-gradient(90deg, #E5E7EB 1px, transparent 1px);
  // background-size: 40px 40px;

  // 原点背景
  // background-image: radial-gradient(#D1D5DB 1.5px, transparent 1.5px);
  // background-size: 24px 24px;
}

.header {
  position: absolute;
  top: 2rem;
  left: 2rem;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  gap: 1rem;

  .logo {
    height: 3rem;
    width: auto;
    object-fit: contain;
    opacity: 0.9;
  }

  .divider {
    height: 2.5rem;
    width: 1px;
    background-color: #D1D5DB;
    align-self: center;
  }

  .brand-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 3rem;
    padding: 0.125rem 0;

    .brand-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .brand-name {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        color: var(--primary-blue);
        font-family: 'JetBrains Mono', monospace;
        line-height: 1;
        margin: 0;
      }

      .brand-tag {
        padding: 0.125rem 0.375rem;
        font-size: 0.5rem;
        font-weight: 700;
        background-color: #F3F4F6;
        color: #6B7280;
        border-radius: 0.25rem;
        border: 1px solid #E5E7EB;
        letter-spacing: 0.05em;
      }
    }

    .brand-bottom {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .brand-desc {
        font-size: 0.6rem;
        color: #9CA3AF;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 500;
      }
    }
  }
}

.server-status {
  position: absolute;
  top: 2rem;
  right: 2rem;
  z-index: 20;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;

  .status-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;

    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6B7280;

      .status-dot {
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 9999px;
        background-color: #10B981;
        position: relative;
        top: 1px;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    }

    .latency-item {
      color: #6B7280;
      letter-spacing: 0.025em;

      .latency-value {
        color: #059669;
        font-weight: 700;
        margin-left: 0.25rem;
      }
    }

    .status-divider {
      width: 8rem;
      height: 1px;
      background-color: #E5E7EB;
      margin: 0.25rem 0;
    }

    .time-item {
      color: #6B7280;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  width: 100%;
  max-width: 64rem; // here
  margin: 0 auto;
  padding: 0 1rem;
}

.title-section {
  text-align: center;
  margin-bottom: 4rem;
  
  .main-title {
    font-family: 'Noto Serif SC', serif;
    font-weight: 700;
    font-size: 2.25rem;
    color: #111827;
    letter-spacing: 0.025em;
    margin: 0 0 1rem 0;
    
    @media (min-width: 768px) {
      font-size: 3.75rem;
    }
  }

  .subtitle {
    font-size: 0.75rem;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 500;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 1rem;
    display: inline-block;
    padding-left: 3rem;
    padding-right: 3rem;
    margin: 0;
    
    @media (min-width: 768px) {
      font-size: 0.875rem;
    }
  }
}

.timer-section {
  text-align: center;
  margin-bottom: 4rem;

  .timer-display {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 1rem;
    font-family: 'JetBrains Mono', monospace;
    color: var(--primary-blue);
    
    @media (min-width: 768px) {
      gap: 2rem;
    }
  }

  .timer-block {
    display: flex;
    flex-direction: column;
    align-items: center;

    .timer-value {
      font-size: 3.75rem;
      font-weight: 300;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      
      @media (min-width: 768px) {
        font-size: 6rem;
      }
      
      &.accent {
        color: var(--accent-blue);
        font-weight: 500;
      }
    }

    .timer-label {
      font-size: 0.75rem;
      color: #9CA3AF;
      margin-top: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      
      &.accent {
        color: var(--accent-blue);
        font-weight: 700;
      }
    }
  }

  .timer-separator {
    font-size: 2.25rem;
    color: #D1D5DB;
    margin-bottom: 1.5rem;
    font-weight: 300;
    
    @media (min-width: 768px) {
      font-size: 3.75rem;
    }
  }

  .timer-footer {
    margin-top: 2rem;
    font-size: 0.875rem;
    color: #9CA3AF;
    font-family: 'Noto Serif SC', serif;
  }
}

.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .login-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 2.5rem;
    overflow: hidden;
    font-weight: 500;
    color: var(--primary-blue);
    text-decoration: none;
    transition: all 0.3s ease-out;
    border: 2px solid var(--primary-blue);
    border-radius: 0.125rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

    &:hover {
      color: white;
      
      .btn-bg {
        opacity: 1;
      }
      
      .btn-content svg {
        transform: translateX(0.25rem);
      }
    }

    .btn-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background-color: var(--primary-blue);
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }

    .btn-content {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      .btn-text {
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.875rem;
        font-weight: 700;
      }
      
      svg {
        transition: transform 0.3s;
      }
    }
  }

  .login-hint {
    font-size: 0.625rem;
    color: #9CA3AF;
    margin: 0;
  }
}

.bg-watermark {
  position: absolute;
  bottom: 0;
  left: 0.5rem;
  z-index: 0;
  pointer-events: none;
  user-select: none;
  overflow: hidden;

  .watermark-text {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 900;
    font-size: 12rem;
    color: #E5E7EB;
    opacity: 0.3;
    line-height: 1;
    letter-spacing: -0.05em;
    white-space: nowrap;
  }
}

.footer {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 20;

  .footer-divider {
    width: 12rem;
    height: 1px;
    background-color: #D1D5DB;
    margin-bottom: 0.5rem;
  }

  .footer-org {
    font-family: 'Noto Serif SC', serif;
    color: #111827;
    font-weight: 700;
    letter-spacing: 0.05em;
    font-size: 0.875rem;
    margin-bottom: 0.375rem;
  }

  .footer-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;

    .footer-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.625rem;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.1em;

      .footer-sep {
        margin: 0 0.25rem;
        color: #D1D5DB;
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
