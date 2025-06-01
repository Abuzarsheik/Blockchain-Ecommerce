import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Image, AlertCircle } from 'lucide-react';
import { optimizeImageUrl, progressiveImageLoad } from '../utils/performance';

const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  quality = 80,
  placeholder,
  fallback,
  lazy = true,
  progressive = true,
  objectFit = 'cover',
  onLoad,
  onError,
  ...props
}) => {
  const [imageState, setImageState] = useState({
    loaded: false,
    error: false,
    src: placeholder || generatePlaceholder(width, height)
  });
  
  const imgRef = useRef(null);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    skip: !lazy
  });

  // Generate placeholder if none provided
  const generatePlaceholder = (w, h) => {
    const bgColor = '#f3f4f6';
    const textColor = '#9ca3af';
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${w || 400}" height="${h || 300}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="50%" font-family="Arial" font-size="14" fill="${textColor}" 
              text-anchor="middle" dy=".3em">Loading...</text>
      </svg>`
    )}`;
  };

  // Optimize image URL with quality and size parameters
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return null;
    
    return optimizeImageUrl(originalSrc, {
      width,
      height,
      quality,
      format: 'webp',
      fallback: 'jpeg'
    });
  };

  // Load image when in view or immediately if not lazy
  useEffect(() => {
    if (!src) return;
    
    const shouldLoad = !lazy || inView;
    if (!shouldLoad) return;

    const loadImage = async () => {
      try {
        const optimizedSrc = getOptimizedSrc(src);
        
        if (progressive) {
          // Use progressive loading
          const result = await progressiveImageLoad(optimizedSrc, imageState.src);
          setImageState(result);
        } else {
          // Standard loading
          const img = new Image();
          img.onload = () => {
            setImageState({
              loaded: true,
              error: false,
              src: optimizedSrc
            });
            onLoad && onLoad();
          };
          img.onerror = () => {
            setImageState({
              loaded: false,
              error: true,
              src: fallback || generateErrorPlaceholder()
            });
            onError && onError();
          };
          img.src = optimizedSrc;
        }
      } catch (error) {
        console.error('Image loading error:', error);
        setImageState({
          loaded: false,
          error: true,
          src: fallback || generateErrorPlaceholder()
        });
        onError && onError();
      }
    };

    loadImage();
  }, [src, inView, lazy, quality, width, height, progressive]);

  // Generate error placeholder
  const generateErrorPlaceholder = () => {
    const bgColor = '#fef2f2';
    const iconColor = '#ef4444';
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text x="50%" y="45%" font-family="Arial" font-size="16" fill="${iconColor}" 
              text-anchor="middle">⚠</text>
        <text x="50%" y="60%" font-family="Arial" font-size="12" fill="${iconColor}" 
              text-anchor="middle" dy=".3em">Image not found</text>
      </svg>`
    )}`;
  };

  // Handle retry loading
  const handleRetry = () => {
    setImageState({
      loaded: false,
      error: false,
      src: placeholder || generatePlaceholder(width, height)
    });
    
    // Trigger reload
    setTimeout(() => {
      if (imgRef.current) {
        imgRef.current.src = getOptimizedSrc(src);
      }
    }, 100);
  };

  const imageClasses = `
    ${className}
    ${imageState.loaded ? 'loaded' : 'loading'}
    ${imageState.error ? 'error' : ''}
    transition-all duration-300 ease-in-out
    ${!imageState.loaded ? 'blur-sm' : 'blur-0'}
  `.trim();

  return (
    <div ref={ref} className="optimized-image-container relative">
      <img
        ref={imgRef}
        src={imageState.src}
        alt={alt}
        width={width}
        height={height}
        className={imageClasses}
        style={{ 
          objectFit,
          transition: 'filter 0.3s ease-in-out, opacity 0.3s ease-in-out',
          ...(props.style || {})
        }}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
      />
      
      {/* Loading overlay */}
      {!imageState.loaded && !imageState.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <Image className="w-8 h-8 text-gray-400" />
        </div>
      )}
      
      {/* Error overlay with retry */}
      {imageState.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600">
          <AlertCircle className="w-8 h-8 mb-2" />
          <span className="text-sm mb-2">Failed to load</span>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Progressive loading indicator */}
      {progressive && !imageState.loaded && (
        <div className="absolute bottom-2 right-2">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      <style jsx>{`
        .optimized-image-container img.loading {
          filter: blur(4px);
          opacity: 0.8;
        }
        
        .optimized-image-container img.loaded {
          filter: blur(0);
          opacity: 1;
        }
        
        .optimized-image-container img.error {
          filter: grayscale(1);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

// Higher-order component for image optimization
export const withImageOptimization = (Component) => {
  return React.forwardRef((props, ref) => {
    const { images, ...otherProps } = props;
    
    const optimizedImages = images?.map(img => ({
      ...img,
      src: optimizeImageUrl(img.src, {
        width: img.width || 400,
        height: img.height || 300,
        quality: 80
      })
    }));
    
    return (
      <Component
        ref={ref}
        {...otherProps}
        images={optimizedImages}
      />
    );
  });
};

export default OptimizedImage; 