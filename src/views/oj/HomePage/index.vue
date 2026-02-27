<template>
  <div class="page-container page-shell">
    <div class="main-layout">
      <div class="layout-left">
        <AnnouncementCard />
        <RankListTable />
        <RecentDiscussions />
      </div>
      <div class="layout-right">
        <RecentContests />
        <UserSidePanel />
        <TopRatingList />
        <TopContributorList />
        <UserSearchBox />
        <FriendLinks />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import AnnouncementCard from './components/AnnouncementCard.vue'
import RankListTable from './components/RankListTable.vue'
import RecentDiscussions from './components/RecentDiscussions.vue'
import RecentContests from './components/RecentContests.vue'
import UserSidePanel from './components/UserSidePanel.vue'
import TopRatingList from './components/TopRatingList.vue'
import UserSearchBox from './components/UserSearchBox.vue'
import FriendLinks from './components/FriendLinks.vue'
import TopContributorList from './components/TopContributorList.vue'

defineOptions({ name: 'OjHomePage' })
</script>

<style scoped lang="less">
.page-container {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.main-layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: nowrap;
}

.layout-left {
  flex: 1 1 65%;
  min-width: 0;
}

.layout-right {
  flex: 0 0 35%;
  min-width: 0;
}

.page-container * {
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  box-sizing: border-box;
  max-width: 100%;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
    gap: 14px;
  }
  .layout-left,
  .layout-right {
    flex: 1 1 auto;
    width: 100%;
  }
}

.layout-left > *,
.layout-right > * {
  margin-bottom: 14px;
  width: 100%;
}
.layout-left > :last-child,
.layout-right > :last-child {
  margin-bottom: 0;
}

:deep(.n-table-cell) {
  white-space: normal;
  word-break: break-all;
  max-width: 0;
}
</style>
