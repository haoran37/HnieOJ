import { h } from 'vue';
import { NTag, NRate, NProgress, NIcon, NSpace } from 'naive-ui';
import { stringToColor, stringToTextColor } from '@/utils/colorUtils';
import { renderStatusIcon } from '@/utils/statusUtils'

// 难度颜色映射
const difficultyColors: Record<string, string> = {
  '入门': '#FE4C61', '简单': '#F39C11', '普及-': '#FFC116',
  '普及/提高-': '#52C41A', '困难': '#3498DB',
};

export const createColumns = (
  getProblemStatus: (id: string) => string,
  onTitleClick?: (id: string) => void
) => [
  {
    title: '状态',
    key: 'status',
    width: 60,
    align: 'center' as const,
    render(row: any) {
      const status = getProblemStatus(row.id);
      return renderStatusIcon(status);
    }
  },
  {
    title: '题号',
    key: 'id',
    width: 100,
    render: (row: any) => h('span', { style: 'font-weight: 500' }, `P${row.id}`)
  },
  {
    title: '题目名称',
    key: 'title',
    render(row: any) {
      return h('a', {
        href: `/problem/${row.id}`,
        style: { textDecoration: 'none', color: '#2080f0', fontWeight: 'bold' },
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          if (onTitleClick) {
            onTitleClick(row.id);
          }
        }
      }, row.title);
    }
  },
  {
    title: '标签',
    key: 'tags',
    render(row: any) {
      if (!row.tags?.length) return null;
      return h(NSpace, { size: [4, 4] }, {
        default: () => row.tags.map((tag: string) => h(NTag, {
          bordered: false, size: 'small',
          color: { color: stringToColor(tag), textColor: stringToTextColor(tag), borderColor: 'transparent' },
          style: { borderRadius: '4px', padding: '0 8px' }
        }, { default: () => tag }))
      });
    }
  },
  {
    title: '难度',
    key: 'difficulty',
    width: 100,
    render(row: any) {
      const color = difficultyColors[row.difficulty] || '#999';
      return h(NTag, {
        color: { color, textColor: '#fff', borderColor: color },
        style: { borderRadius: '4px'},
        size: 'small'
      }, { default: () => row.difficulty });
    }
  },
  {
    title: '通过率',
    key: 'passRate',
    width: 150,
    render(row: any) {
      return h(NProgress, {
        type: 'line', percentage: row.passRate, indicatorPlacement: 'inside',
        color: row.passRate > 50 ? '#18a058' : '#f0a020', height: 18, borderRadius: 4
      });
    }
  },
  {
    title: '评分',
    key: 'rate',
    width: 150,
    render(row: any) {
      return h(NRate, {
        readonly: true, defaultValue: Number(row.rate), allowHalf: true, size: 'small'
      });
    }
  }
];