import React from 'react';
import { useSignedUrl } from '../hooks/useSignedUrl';

interface SecureVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
}

export const SecureVideo: React.FC<SecureVideoProps> = ({ src, poster, className, ...props }) => {
  const { signedUrl } = useSignedUrl(src);
  const { signedUrl: signedPosterUrl } = useSignedUrl(typeof poster === 'string' ? poster : undefined);
  const isInline = Boolean(src && /^(data:|blob:)/i.test(src));
  const finalSrc = isInline ? src : signedUrl;
  const finalPoster = signedPosterUrl || poster;
  const reloadKey = `${finalSrc ?? ''}__${typeof finalPoster === 'string' ? finalPoster : ''}`;

  if (!finalSrc) {
    return <div className={className} />;
  }

  return <video key={reloadKey} src={finalSrc} poster={finalPoster} className={className} {...props} />;
};
