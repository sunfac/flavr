import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Recipe Card Skeleton
export function RecipeCardSkeleton() {
  return (
    <div className="bg-card/90 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden border border-white/20 h-[400px] min-w-[300px] animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-56 bg-gradient-to-br from-muted via-muted/50 to-muted relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer"></div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Tags */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Action button */}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Content List Skeleton
export function ContentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3 p-4 rounded-lg bg-card/50">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Grid Skeleton
export function GridSkeleton({ count = 6, columns = 2 }: { count?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : `md:grid-cols-${columns}`} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Image Skeleton with shimmer effect
export function ImageSkeleton({ aspectRatio = "square", className }: { aspectRatio?: "square" | "video" | "wide"; className?: string }) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video", 
    wide: "aspect-[16/9]"
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", aspectClasses[aspectRatio], className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-muted-foreground opacity-50">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

// Button Skeleton
export function ButtonSkeleton({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-10 w-24", 
    lg: "h-12 w-32"
  };
  
  return <Skeleton className={cn("rounded-md", sizeClasses[size])} />;
}

// Chat Message Skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {!isUser && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
      <div className={`flex-1 max-w-md ${isUser ? 'text-right' : ''}`}>
        <div className={`rounded-2xl p-3 ${isUser ? 'bg-primary/10' : 'bg-muted/50'}`}>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

// Progress Skeleton for multi-step processes
export function ProgressSkeleton({ steps = 4, currentStep = 2 }: { steps?: number; currentStep?: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              i < currentStep
                ? 'bg-primary text-primary-foreground'
                : i === currentStep
                ? 'bg-primary/20 border-2 border-primary animate-pulse'
                : 'bg-muted'
            }`}
          >
            {i < currentStep ? '✓' : i + 1}
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / steps) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}