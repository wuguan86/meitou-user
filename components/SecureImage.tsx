import React, { useEffect, useState } from 'react';
import { needsSignedUrl, useSignedUrl } from '../hooks/useSignedUrl';
import { Skeleton } from 'antd';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
}

export const SecureImage: React.FC<SecureImageProps> = ({ src, fallback, style, ...props }) => {
  const { signedUrl, loading } = useSignedUrl(src);
  const [hasError, setHasError] = useState(false);
  const requiresSignedUrl = needsSignedUrl(src);

  useEffect(() => {
    setHasError(false);
  }, [src, signedUrl]);

  if (requiresSignedUrl && !signedUrl) {
    if (loading) {
      return <Skeleton.Image active style={{ width: '100%', height: '100%', ...style }} />;
    }
    return (
      fallback ?? (
        <div
          style={{ width: '100%', height: '100%', ...style }}
          className="bg-[#0d1121] border border-white/5"
        />
      )
    );
  }

  if (hasError) {
    return (
      fallback ?? (
        <div
          style={{ width: '100%', height: '100%', ...style }}
          className="bg-[#0d1121] border border-white/5"
        />
      )
    );
  }

  return (
    <img
      src={signedUrl || src}
      referrerPolicy="no-referrer"
      style={style}
      onError={(e) => {
        props.onError?.(e);
        setHasError(true);
      }}
      {...props}
    />
  );
};
