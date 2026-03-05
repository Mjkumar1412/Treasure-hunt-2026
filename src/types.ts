export type GameMode = 'team' | 'individual';
export type GameStatus = 'scheduled' | 'active' | 'finished';

export type QRShape = 'square' | 'circle' | 'rounded' | 'diamond' | 'heart' | 'star' | 'leaf';
export type QRColorType = 'solid' | 'gradient' | 'team';

export interface QRStyle {
  shape: QRShape;
  colorType: QRColorType;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  logoPosition?: 'center' | 'top-left' | 'bottom-right';
  frameType: 'none' | 'simple' | 'thick' | 'pattern' | 'glow';
  frameColor?: string;
}

export interface ScannerStyle {
  frameShape: 'rectangle' | 'rounded' | 'circle' | 'heart' | 'star' | 'chest' | 'magnifier' | 'compass' | 'diamond' | 'hexagon' | 'keyhole' | 'map' | 'neon' | 'pyramid' | 'bubbles';
  animation: 'line' | 'glow' | 'ripple' | 'pulse' | 'rotating' | 'particles' | 'flicker';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface Game {
  id: string;
  name: string;
  mode: GameMode;
  status: GameStatus;
  startTime?: string;
  winnerId?: string;
  qrStyle?: string; // JSON string of QRStyle
  scannerStyle?: string; // JSON string of ScannerStyle
  allowedThemes?: string; // JSON string of ThemeType[]
  allowUserThemeChange: boolean;
  defaultTheme: string;
  pdfEnabled: boolean;
  websiteOnlyScanning: boolean;
  fallbackMode: boolean;
  fallbackMessage?: string;
}

export interface Clue {
  id: string;
  gameId: string;
  sequence: number;
  content: string;
  code: string;
  teamId?: string;
  qrStyle?: string;
}

export interface Team {
  id: string;
  gameId: string;
  loginId: string;
  name?: string;
  members?: string; // JSON string
  currentClueSequence: number;
  lastScanTime?: string;
  isLoggedIn: boolean;
  qrStyle?: string;
  termsAccepted: boolean;
  termsAcceptedDate?: string;
  termsVersion?: string;
  termsIpAddress?: string;
  termsUserAgent?: string;
}

export interface TermsVersion {
  id: string;
  version: string;
  content: string;
  createdDate: string;
  isActive: boolean;
}

export interface Admin {
  username: string;
  isMain: boolean;
}

export interface ScanHistory extends Clue {
  scanTime: string;
}
