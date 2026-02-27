import { h } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NTag, NRate, NProgress, NSpace } from 'naive-ui'
import { stringToColor, stringToTextColor } from '@/utils/colorUtils'
import { renderStatusIcon } from '@/utils/statusUtils'
import type { ProblemRow } from '@/types/problem'

const difficultyColors: Record<string, string> = {
  入门: '#f56c6c',
  简单: '#f0a020',
  中等: '#2080f0',
  困难: '#7b61ff',
}

export const createColumns = (
  getProblemStatus: (id: string) => string,
  onTitleClick?: (id: string) => void,
): DataTableColumns<ProblemRow> => [
  {
    title: '状态',
    key: 'status',
    width: 60,
    align: 'center',
    render(row) {
      return renderStatusIcon(getProblemStatus(row.id))
    },
  },
  {
    title: '题号',
    key: 'id',
    width: 100,
    render(row) {
      return h('span', { style: { fontWeight: 500 } }, `P${row.id}`)
    },
  },
  {
    title: '题目名称',
    key: 'title',
    render(row) {
      return h('a', {
        href: `/problem/${row.id}`,
        style: {
          textDecoration: 'none',
          color: '#2080f0',
          fontWeight: 600,
        },
        onClick: (event: MouseEvent) => {
          event.preventDefault()
          onTitleClick?.(row.id)
        },
      }, row.title)
    },
  },
  {
    title: '标签',
    key: 'tags',
    render(row) {
      if (!row.tags.length) {
        return null
      }

      return h(NSpace, { size: [4, 4] }, {
        default: () => row.tags.map((tag) => h(NTag, {
          bordered: false,
          size: 'small',
          color: {
            color: stringToColor(tag),
            textColor: stringToTextColor(tag),
            borderColor: 'transparent',
          },
          style: {
            borderRadius: '4px',
            padding: '0 8px',
          },
        }, { default: () => tag })),
      })
    },
  },
  {
    title: '难度',
    key: 'difficulty',
    width: 100,
    render(row) {
      const color = difficultyColors[row.difficulty] ?? '#999'
      return h(NTag, {
        color: { color, textColor: '#fff', borderColor: color },
        style: { borderRadius: '4px' },
        size: 'small',
      }, { default: () => row.difficulty })
    },
  },
  {
    title: '通过率',
    key: 'passRate',
    width: 150,
    render(row) {
      return h(NProgress, {
        type: 'line',
        percentage: row.passRate,
        indicatorPlacement: 'inside',
        color: row.passRate > 50 ? '#18a058' : '#f0a020',
        height: 18,
        borderRadius: 4,
      })
    },
  },
  {
    title: '评分',
    key: 'rate',
    width: 150,
    render(row) {
      return h(NRate, {
        readonly: true,
        defaultValue: Number(row.rate),
        allowHalf: true,
        size: 'small',
      })
    },
  },
]
