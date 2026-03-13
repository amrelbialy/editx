import type { ImageEditorConfig, ResizePresetGroup } from './config.types';

const defaultResizePresets: ResizePresetGroup[] = [
  {
    label: 'Instagram',
    presets: [
      { label: 'Landscape Post (1.91:1)', width: 1080, height: 566 },
      { label: 'Portrait Post (4:5)', width: 1080, height: 1350 },
      { label: 'Square Post (1:1)', width: 1080, height: 1080 },
      { label: 'Story / Reel (9:16)', width: 1080, height: 1920 },
      { label: 'Profile Photo', width: 320, height: 320 },
    ],
  },
  {
    label: 'Facebook',
    presets: [
      { label: 'Cover Photo', width: 820, height: 312 },
      { label: 'Profile Photo', width: 170, height: 170 },
      { label: 'Shared Image (1.91:1)', width: 1200, height: 630 },
      { label: 'Post (1:1)', width: 1080, height: 1080 },
      { label: 'Story (9:16)', width: 1080, height: 1920 },
      { label: 'Event Cover', width: 1920, height: 1080 },
    ],
  },
  {
    label: 'TikTok',
    presets: [
      { label: 'Profile Photo', width: 200, height: 200 },
      { label: 'Video (9:16)', width: 1080, height: 1920 },
    ],
  },
  {
    label: 'YouTube',
    presets: [
      { label: 'Thumbnail (16:9)', width: 1280, height: 720 },
      { label: 'Channel Art', width: 2560, height: 1440 },
    ],
  },
  {
    label: 'General',
    presets: [
      { label: 'HD (16:9)', width: 1280, height: 720 },
      { label: 'Full HD (16:9)', width: 1920, height: 1080 },
      { label: 'Square', width: 1080, height: 1080 },
      { label: '4K UHD', width: 3840, height: 2160 },
    ],
  },
];

export const defaultConfig: Required<
  Pick<ImageEditorConfig, 'tools' | 'defaultTool' | 'theme' | 'ui' | 'export'>
> &
  ImageEditorConfig = {
  tools: ['crop', 'adjust', 'filter', 'text', 'shapes', 'image'],
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
    resizePresets: defaultResizePresets,
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

  image: {
    maxFileSize: 5 * 1024 * 1024,
    maxDimension: 2048,
  },

  export: {
    formats: ['png', 'jpeg', 'webp'],
    defaultFormat: 'png',
    quality: 0.92,
  },
};
