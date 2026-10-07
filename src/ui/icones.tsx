import {
  IconBabyCarriage, IconBarbell, IconBolt, IconBook, IconBuildingBank, IconBus, IconCar, IconCash, IconCloud,
  IconCoffee, IconConfetti, IconCreditCard, IconDeviceGamepad2, IconDeviceMobile, IconDeviceTv, IconDog, IconDots,
  IconDroplet, IconFlame, IconGasStation, IconGift, IconHeartbeat, IconHome, IconMovie, IconMusic, IconPaw,
  IconPill, IconPizza, IconPlane, IconReceipt, IconRepeat, IconSchool, IconShirt, IconShoppingBag,
  IconShoppingCart, IconStethoscope, IconTool, IconToolsKitchen2, IconWifi,
} from '@tabler/icons-preact';
import type { Icon as IconeTabler } from '@tabler/icons-preact';

/** Ícones disponíveis para categorias e marcas. A chave é gravada no banco: não renomear. */
export const ICONES: Record<string, IconeTabler> = {
  home: IconHome,
  'tools-kitchen-2': IconToolsKitchen2,
  car: IconCar,
  heartbeat: IconHeartbeat,
  'shopping-bag': IconShoppingBag,
  confetti: IconConfetti,
  repeat: IconRepeat,
  'device-mobile': IconDeviceMobile,
  dots: IconDots,
  wifi: IconWifi,
  paw: IconPaw,
  dog: IconDog,
  school: IconSchool,
  plane: IconPlane,
  'gas-station': IconGasStation,
  bus: IconBus,
  pill: IconPill,
  stethoscope: IconStethoscope,
  barbell: IconBarbell,
  movie: IconMovie,
  'device-tv': IconDeviceTv,
  music: IconMusic,
  cloud: IconCloud,
  gift: IconGift,
  shirt: IconShirt,
  bolt: IconBolt,
  droplet: IconDroplet,
  flame: IconFlame,
  receipt: IconReceipt,
  'credit-card': IconCreditCard,
  cash: IconCash,
  'building-bank': IconBuildingBank,
  'device-gamepad-2': IconDeviceGamepad2,
  book: IconBook,
  coffee: IconCoffee,
  pizza: IconPizza,
  'shopping-cart': IconShoppingCart,
  tool: IconTool,
  'baby-carriage': IconBabyCarriage,
};

export const NOMES_ICONES = Object.keys(ICONES);

export function Icone({ nome, tamanho = 20 }: { nome: string; tamanho?: number }) {
  const Componente = ICONES[nome] ?? IconDots;
  return <Componente size={tamanho} stroke={1.75} aria-hidden="true" />;
}
