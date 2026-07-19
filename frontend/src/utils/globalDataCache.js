import { api } from "./api";

let announcementCache = {
  hasData: false,
  data: null,
  promise: null,
  expiresAt: 0,
};

let themeCache = {
  hasData: false,
  data: null,
  promise: null,
  expiresAt: 0,
};

export async function getActiveAnnouncement() {
  const now = Date.now();

  if (announcementCache.hasData && now < announcementCache.expiresAt) {
    return announcementCache.data;
  }

  if (announcementCache.promise) {
    return announcementCache.promise;
  }

  announcementCache.promise = api.get('/admin/announcements/active')
    .then((res) => {
      const data = res || null;
      announcementCache.data = data;
      announcementCache.hasData = true;
      announcementCache.expiresAt = Date.now() + 60000; // 60 seconds cache
      announcementCache.promise = null;
      return data;
    })
    .catch((err) => {
      announcementCache.promise = null;
      throw err;
    });

  return announcementCache.promise;
}

export async function getActiveTheme() {
  const now = Date.now();

  if (themeCache.hasData && now < themeCache.expiresAt) {
    return themeCache.data;
  }

  if (themeCache.promise) {
    return themeCache.promise;
  }

  themeCache.promise = api.get('/admin/active-theme')
    .then((res) => {
      const data = res || null;
      themeCache.data = data;
      themeCache.hasData = true;
      themeCache.expiresAt = Date.now() + 300000; // 5 minutes cache (5 * 60 * 1000 = 300000)
      themeCache.promise = null;
      return data;
    })
    .catch((err) => {
      themeCache.promise = null;
      throw err;
    });

  return themeCache.promise;
}

export function invalidateAnnouncementCache() {
  announcementCache.data = null;
  announcementCache.hasData = false;
  announcementCache.expiresAt = 0;
  announcementCache.promise = null;
}

export function invalidateThemeCache() {
  themeCache.data = null;
  themeCache.hasData = false;
  themeCache.expiresAt = 0;
  themeCache.promise = null;
}

export function primeActiveTheme(theme) {
  const data = typeof theme === 'string' ? { theme } : theme;
  themeCache.data = data;
  themeCache.hasData = true;
  themeCache.expiresAt = Date.now() + 300000; // 5 minutes cache
  themeCache.promise = null;
}
