import { useState, useEffect } from 'react';
import { storageApi } from '../api/storage';

const urlCache = new Map<string, { url: string; expiry: number }>();
const inflightCache = new Map<string, Promise<string>>();
const CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (slightly less than 1 hour server expiry)
const MAX_CONCURRENT_SIGNING = 10;
let activeSigningCount = 0;
const signingQueue: Array<() => void> = [];

const scheduleSigning = <T,>(task: () => Promise<T>) => {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeSigningCount += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeSigningCount -= 1;
          const next = signingQueue.shift();
          next?.();
        });
    };

    if (activeSigningCount < MAX_CONCURRENT_SIGNING) {
      run();
      return;
    }

    signingQueue.push(run);
  });
};

const isInlineUrl = (url?: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.startsWith('data:') || lower.startsWith('blob:');
};

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const isRelativePathUrl = (url: string) => url.startsWith('/') || url.startsWith('./') || url.startsWith('../');

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isOssLikeUrl = (url: string) => {
  if (!isHttpUrl(url)) return false;
  const host = getHostname(url);
  return (
    (host.includes('.aliyuncs.com') && host.includes('oss-')) ||
    host.includes('.myqcloud.com') ||
    host.includes('cos.')
  );
};

const isLikelyStorageObjectUrl = (url: string) => {
  if (!isHttpUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return /\/(app\/)?(images|videos|avatars)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const getSignedUrlExpiryMs = (url: string) => {
  try {
    const parsed = new URL(url);
    const expires = parsed.searchParams.get('Expires');
    if (expires) {
      const seconds = Number(expires);
      if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    }

    const xOssExpires = parsed.searchParams.get('x-oss-expires');
    const xOssDate = parsed.searchParams.get('x-oss-date');
    if (xOssExpires && xOssDate) {
      const seconds = Number(xOssExpires);
      if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
      const y = xOssDate.slice(0, 4);
      const m = xOssDate.slice(4, 6);
      const d = xOssDate.slice(6, 8);
      const hh = xOssDate.slice(9, 11);
      const mm = xOssDate.slice(11, 13);
      const ss = xOssDate.slice(13, 15);
      if ([y, m, d, hh, mm, ss].some((part) => part.length !== 2 && part.length !== 4)) return undefined;
      const baseMs = Date.parse(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
      if (!Number.isFinite(baseMs)) return undefined;
      return baseMs + seconds * 1000;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const isSignedUrlExpired = (url: string) => {
  const expiryMs = getSignedUrlExpiryMs(url);
  if (!expiryMs) return false;
  return Date.now() >= expiryMs - 60_000;
};

const isAlreadySignedUrl = (url: string) =>
  /[?&](OSSAccessKeyId|Signature|Expires|x-oss-signature|q-signature|q-sign-time|sign|X-Amz-Signature)=/i.test(
    url
  );

export const needsSignedUrl = (url?: string) => {
  if (!url) return false;
  if (isInlineUrl(url)) return false;
  if (isRelativePathUrl(url)) return false;
  if (isAlreadySignedUrl(url)) return isSignedUrlExpired(url);
  if (isHttpUrl(url)) return isOssLikeUrl(url) || isLikelyStorageObjectUrl(url);
  return true;
};

const getSignedUrlFromCache = (originalUrl: string) => {
  const cached = urlCache.get(originalUrl);
  if (!cached) return undefined;
  if (cached.expiry <= Date.now()) return undefined;
  return cached.url;
};

const fetchAndCacheSignedUrl = async (originalUrl: string) => {
  const cached = getSignedUrlFromCache(originalUrl);
  if (cached) return cached;

  const inflight = inflightCache.get(originalUrl);
  if (inflight) return inflight;

  const promise = scheduleSigning(() => storageApi.getFileUrl(originalUrl))
    .then((url) => {
      urlCache.set(originalUrl, { url, expiry: Date.now() + CACHE_DURATION });
      return url;
    })
    .finally(() => {
      inflightCache.delete(originalUrl);
    });

  inflightCache.set(originalUrl, promise);
  return promise;
};

export const prefetchSignedUrls = async (urls: Array<string | undefined | null>) => {
  const unique = new Set<string>();
  for (const u of urls) {
    if (!u) continue;
    if (!needsSignedUrl(u)) continue;
    if (isInlineUrl(u)) continue;
    if (getSignedUrlFromCache(u)) continue;
    unique.add(u);
  }

  await Promise.all(
    Array.from(unique).map(async (u) => {
      try {
        await fetchAndCacheSignedUrl(u);
      } catch {
        return;
      }
    })
  );
};

export const useSignedUrl = (originalUrl?: string) => {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(() => {
    if (!originalUrl) return undefined;
    if (isInlineUrl(originalUrl)) return originalUrl;
    if (!needsSignedUrl(originalUrl)) return originalUrl;
    return undefined;
  });
  const [loading, setLoading] = useState(() => Boolean(originalUrl && needsSignedUrl(originalUrl)));

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl(undefined);
      setLoading(false);
      return;
    }

    if (isInlineUrl(originalUrl)) {
      setSignedUrl(originalUrl);
      setLoading(false);
      return;
    }

    if (!needsSignedUrl(originalUrl)) {
      setSignedUrl(originalUrl);
      setLoading(false);
      return;
    }

    setSignedUrl(undefined);
    setLoading(true);

    // Check cache
    const cached = getSignedUrlFromCache(originalUrl);
    if (cached) {
      setSignedUrl(cached);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchSignedUrl = async () => {
      try {
        const url = await fetchAndCacheSignedUrl(originalUrl);
        if (isMounted) {
          setSignedUrl(url);
        }
      } catch (error) {
        console.error('Failed to get signed url', error);
        if (!isMounted) return;
        if (isHttpUrl(originalUrl) && !isOssLikeUrl(originalUrl)) {
          setSignedUrl(originalUrl);
        } else {
          setSignedUrl(undefined);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [originalUrl]);

  return { signedUrl, loading };
};
