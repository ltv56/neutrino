import { describe, expect, it } from 'vitest';
import { splitPageSuffix } from './wikilink';

describe('splitPageSuffix', () => {
  it('parses #N', () => {
    expect(splitPageSuffix('Paper#5')).toEqual({ title: 'Paper', page: 5 });
  });

  it('parses #page=N', () => {
    expect(splitPageSuffix('Paper#page=5')).toEqual({ title: 'Paper', page: 5 });
  });

  it('keeps titles without a page', () => {
    expect(splitPageSuffix('Paper')).toEqual({ title: 'Paper', page: null });
    expect(splitPageSuffix('Paper.pdf')).toEqual({ title: 'Paper.pdf', page: null });
  });

  it('only splits at the last # and keeps earlier ones in the title', () => {
    expect(splitPageSuffix('C#notes#12')).toEqual({ title: 'C#notes', page: 12 });
  });

  it('ignores a non-numeric suffix', () => {
    expect(splitPageSuffix('Paper#intro')).toEqual({ title: 'Paper#intro', page: null });
    expect(splitPageSuffix('Paper#page=x')).toEqual({ title: 'Paper#page=x', page: null });
  });

  it('does not produce an empty title', () => {
    expect(splitPageSuffix('#5')).toEqual({ title: '#5', page: null });
  });
});
