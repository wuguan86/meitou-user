import { useState, useEffect } from 'react';
import { storageApi } from '../api/storage';

const urlCache = new Map<string, { url: string; expiry: number }>();
const CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (slightly less than 1 hour server expiry)

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
  return host.includes('.aliyuncs.com') && host.includes('oss-');
};

const isAlreadySignedUrl = (url: string) =>
  /[?&](OSSAccessKeyId|Signature|Expires|x-oss-signature)=/i.test(url);

export const needsSignedUrl = (url?: string) => {
  if (!url) return false;
  if (isInlineUrl(url)) return false;
  if (isRelativePathUrl(url)) return false;
  if (isAlreadySignedUrl(url)) return false;
  if (isHttpUrl(url)) return isOssLikeUrl(url);
  return true;
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
    const cached = urlCache.get(originalUrl);
    if (cached && cached.expiry > Date.now()) {
      setSignedUrl(cached.url);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchSignedUrl = async () => {
      try {
        const url = await storageApi.getFileUrl(originalUrl);
        if (isMounted) {
          setSignedUrl(url);
          // Update cache
          urlCache.set(originalUrl, { url, expiry: Date.now() + CACHE_DURATION });
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
