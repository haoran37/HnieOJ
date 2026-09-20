import { h } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NTag, NProgress, NSpace } from 'naive-ui'
import { stringToColor, stringToTextColor } from '@/utils/colorUtils'
import { renderStatusIcon } from '@/utils/statusUtils'
import type { ProblemRow } from '@/types/problem'
import { difficultyLabel } from '@/types/problem'

const difficultyColors: Record<number, string> = {
  0: '#f0a020',
  1: '#2080f0',
  2: '#7b61ff',
}

export const createColumns = (
  getProblemStatus: (problemCode: string) => string,
  onTitleClick?: (problemCode: string) => void,
): DataTableColumns<ProblemRow> => [
  {
    title: '状态',
    key: 'status',
    width: 60,
    align: 'center',
    render(row) {
      return renderStatusIcon(getProblemStatus(row.problemCode))
    },
  },
  {
    title: '题号',
    key: 'problemCode',
    width: 110,
    render(row) {
      return h('span', { style: { fontWeight: 500 } }, row.problemCode)
    },
  },
  {
    title: '题目名称',
    key: 'title',
    render(row) {
      return h('a', {
        href: `/problem/${row.problemCode}`,
        style: {
          textDecoration: 'none',
          color: '#2080f0',
          fontWeight: 600,
        },
        onClick: (event: MouseEvent) => {
          event.preventDefault()
          onTitleClick?.(row.problemCode)
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
      const label = difficultyLabel(row.difficulty)
      const color = row.difficulty !== null ? (difficultyColors[row.difficulty] ?? '#999') : '#999'
      return h(NTag, {
        color: { color, textColor: '#fff', borderColor: color },
        style: { borderRadius: '4px' },
        size: 'small',
      }, { default: () => label })
    },
  },
  {
    title: '通过率',
    key: 'passRate',
    width: 170,
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
]
