import type { ImageEditorConfig } from './config.types';

export const defaultConfig: Required<
  Pick<ImageEditorConfig, 'tools' | 'defaultTool' | 'theme' | 'ui' | 'export'>
> &
  ImageEditorConfig = {
  tools: ['crop', 'adjust', 'filter', 'text', 'shapes', 'sticker'],
  defaultTool: null,

  theme: {
    preset: 'zinc-dark',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  ui: {
    toolSidebar: {
      showLabels: true,
      groupSeparators: true,
    },
    contextualBar: {
      show: true,
    },
    title: 'Photo Editor',
    showTitle: true,
  },

  crop: {
    presets: ['free', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
    modes: ['crop', 'cover', 'fit'],
    defaultMode: 'crop',
    allowCustomRatio: true,
    showStraighten: true,
    showRotateFlip: true,
  },

  adjust: {
    controls: [
      'brightness',
      'contrast',
      'saturation',
      'temperature',
      'sharpness',
      'exposure',
      'shadows',
      'highlights',
      'blacks',
      'whites',
      'gamma',
      'clarity',
    ],
  },

  filter: {
    showIntensity: true,
  },

  text: {
    fonts: ['Inter', 'Roboto', 'Playfair Display', 'Fira Code'],
    defaultFontSize: 24,
    defaultColor: '#ffffff',
  },

  shapes: {
    presets: ['rect', 'ellipse', 'triangle', 'star', 'arrow'],
    defaultFillMode: 'filled',
    defaultColor: '#3b82f6',
  },

  sticker: {
    packs: [],
  },

  export: {
    formats: ['png', 'jpeg', 'webp'],
    defaultFormat: 'png',
    quality: 0.92,
  },
};
