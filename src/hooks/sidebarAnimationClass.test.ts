import { describe, expect, it } from 'vitest';
import { resolveAnimationClass } from './useSidebarAnimation';

describe('resolveAnimationClass', () => {
  it('floating and hidden exits at once, without waiting for an effect', () => {
    expect(resolveAnimationClass(true, false, '')).toBe('sidebar-exit');
    expect(resolveAnimationClass(true, false, 'sidebar-enter')).toBe('sidebar-exit');
  });

  it('floating and visible keeps the state class', () => {
    expect(resolveAnimationClass(true, true, 'sidebar-enter')).toBe('sidebar-enter');
    expect(resolveAnimationClass(true, true, '')).toBe('');
  });

  it('pinned never animates', () => {
    expect(resolveAnimationClass(false, true, 'sidebar-enter')).toBe('');
    expect(resolveAnimationClass(false, false, 'sidebar-exit')).toBe('');
  });
});
