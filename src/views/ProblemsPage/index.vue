<template>
  <div class="problems-page">
    <ProblemFilter />
    <ProblemTable />
  </div>
</template>

<script lang="ts" setup name="ProblemsPage">
import ProblemTable from './components/ProblemTable.vue';
import ProblemFilter from './components/ProblemFilter.vue';

</script>

<style scoped lang="less">
.problems-page {
  width: 90vw; // 才疏学浅，实在是没招了
  margin: 0;
}
</style>