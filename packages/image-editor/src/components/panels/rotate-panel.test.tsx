import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RotatePanel } from './rotate-panel';

afterEach(cleanup);

function renderPanel(overrides: Partial<React.ComponentProps<typeof RotatePanel>> = {}) {
  const defaults = {
    rotation: 0,
    flipH: false,
    flipV: false,
    onRotationChange: vi.fn(),
    onRotateClockwise: vi.fn(),
    onRotateCounterClockwise: vi.fn(),
    onFlipHorizontal: vi.fn(),
    onFlipVertical: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(React.createElement(RotatePanel, defaults));
  return defaults;
}

describe('RotatePanel', () => {
  it('renders all interactive elements', () => {
    renderPanel();
    expect(screen.getByTestId('rotation-slider')).toBeDefined();
    expect(screen.getByTestId('rotate-cw')).toBeDefined();
    expect(screen.getByTestId('rotate-ccw')).toBeDefined();
    expect(screen.getByTestId('flip-h')).toBeDefined();
    expect(screen.getByTestId('flip-v')).toBeDefined();
  });

  it('displays the current rotation value', () => {
    renderPanel({ rotation: 45 });
    expect(screen.getByText(/45°/)).toBeDefined();
  });

  it('calls onRotateClockwise when +90° clicked', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTestId('rotate-cw'));
    expect(props.onRotateClockwise).toHaveBeenCalledOnce();
  });

  it('calls onRotateCounterClockwise when -90° clicked', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTestId('rotate-ccw'));
    expect(props.onRotateCounterClockwise).toHaveBeenCalledOnce();
  });

  it('calls onFlipHorizontal when Flip H clicked', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTestId('flip-h'));
    expect(props.onFlipHorizontal).toHaveBeenCalledOnce();
  });

  it('calls onFlipVertical when Flip V clicked', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTestId('flip-v'));
    expect(props.onFlipVertical).toHaveBeenCalledOnce();
  });

  it('Flip H button highlights when flipH is true', () => {
    renderPanel({ flipH: true });
    const btn = screen.getByTestId('flip-h');
    // Uses the 'default' variant (primary) when active
    expect(btn.className).toContain('bg-primary');
  });

  it('Flip V button highlights when flipV is true', () => {
    renderPanel({ flipV: true });
    const btn = screen.getByTestId('flip-v');
    expect(btn.className).toContain('bg-primary');
  });
});
