import clsx from "clsx";
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

// Pictogramme téléphone + clé (tracé depuis le logo fourni), viewBox 0 0 539 860.
// Exporté pour l’écran de préchargement, qui le dessine trait par trait.
export const LOGO_PATH =
  "M108.5 2.1C55.6 7.8 14 46.1 3.3 98.9c-1.6 8-1.8 26.2-2 264.2-.2 168.2 0 256.6.7 258.3 1.4 3.7 5 5.2 8.9 3.6a424 424 0 0 0 39.7-40.5c1.8-2.8 2-9.5 2.4-241l.5-238 2.3-6.3a62 62 0 0 1 17.6-28.8A54 54 0 0 1 91 57.3c16-7.8 4.3-7.3 179.2-7.3 152.2 0 156.5 0 164.1 2a67 67 0 0 1 51.7 60.3c.8 6.3 1 108.6.8 324.2l-.3 315-2.3 6.4a65 65 0 0 1-43.2 42.7c-5.2 1.8-13.5 2-165.6 2.4-158.3.5-160.2.5-162.4 2.5-2 1.7-2.2 2.8-1.8 8.6 1 19.5 21.5 39.2 43.4 41.9 4.8.5 62.6.8 144.9.7 151.8-.3 140.9.1 162.3-7 33.4-11 61.7-40.6 71.6-75.1 4.7-16 4.6-12 4.6-344.6 0-348.4.4-328.3-6.2-347.5A119 119 0 0 0 443 3.7c-9.4-2-11-2-168-2.3-87.2 0-162.1.2-166.5.7m103.7 74.2a22.5 22.5 0 0 0-2.9 41c4.2 2.2 4.3 2.2 60.2 2.2h56l4.8-2.4a22.2 22.2 0 0 0 .7-39l-4.5-2.6-55.5-.2c-41-.1-56.3.1-58.8 1m85.3 194.4c-79 9.7-140 54-160 116.3a110 110 0 0 0-7 45.5c.1 19 .1 19 4.8 39.6 7 31.1 6.4 46.4-3 65.8-6 12.1-11.6 18.6-60.3 68.7C16.4 663.8 16.2 664 11.8 671c-8.7 13.8-10.3 22.4-10.3 54 0 28.7 1.1 37.2 7 54.5a121 121 0 0 0 90 79.2c1.1.3-1.1-2.7-5.4-7.3a70 70 0 0 1-16-22 72 72 0 0 1 8.5-79.5c4.3-5.2 10-11.3 60.3-63.4l53-55c29.7-31 33.6-34.7 41.8-40.1 18.3-12 32-16 64.8-19 53-4.5 93-31.4 117.4-78.4a159 159 0 0 0 14.6-103.4c-1.9-9.8-3.3-12.8-6.6-14-5.8-2-6.4-1.4-53.4 51.4-25.3 28.5-28.4 31.4-38.4 36.5a66 66 0 0 1-57.2-.1c-35.5-17-53-55-40.3-87 3-7.4 7.7-13.6 28-37.1a3984 3984 0 0 0 38.5-44.8c10.8-12.2 13.4-19 8.9-23.5-2-2-9.8-2.5-19.5-1.3";

/**
 * Logo réduit au pictogramme, à la manière d’Apple : SVG en currentColor (net à toute taille,
 * prend la couleur du texte et suit donc le thème) ; le nom reste lu par les lecteurs d’écran.
 */
export function Logo({ className, name = "Repareliya" }: { className?: string; name?: string }) {
  return (
    <span className={twMerge("inline-flex align-middle text-[22px]", className)}>
      <svg viewBox="0 0 539 860" fill="currentColor" className="h-[1.5em] w-[0.94em]" aria-hidden>
        <path fillRule="evenodd" d={LOGO_PATH} />
      </svg>
      <span className="sr-only">{name}</span>
    </span>
  );
}
