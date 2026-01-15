<template>
  <div class="user-layout-container">
    <div class="layout-content">
      
      <n-grid x-gap="20" cols="1 l:4" responsive="screen">
        
        <n-grid-item span="3">
          <div class="menu-wrapper">
            <n-tabs 
              type="line" 
              animated
              :value="currentTab" 
              @update:value="handleTabChange"
              pane-style="display:none"
            >
              <n-tab name="home">主页</n-tab>
              <n-tab name="homework">作业</n-tab>
              <n-tab name="contest">比赛</n-tab>
              <n-tab name="training">题单</n-tab>
              <n-tab name="discuss">讨论</n-tab>
              <n-tab name="message">消息</n-tab>
              <n-tab name="setting">设置</n-tab>
            </n-tabs>
          </div>

          <div class="main-view-wrapper">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </n-grid-item>

        <n-grid-item span="1">
          <UserSideBar />
        </n-grid-item>
      </n-grid>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserSideBar from './components/UserSideBar.vue';

const route = useRoute();
const router = useRouter();

const currentTab = ref<'home' | string>('home');

const updateTab = () => {
  const name = route.name as string | undefined;
  if (!name) {
    currentTab.value = 'home';
    return;
  }
  if (name === 'UserHome') {
    currentTab.value = 'home';
  } else if (name.startsWith('User')) {
    currentTab.value = name.replace('User', '').toLowerCase();
  }
};
const handleTabChange = (val: string) => {
  currentTab.value = val;
  const name =
    val === 'home'
      ? 'UserHome'
      : `User${val.charAt(0).toUpperCase()}${val.slice(1)}`;

  router.push({ name });
};

watch(() => route.name, updateTab);
onMounted(updateTab);
</script>


<style scoped lang="less">
.user-layout-container {
  margin: 0 auto;
  // padding: 24px 16px;
}

.menu-wrapper {
  background: #fff;
  padding: 6px 24px 0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  margin-bottom: 16px;
}

.main-view-wrapper {
  min-height: 500px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>