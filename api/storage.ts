import { request } from './index';

export interface StorageApi {
  getFileUrl(key: string): Promise<string>;
}

const isAliyunSignatureParam = (name: string) => {
  const n = name.toLowerCase();
  return (
    n === 'signature' ||
    n === 'ossaccesskeyid' ||
    n === 'expires' ||
    n === 'security-token' ||
    n === 'x-oss-security-token' ||
    n === 'x-oss-signature' ||
    n === 'x-oss-signature-version' ||
    n === 'x-oss-credential' ||
    n === 'x-oss-date' ||
    n === 'x-oss-expires' ||
    n === 'x-oss-signature-nonce' ||
    n === 'x-oss-additional-headers'
  );
};

const hasAliyunSignature = (url: URL) => {
  for (const k of url.searchParams.keys()) {
    if (isAliyunSignatureParam(k) || k.toLowerCase().startsWith('x-oss-')) return true;
  }
  return false;
};

const normalizeKeyForSigning = (input: string) => {
  if (!input) return input;

  if (!/^https?:\/\//i.test(input)) {
    const queryIndex = input.indexOf('?');
    return queryIndex >= 0 ? input.slice(0, queryIndex) : input;
  }

  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.toLowerCase();
    const isAliyunHost = hostname.includes('.aliyuncs.com');
    const isAliyunSigned = hasAliyunSignature(parsed);

    if (!isAliyunHost && !isAliyunSigned) {
      return input;
    }

    const path = parsed.pathname || '';
    if (!path || path === '/') return input;
    const objectKey = path.startsWith('/') ? path.slice(1) : path;

    const retainedParams: string[] = [];
    parsed.searchParams.forEach((value, key) => {
      if (!isAliyunSignatureParam(key)) {
        retainedParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    });
    const retainedQuery = retainedParams.length ? `?${retainedParams.join('&')}` : '';
    return `${objectKey}${retainedQuery}`;
  } catch {
    const queryIndex = input.indexOf('?');
    return queryIndex >= 0 ? input.slice(0, queryIndex) : input;
  }
};

export const storageApi: StorageApi = {
  getFileUrl: async (key: string) => {
    const normalizedKey = normalizeKeyForSigning(key);
    const url = await request<string>(`/app/storage/url?key=${encodeURIComponent(normalizedKey)}`, {
      method: 'GET',
    });
    return url;
  },
};
