import React from 'react';
import {
  Wallet,
  Home,
  Smile,
  UserRound,
  User,
  PiggyBank,
  Folder,
  Banknote,
  HeartHandshake,
  Sparkles,
  Building2,
  Droplets,
  Zap,
  Car,
  Brush,
  UtensilsCrossed,
  Heart,
  GraduationCap,
  Palette,
  Shirt,
  Stethoscope,
  PartyPopper,
  Scissors,
  Dumbbell,
  Pill,
  BookOpen,
  ShoppingBag,
  Scale,
  Plane,
  Compass,
  Landmark,
  Tag,
  CreditCard,
  Smartphone,
  Shield,
  FileText
} from 'lucide-react';
import { getMetaCategoria } from '../utils/format';

const CATEGORIA_ICON_MAP = {
  '0_AHORRO': PiggyBank,
  I_INGRESOS: Wallet,
  II_GENERALES: Home,
  III_LARA: Smile,
  IV_VANESSA: UserRound,
  V_ANTHONY: User,
  VI_AHORRO: PiggyBank
};

const SUBCATEGORIA_ICON_MAP = {
  // I_INGRESOS
  '_1_SUELDOS': Banknote,
  '_2_PENSION': HeartHandshake,
  '_3_INGRESO ADICIONAL 1': Sparkles,
  '_4_INGRESO ADICIONAL 2': Sparkles,

  // II_GENERALES
  '_1_VIVIENDA': Building2,
  '_2_MANTENIMIENTO': Droplets,
  '_3_SERVICIOS_BASICOS': Zap,
  '_4_TRANSPORTE': Car,
  '_5_PERSONAL_DE_SERVICIO': Brush,
  '_6_ALIMENTACION': UtensilsCrossed,

  // III_LARA
  '_1_CUIDADO_PERSONAL_LARA': Heart,
  '_2_EDUCACION_LARA': GraduationCap,
  '_3_TALLERES_LARA': Palette,
  '_4_VESTIMENTA_LARA': Shirt,
  '_6_SALUD_LARA': Stethoscope,
  '_7_DIVERSION_LARA': PartyPopper,

  // IV_VANESSA
  '_1_CUIDADO_PERSONAL_VANESSA': Scissors,
  '_2_DEPORTE_VANESSA': Dumbbell,
  '_3_SALUD_VANESSA': Pill,
  '_4_ESTUDIOS_VANESSA': BookOpen,
  '_5_VESTIMENTA_VANESSA': ShoppingBag,
  '_6_LEGAL_VANESSA': Scale,
  '_7_DIVERSION_VANESSA': Plane,

  // V_ANTHONY
  '_1_CUIDADO_PERSONAL_ANTHONY': Scissors,
  '_2_DEPORTE_ANTHONY': Dumbbell,
  '_3_SALUD_ANTHONY': Stethoscope,
  '_4_ESTUDIOS_ANTHONY': BookOpen,
  '_5_VESTIMENTA_ANTHONY': Shirt,
  '_6_DIVERSION_ANTHONY': Compass,

  // VI_AHORRO / 0_AHORRO
  '_1_AHORRO_VANESSA': Landmark,
  '_2_AHORRO_ANTHONY': Landmark,
  '_3_AHORRO LARA': PiggyBank,

  // Nombres limpios de subcategorías
  'Ahorro Vanessa': Landmark,
  'Ahorro Anthony': Landmark,
  Sueldos: Banknote,
  Pensión: HeartHandshake,
  'Ingreso Adicional 1': Sparkles,
  'Ingreso Adicional 2': Sparkles,
  Vivienda: Building2,
  Mantenimiento: Droplets,
  'Servicios Básicos': Zap,
  Transporte: Car,
  'Personal de Servicio': Brush,
  Alimentación: UtensilsCrossed,
  'Cuidado Personal Lara': Heart,
  'Educación Lara': GraduationCap,
  'Talleres Lara': Palette,
  'Vestimenta Lara': Shirt,
  'Salud Lara': Stethoscope,
  'Diversión Lara': PartyPopper,
  'Cuidado Personal Vanessa': Scissors,
  'Deporte Vanessa': Dumbbell,
  'Salud Vanessa': Pill,
  'Estudios Vanessa': BookOpen,
  'Vestimenta Vanessa': ShoppingBag,
  'Legal Vanessa': Scale,
  'Diversión Vanessa': Plane,
  'Cuidado Personal Anthony': Scissors,
  'Deporte Anthony': Dumbbell,
  'Salud Anthony': Stethoscope,
  'Estudios Anthony': BookOpen,
  'Vestimenta Anthony': Shirt,
  'Diversión Anthony': Compass
};

export function CategoriaIcon({ codigo, size = 18, withBadge = false, className = '' }) {
  const Icon = CATEGORIA_ICON_MAP[codigo] || Folder;
  const meta = getMetaCategoria(codigo);

  if (withBadge) {
    return (
      <span
        className={`fc-icon-badge ${className}`}
        style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
      >
        <Icon size={size} strokeWidth={2.1} />
      </span>
    );
  }

  return <Icon size={size} strokeWidth={2.1} style={{ color: meta.color }} className={className} />;
}

export function SubcategoriaIcon({
  codigo,
  categoriaCodigo,
  size = 17,
  withBadge = false,
  className = ''
}) {
  const Icon = SUBCATEGORIA_ICON_MAP[codigo] || Tag;
  const meta = categoriaCodigo ? getMetaCategoria(categoriaCodigo) : null;
  const color = meta?.color || '#006241';
  const bg = meta?.bg || '#ecfdf5';
  const border = meta?.border || '#a7f3d0';

  if (withBadge) {
    return (
      <span
        className={`fc-icon-badge sub ${className}`}
        style={{ background: bg, color, borderColor: border }}
      >
        <Icon size={size} strokeWidth={2} />
      </span>
    );
  }

  return <Icon size={size} strokeWidth={2} style={{ color }} className={className} />;
}

export function MedioPagoIcon({ nombre = '', size = 15, className = '' }) {
  const upper = String(nombre).toUpperCase();
  if (upper.includes('YAPE') || upper.includes('PLIN')) {
    return <Smartphone size={size} strokeWidth={2} className={className} />;
  }
  if (upper.includes('CUENTA') || upper.includes('BCP') || upper.includes('BANCO')) {
    return <Landmark size={size} strokeWidth={2} className={className} />;
  }
  if (upper.includes('EFECTIVO')) {
    return <Banknote size={size} strokeWidth={2} className={className} />;
  }
  return <CreditCard size={size} strokeWidth={2} className={className} />;
}

export function ConceptoIcon({ size = 15, color, className = '' }) {
  return <FileText size={size} strokeWidth={2} style={color ? { color } : undefined} className={className} />;
}

export function ObjetivoIcon({ tipo = '', size = 20, className = '' }) {
  const t = String(tipo).toLowerCase();
  if (t.includes('emergencia')) return <Shield size={size} strokeWidth={2} className={className} />;
  if (t.includes('vacacion') || t.includes('viaje')) return <Plane size={size} strokeWidth={2} className={className} />;
  if (t.includes('educacion') || t.includes('educación')) return <GraduationCap size={size} strokeWidth={2} className={className} />;
  if (t.includes('vivienda') || t.includes('casa')) return <Home size={size} strokeWidth={2} className={className} />;
  if (t.includes('compra') || t.includes('auto') || t.includes('proyecto')) return <Car size={size} strokeWidth={2} className={className} />;
  return <Sparkles size={size} strokeWidth={2} className={className} />;
}
