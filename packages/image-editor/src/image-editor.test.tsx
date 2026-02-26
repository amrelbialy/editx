import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { ImageEditor } from './image-editor';

// Mock the engine and image loading dependencies
vi.mock('@creative-editor/engine', () => {
  const mockEngine = {
    scene: {
      create: vi.fn().mockResolvedValue(undefined),
      getCurrentPage: vi.fn().mockReturnValue(1),
    },
    block: {
      create: vi.fn().mockReturnValue(2),
      setString: vi.fn(),
      setSize: vi.fn(),
      setPosition: vi.fn(),
      appendChild: vi.fn(),
    },
    dispose: vi.fn(),
  };

  return {
    CreativeEngine: {
      create: vi.fn().mockResolvedValue(mockEngine),
    },
    IMAGE_SRC: 'image/src',
  };
});

vi.mock('./utils/load-image', () => ({
  loadImage: vi.fn().mockResolvedValue({
    naturalWidth: 800,
    naturalHeight: 600,
  }),
  sourceToUrl: vi.fn().mockImplementation((src: string) => src),
  revokeObjectUrl: vi.fn(),
}));

vi.mock('./components/toolbar', () => ({
  ImageEditorToolbar: () => React.createElement('div', { 'data-testid': 'toolbar' }),
}));

describe('ImageEditor', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(React.createElement(ImageEditor, { src: 'https://example.com/img.png' }));
    // Component should render the toolbar and container
    expect(screen.getByTestId('toolbar')).toBeDefined();
  });

  it('shows loading overlay initially', () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );
    expect(container.textContent).toContain('Loading image...');
  });

  it('applies width and height styles', () => {
    const { container } = render(
      React.createElement(ImageEditor, {
        src: 'https://example.com/img.png',
        width: 500,
        height: 400,
      })
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe('500px');
    expect(wrapper.style.height).toBe('400px');
  });

  it('defaults width to 100% and height to 100vh', () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe('100%');
    expect(wrapper.style.height).toBe('100vh');
  });
});
