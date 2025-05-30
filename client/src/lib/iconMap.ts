import {
  // Navigation & UI
  Menu, Settings, Crown, LogIn, UserPlus, Home, ArrowLeft, ArrowRight,
  CheckCircle, X, Send, Plus, Minus, Star, Heart, Share2, Download,
  
  // Cooking & Food
  ChefHat, Utensils, UtensilsCrossed, Flame, Wine, Soup, Coffee,
  ShoppingCart, Store, ShoppingBag, Refrigerator, Clock, Timer,
  
  // User & Social
  User, Users, Users2, Bot, MessageCircle, Mail, Bell,
  
  // Actions & States
  Play, Pause, RefreshCw, Zap, Scale, Droplets, Search,
  Edit, Trash2, Copy, Check, AlertCircle, Info, HelpCircle,
  
  // Moods & Emotions
  Smile, Sparkles, Target, Globe, Snowflake, PartyPopper,
  
  // Equipment & Tools
  Microwave, Wind, Building, Smartphone, Shield, Calendar,
  
  // Financial
  DollarSign, CreditCard, PoundSterling, Coins, Banknote,
  
  // Dietary & Health
  Leaf, Apple, Fish, Beef, Blend, Waves,
  
  // Misc
  Circle, CircleDot, Hand, CheckCircle2, XCircle, Eye, EyeOff
} from "lucide-react";

export const iconMap = {
  // Navigation & UI
  menu: Menu,
  settings: Settings,
  crown: Crown,
  login: LogIn,
  userPlus: UserPlus,
  home: Home,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  checkCircle: CheckCircle,
  x: X,
  send: Send,
  plus: Plus,
  minus: Minus,
  star: Star,
  heart: Heart,
  share: Share2,
  download: Download,
  
  // Cooking & Food
  chefHat: ChefHat,
  utensils: Utensils,
  utensilsCrossed: UtensilsCrossed,
  flame: Flame,
  wine: Wine,
  soup: Soup,
  coffee: Coffee,
  shoppingCart: ShoppingCart,
  store: Store,
  shoppingBag: ShoppingBag,
  refrigerator: Refrigerator,
  clock: Clock,
  timer: Timer,
  
  // User & Social
  user: User,
  users: Users,
  users2: Users2,
  bot: Bot,
  messageCircle: MessageCircle,
  mail: Mail,
  bell: Bell,
  
  // Actions & States
  play: Play,
  pause: Pause,
  refresh: RefreshCw,
  zap: Zap,
  scale: Scale,
  droplets: Droplets,
  search: Search,
  edit: Edit,
  trash: Trash2,
  copy: Copy,
  check: Check,
  alertCircle: AlertCircle,
  info: Info,
  helpCircle: HelpCircle,
  
  // Moods & Emotions
  smile: Smile,
  sparkles: Sparkles,
  target: Target,
  globe: Globe,
  snowflake: Snowflake,
  partyPopper: PartyPopper,
  
  // Equipment & Tools
  microwave: Microwave,
  wind: Wind,
  building: Building,
  smartphone: Smartphone,
  shield: Shield,
  calendar: Calendar,
  
  // Financial
  dollarSign: DollarSign,
  creditCard: CreditCard,
  poundSterling: PoundSterling,
  coins: Coins,
  banknote: Banknote,
  
  // Dietary & Health
  leaf: Leaf,
  apple: Apple,
  fish: Fish,
  beef: Beef,
  blend: Blend,
  waves: Waves,
  
  // Misc
  circle: Circle,
  circleDot: CircleDot,
  hand: Hand,
  checkCircle2: CheckCircle2,
  xCircle: XCircle,
  eye: Eye,
  eyeOff: EyeOff
} as const;

export type IconKey = keyof typeof iconMap;