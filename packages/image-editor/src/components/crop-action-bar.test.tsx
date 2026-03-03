import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CropActionBar } from './crop-action-bar';

afterEach(cleanup);

describe('CropActionBar', () => {
  it('renders Apply and Cancel buttons', () => {
    render(React.createElement(CropActionBar, { onApply: vi.fn(), onCancel: vi.fn() }));

    expect(screen.getByTestId('crop-apply')).toBeDefined();
    expect(screen.getByTestId('crop-cancel')).toBeDefined();
  });

  it('calls onApply when Apply button is clicked', () => {
    const onApply = vi.fn();
    render(React.createElement(CropActionBar, { onApply, onCancel: vi.fn() }));

    fireEvent.click(screen.getByTestId('crop-apply'));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(React.createElement(CropActionBar, { onApply: vi.fn(), onCancel }));

    fireEvent.click(screen.getByTestId('crop-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('displays correct button labels', () => {
    render(React.createElement(CropActionBar, { onApply: vi.fn(), onCancel: vi.fn() }));

    expect(screen.getByTestId('crop-apply').textContent).toContain('Apply');
    expect(screen.getByTestId('crop-cancel').textContent).toContain('Cancel');
  });
});
