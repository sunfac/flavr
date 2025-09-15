import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  lazy?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "wide" | string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
}

export function ProgressiveImage({
  src,
  alt,
  className = "",
  placeholderClassName = "",
  fallbackSrc,
  lazy = true,
  aspectRatio = "square",
  onLoad,
  onError,
  priority = false,
  sizes,
}: ProgressiveImageProps) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const [currentSrc, setCurrentSrc] = useState(src);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" } // Start loading 50px before the image comes into view
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, shouldLoad]);

  // Handle image loading
  useEffect(() => {
    if (!shouldLoad) return;

    const img = new Image();
    
    img.onload = () => {
      setImageState("loaded");
      onLoad?.();
    };

    img.onerror = () => {
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }
      setImageState("error");
      onError?.();
    };

    img.src = currentSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [currentSrc, shouldLoad, fallbackSrc, onLoad, onError]);

  // Aspect ratio class mapping
  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    wide: "aspect-[4/3]",
  };

  const aspectClass = aspectRatioClasses[aspectRatio as keyof typeof aspectRatioClasses] || aspectRatio;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectClass,
        className
      )}
    >
      <AnimatePresence mode="wait">
        {imageState === "loading" && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80",
              placeholderClassName
            )}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Placeholder icon */}
            <div className="relative z-10 flex flex-col items-center justify-center text-muted-foreground/50">
              <ImageIcon className="w-8 h-8 mb-2" />
              <div className="w-16 h-2 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          </motion.div>
        )}

        {imageState === "loaded" && (
          <motion.img
            ref={imgRef}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            src={currentSrc}
            alt={alt}
            sizes={sizes}
            className="absolute inset-0 w-full h-full object-cover"
            loading={lazy && !priority ? "lazy" : "eager"}
          />
        )}

        {imageState === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-muted/80",
              placeholderClassName
            )}
          >
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="w-6 h-6 mb-2" />
              <span className="text-xs">Image unavailable</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Optimized avatar component with better loading states
interface ProgressiveAvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackInitials?: string;
  lazy?: boolean;
}

export function ProgressiveAvatar({
  src,
  alt,
  size = "md",
  className = "",
  fallbackInitials,
  lazy = true,
}: ProgressiveAvatarProps) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || shouldLoad || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, shouldLoad, src]);

  // Handle image loading
  useEffect(() => {
    if (!shouldLoad || !src) {
      setImageState("error");
      return;
    }

    const img = new Image();
    
    img.onload = () => setImageState("loaded");
    img.onerror = () => setImageState("error");
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-full overflow-hidden bg-primary/10 flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <AnimatePresence mode="wait">
        {imageState === "loading" && src && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-muted animate-pulse rounded-full"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
          </motion.div>
        )}

        {imageState === "loaded" && src && (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover rounded-full"
            loading={lazy ? "lazy" : "eager"}
          />
        )}

        {(imageState === "error" || !src) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center text-primary/60 font-medium"
          >
            {fallbackInitials || getInitials(alt)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Optimized recipe image component
interface RecipeImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "wide";
  lazy?: boolean;
  sizes?: string;
}

export function RecipeImage({
  src,
  alt,
  className = "",
  priority = false,
  aspectRatio = "square",
  lazy = true,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: RecipeImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-muted flex items-center justify-center",
          aspectRatio === "square" && "aspect-square",
          aspectRatio === "video" && "aspect-video",
          aspectRatio === "portrait" && "aspect-[3/4]",
          aspectRatio === "wide" && "aspect-[4/3]",
          className
        )}
      >
        <div className="flex flex-col items-center justify-center text-muted-foreground/60">
          <ImageIcon className="w-12 h-12 mb-2" />
          <span className="text-sm">No image</span>
        </div>
      </div>
    );
  }

  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={className}
      aspectRatio={aspectRatio}
      lazy={lazy && !priority}
      priority={priority}
      sizes={sizes}
      placeholderClassName="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20"
    />
  );
}