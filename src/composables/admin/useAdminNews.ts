import { useAnnouncement } from './useAnnouncement';

export type { GeneralAnnouncement } from './useAnnouncement';

/**
 * 新闻管理：复用公告业务并固定 category=NEWS。
 * 页面沿用与公告管理相同的 Naive UI 布局，通过同一套 /api/admin/announcements 接口完成真实 CRUD。
 */
export function useAdminNews() {
  return useAnnouncement('NEWS');
}
