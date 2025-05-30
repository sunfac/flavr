import { iconMap } from '@/lib/optimizedIcons';
import { IconName } from '@/lib/optimizedIcons';

interface IconProps {
  name: IconName;
  className?: string;
  [key: string]: any;
}

export default function Icon({ name, className = 'h-5 w-5', ...props }: IconProps) {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} {...props} />;
}