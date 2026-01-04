import { h } from 'vue';
import { NProgress, NRate, NTooltip } from 'naive-ui';
import type { TrainingSheet } from '@/composables/useTrainingList';

export const createTrainingColumns = (onTitleClick: (id: string) => void) => [
  {
    title: '编号',
    key: 'id',
    width: 80,
    align: 'center' as const,
    render: (row: TrainingSheet) => row.id
  },
  {
    title: '名称',
    key: 'title',
    render(row: TrainingSheet) {
      return h(
        'a',
        {
          style: { textDecoration: 'none', color: '#2080f0', fontWeight: 'bold', cursor: 'pointer' },
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            onTitleClick(row.id);
          }
        },
        row.title
      );
    }
  },
  {
    title: '完成度',
    key: 'completion',
    width: 200,
    render(row: TrainingSheet) {
      return h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () => h(NProgress, {
            type: 'line',
            percentage: row.completion,
            indicatorPlacement: 'inside', // 百分比显示在进度条内
            color: row.completion === 100 ? '#18a058' : '#2080f0',
            height: 18,
            borderRadius: 4
          }),
          default: () => `已完成 ${row.acCount} / 总计 ${row.totalCount}`
        }
      );
    }
  },
  {
    title: '题目数',
    key: 'totalCount',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '收藏数',
    key: 'favoriteCount',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '评分',
    key: 'rating',
    width: 150,
    align: 'center' as const,
    render(row: TrainingSheet) {
      return h(NRate, {
        readonly: true,
        defaultValue: row.rating,
        allowHalf: true,
        size: 'small'
      });
    }
  },
  {
    title: '创建者',
    key: 'creator',
    width: 120,
    align: 'left' as const,
    render: (row: TrainingSheet) => h('span', { style: 'color: #666' }, row.creator)
  }
];