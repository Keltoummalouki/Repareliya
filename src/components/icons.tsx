import clsx from "clsx";
import Image from "next/image";
import { twMerge } from "tailwind-merge";
import {
  BatteryMedium,
  Camera,
  Code,
  Cpu,
  Droplets,
  Fan,
  Gamepad2,
  Globe,
  Keyboard,
  Laptop,
  Layers,
  Mic,
  MonitorSmartphone,
  Plug,
  ScanFace,
  Search,
  Smartphone,
  Tablet,
  ToggleLeft,
  Tv,
  Volume2,
  Watch,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { IconType } from "react-icons";
import { BsNintendoSwitch } from "react-icons/bs";
import { FaLinkedin, FaMicrosoft } from "react-icons/fa";
import {
  SiApple,
  SiFacebook,
  SiGoogle,
  SiGooglemaps,
  SiHuawei,
  SiInstagram,
  SiMotorola,
  SiOneplus,
  SiPlaystation,
  SiSnapchat,
  SiSony,
  SiSteam,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiValve,
  SiWhatsapp,
  SiX,
  SiXiaomi,
  SiYoutube,
} from "react-icons/si";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  gamepad: Gamepad2,
  watch: Watch,
  other: MonitorSmartphone,
};

export function CategoryIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = CATEGORY_ICONS[icon ?? ""] ?? MonitorSmartphone;
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}

export const REPAIR_ICONS: Record<string, LucideIcon> = {
  screen: Smartphone,
  battery: BatteryMedium,
  plug: Plug,
  layers: Layers,
  camera: Camera,
  "scan-face": ScanFace,
  volume: Volume2,
  mic: Mic,
  toggle: ToggleLeft,
  keyboard: Keyboard,
  hdmi: Tv,
  gamepad: Gamepad2,
  fan: Fan,
  droplets: Droplets,
  cpu: Cpu,
  code: Code,
  search: Search,
  wrench: Wrench,
};

export function RepairIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = REPAIR_ICONS[icon ?? ""] ?? Wrench;
  return <Icon className={className} aria-hidden strokeWidth={1.6} />;
}

const BRAND_ICONS: Record<string, IconType> = {
  apple: SiApple,
  xiaomi: SiXiaomi,
  huawei: SiHuawei,
  google: SiGoogle,
  oneplus: SiOneplus,
  motorola: SiMotorola,
  sony: SiPlaystation,
  playstation: SiPlaystation,
  nintendo: BsNintendoSwitch,
  microsoft: FaMicrosoft,
  valve: SiSteam,
};

/** Logo de marque : image téléversée, sinon icône connue, sinon nom stylisé. */
export function BrandMark({
  slug,
  name,
  logoUrl,
  className,
  iconClassName = "size-7",
}: {
  slug: string;
  name: string;
  logoUrl?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  if (logoUrl) {
     
    return <img src={logoUrl} alt={name} className={clsx("max-h-8 w-auto object-contain", className)} loading="lazy" />;
  }
  const Icon = BRAND_ICONS[slug];
  if (Icon) {
    return (
      <span className={clsx("inline-flex items-center gap-2", className)}>
        <Icon className={iconClassName} aria-hidden />
        <span className="font-display font-bold tracking-tight">{name}</span>
      </span>
    );
  }
  const wordmark = WORDMARKS[slug];
  return (
    <span className={clsx("font-display text-lg font-extrabold tracking-tight", wordmark, className)}>{wordmark ? name.toUpperCase() : name}</span>
  );
}

// Marques dont le logo est un mot-symbole : rendu typographique
const WORDMARKS: Record<string, string> = {
  samsung: "!tracking-[0.12em] !font-black",
  oppo: "!tracking-[0.08em]",
  honor: "!tracking-[0.14em]",
  vivo: "!tracking-[0.02em] lowercase",
  realme: "lowercase",
};

export const SOCIAL_PLATFORMS: { value: string; label: string; icon: IconType | LucideIcon; color: string }[] = [
  { value: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, color: "#128c4a" },
  { value: "instagram", label: "Instagram", icon: SiInstagram, color: "#d62976" },
  { value: "facebook", label: "Facebook", icon: SiFacebook, color: "#1877f2" },
  { value: "tiktok", label: "TikTok", icon: SiTiktok, color: "var(--color-ink)" },
  { value: "snapchat", label: "Snapchat", icon: SiSnapchat, color: "#e8c900" },
  { value: "youtube", label: "YouTube", icon: SiYoutube, color: "#ff0000" },
  { value: "x", label: "X (Twitter)", icon: SiX, color: "var(--color-ink)" },
  { value: "linkedin", label: "LinkedIn", icon: FaLinkedin, color: "#0a66c2" },
  { value: "threads", label: "Threads", icon: SiThreads, color: "var(--color-ink)" },
  { value: "telegram", label: "Telegram", icon: SiTelegram, color: "#229ed9" },
  { value: "google", label: "Google Maps", icon: SiGooglemaps, color: "#1a73e8" },
  { value: "autre", label: "Autre lien", icon: Globe, color: "var(--color-ink)" },
];

export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = SOCIAL_PLATFORMS.find((p) => p.value === platform)?.icon ?? Globe;
  return <Icon className={className} aria-hidden />;
}

export function socialLabel(platform: string) {
  return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.label ?? "Lien";
}

export { SiWhatsapp as WhatsappIcon, SiGoogle as GoogleIcon, SiSony as SonyIcon, SiValve as ValveIcon };

export function Logo({ className, name = "Repareliya" }: { className?: string; name?: string }) {
  // Une version par thème, masquée en CSS : en chargement différé (par défaut),
  // le navigateur ne télécharge que celle qui est affichée
  const common = { width: 2172, height: 724, sizes: "176px" };
  return (
    <span className={twMerge("inline-flex max-w-full align-middle text-[22px]", className)}>
      <Image {...common} src="/images/logo.png" alt={name} className="h-auto w-[8em] max-w-full dark:hidden" />
      <Image {...common} src="/images/logo-dark.png" alt={name} className="hidden h-auto w-[8em] max-w-full dark:block" />
    </span>
  );
}
