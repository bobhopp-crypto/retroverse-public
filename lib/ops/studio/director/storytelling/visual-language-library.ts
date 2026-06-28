/**
 * Sprint 3.36 — Visual Language Library (reusable art-direction vocabulary).
 */

export const CAMERAS = [
  "Static",
  "Push-in",
  "Pull-back",
  "Overhead",
  "Handheld",
  "Tracking",
  "Close-up",
  "Wide",
  "Split screen",
] as const;

export const LIGHTING = [
  "Golden hour",
  "Studio tungsten",
  "Concert spotlight",
  "Television",
  "Neon",
  "Daylight",
  "Museum",
  "Night",
] as const;

export const TEXTURES = [
  "Film grain",
  "Newsprint",
  "Gloss magazine",
  "Vinyl",
  "Paper",
  "Tape",
  "Polaroid",
  "Blueprint",
  "Wood",
  "CRT",
] as const;

export const LAYOUT_STYLES = [
  "Magazine",
  "Poster",
  "Museum panel",
  "Album sleeve",
  "Trading card",
  "Film storyboard",
  "TV guide",
  "Billboard",
  "Record sleeve",
  "Scrapbook",
  "Infographic",
  "Concert flyer",
] as const;

export const MOTION_STYLES = [
  "Slow pan",
  "Parallax",
  "Zoom",
  "Fade",
  "Cross dissolve",
  "Flip",
  "Timeline growth",
  "Map travel",
  "Photo scatter",
  "Record spin",
  "Pulse",
] as const;

export const EMOTIONAL_TONES = [
  "Wonder",
  "Excitement",
  "Curiosity",
  "Suspense",
  "Reflection",
  "Celebration",
  "Mystery",
  "Humor",
  "Triumph",
  "Melancholy",
  "Hope",
] as const;

export type CameraStyle = (typeof CAMERAS)[number];
export type LightingStyle = (typeof LIGHTING)[number];
export type TextureStyle = (typeof TEXTURES)[number];
export type LayoutStyle = (typeof LAYOUT_STYLES)[number];
export type MotionStyle = (typeof MOTION_STYLES)[number];
export type EmotionalTone = (typeof EMOTIONAL_TONES)[number];

export const CAMERA_ICONS: Record<string, string> = {
  Static: "▣",
  "Push-in": "⊙",
  "Pull-back": "◉",
  Overhead: "⬒",
  Handheld: "⌁",
  Tracking: "→",
  "Close-up": "◎",
  Wide: "▭",
  "Split screen": "⚌",
};

export const MOTION_ICONS: Record<string, string> = {
  "Slow pan": "↔",
  Parallax: "⬚",
  Zoom: "⊕",
  Fade: "◐",
  "Cross dissolve": "⇄",
  Flip: "↻",
  "Timeline growth": "📈",
  "Map travel": "🧭",
  "Photo scatter": "✦",
  "Record spin": "💿",
  Pulse: "♫",
};

export const PALETTE_HEX: Record<string, string> = {
  Amber: "#D4A054",
  Brown: "#6B4423",
  Cream: "#F5E6C8",
  "Muted black": "#1A1612",
  White: "#F8F8F6",
  Red: "#C0392B",
  Black: "#111111",
  Teal: "#2A7B7B",
  Gold: "#C9A227",
  Navy: "#1B2A4A",
  Sepia: "#8B7355",
  Avocado: "#6B7B3C",
  Rust: "#A0522D",
  "Stage blue": "#1E3A5F",
  "Spotlight white": "#FFF8E7",
  "Lab cyan": "#4ECDC4",
  "Chart ink": "#222222",
  "Wood tone": "#8B6914",
  "Museum gray": "#9E9E98",
};
