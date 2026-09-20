import { ref } from 'vue';
import { getTags, type TagVo } from '@/utils/api';

export interface TagGroup {
  title: string;
  tags: string[];
}

export interface TagCategory {
  id: string;
  name: string;
  groups: TagGroup[];
}

/** 来源标签的特殊分组 id：TagSelectModal 的 source 模式按此过滤 */
export const SOURCE_CATEGORY_ID = 'source';
export const SOURCE_CATEGORY_NAME = '来源';
const UNCATEGORIZED_ID = 'uncategorized';
const UNCATEGORIZED_NAME = '未分类';

/**
 * 把后端真实标签目录按 category 分组。
 * - category=source（大小写不敏感）映射到现有的「来源」分组；
 * - 其他按真实 category 分组；
 * - category 为空的记录归入「未分类」；
 * - 标签值始终为 name 字符串，不使用 id。
 */
export function toTagCategories(list: TagVo[] | null | undefined): TagCategory[] {
  const categories: TagCategory[] = [];
  const byId = new Map<string, TagCategory>();

  for (const tag of list ?? []) {
    const rawCategory = (tag.category ?? '').trim();
    const isSource = rawCategory.toLowerCase() === SOURCE_CATEGORY_ID;
    const id = isSource ? SOURCE_CATEGORY_ID : rawCategory || UNCATEGORIZED_ID;
    const name = isSource ? SOURCE_CATEGORY_NAME : rawCategory || UNCATEGORIZED_NAME;

    let category = byId.get(id);
    if (!category) {
      category = { id, name, groups: [{ title: name, tags: [] }] };
      byId.set(id, category);
      categories.push(category);
    }
    const group = category.groups[0];
    if (!group) continue;
    if (!group.tags.includes(tag.name)) {
      group.tags.push(tag.name);
    }
  }

  // 来源分组优先展示，其余保持后端返回顺序
  categories.sort((a, b) => {
    if (a.id === SOURCE_CATEGORY_ID) return -1;
    if (b.id === SOURCE_CATEGORY_ID) return 1;
    return 0;
  });

  return categories;
}

/**
 * 标签目录：读取后端 GET /api/tags 的真实数据。
 * 加载失败保留 error（由调用方展示重试），绝不当成“没有标签”的空目录。
 */
export function useTags() {
  const tagData = ref<TagCategory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let seq = 0;

  const fetchTags = async () => {
    const current = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const list = await getTags();
      if (current !== seq) return;
      tagData.value = toTagCategories(list);
    } catch (err) {
      if (current !== seq) return;
      tagData.value = [];
      error.value = err instanceof Error ? err.message : '标签目录加载失败';
    } finally {
      if (current === seq) loading.value = false;
    }
  };

  return { tagData, loading, error, fetchTags };
}
