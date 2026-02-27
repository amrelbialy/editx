import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ImageEditor } from './image-editor';
import { useImageEditorStore } from './store/image-editor-store';

// Track mock engine instances for assertions
let latestMockEngine: any = null;

// Mock the engine and image loading dependencies
vi.mock('@creative-editor/engine', () => {
  const createMockEngine = () => {
    const eng = {
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
    latestMockEngine = eng;
    return eng;
  };

  return {
    CreativeEngine: {
      create: vi.fn().mockImplementation(() => Promise.resolve(createMockEngine())),
    },
    IMAGE_SRC: 'image/src',
    evictImage: vi.fn(),
  };
});

const mockLoadImage = vi.fn().mockResolvedValue({
  naturalWidth: 800,
  naturalHeight: 600,
  src: 'https://example.com/img.png',
});

vi.mock('./utils/load-image', () => ({
  loadImage: (...args: any[]) => mockLoadImage(...args),
  sourceToUrl: vi.fn().mockImplementation((src: any) => {
    if (typeof src === 'string') return src;
    return 'blob:http://localhost/mock-blob-url';
  }),
  revokeObjectUrl: vi.fn(),
}));

vi.mock('./utils/validate-image', () => ({
  validateImageFile: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
  validateImageDimensions: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
}));

vi.mock('./utils/downscale-image', () => ({
  downscaleIfNeeded: vi.fn().mockImplementation((img: any) => ({
    dataUrl: img.src,
    workingWidth: img.naturalWidth,
    workingHeight: img.naturalHeight,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    wasDownscaled: false,
  })),
}));

vi.mock('./utils/correct-orientation', () => ({
  correctOrientation: vi.fn().mockRejectedValue(new Error('not a blob')),
}));

vi.mock('./components/toolbar', () => ({
  ImageEditorToolbar: () => React.createElement('div', { 'data-testid': 'toolbar' }),
}));

describe('ImageEditor', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    latestMockEngine = null;
    // Reset store
    useImageEditorStore.setState({
      activeTool: 'select',
      originalImage: null,
      isLoading: true,
      imageBlockId: null,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
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

  it('shows error overlay when image fails to load', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/bad.png' })
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Failed to load image');
      expect(container.textContent).toContain('Network error');
    });
  });

  it('shows retry button on error', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('Timeout'));

    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/timeout.png' })
    );

    await waitFor(() => {
      const retryButton = container.querySelector('button');
      expect(retryButton).toBeDefined();
      expect(retryButton?.textContent).toContain('Retry');
    });
  });

  it('retry button re-triggers init', async () => {
    mockLoadImage
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce({ naturalWidth: 800, naturalHeight: 600, src: 'test' });

    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/retry.png' })
    );

    // Wait for error state
    await waitFor(() => {
      expect(container.textContent).toContain('Failed to load image');
    });

    // Click retry
    const retryButton = container.querySelector('button')!;
    fireEvent.click(retryButton);

    // loadImage should be called again
    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });

  it('disposes engine on unmount', async () => {
    const { unmount } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );

    // Wait for engine to be created
    await waitFor(() => {
      expect(latestMockEngine).not.toBeNull();
    });

    const engineToCheck = latestMockEngine;
    unmount();

    expect(engineToCheck.dispose).toHaveBeenCalled();
  });

  it('has tabIndex for keyboard/paste focus', () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('tabindex')).toBe('0');
  });

  it('accepts drag-over events without error', () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );
    const wrapper = container.firstElementChild as HTMLElement;

    // Should not throw
    fireEvent.dragOver(wrapper, {
      dataTransfer: { files: [], getData: () => '' },
    });
  });

  it('handles drop with image file', async () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(1);
    });

    const wrapper = container.firstElementChild as HTMLElement;
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.drop(wrapper, {
      dataTransfer: {
        files: [file],
        getData: () => '',
      },
    });

    // Should trigger a second load (re-init with the dropped file)
    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });

  it('handles paste with image blob', async () => {
    const { container } = render(
      React.createElement(ImageEditor, { src: 'https://example.com/img.png' })
    );

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(1);
    });

    const wrapper = container.firstElementChild as HTMLElement;
    const blob = new File(['data'], 'clipboard.png', { type: 'image/png' });

    fireEvent.paste(wrapper, {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => blob,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(mockLoadImage).toHaveBeenCalledTimes(2);
    });
  });
});
