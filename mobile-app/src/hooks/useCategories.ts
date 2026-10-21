import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CONTENT_CATEGORIES, TALENT_CATEGORIES, AUDITION_CATEGORIES } from '../constants/categories';

type Cat = { key: string; label: string; icon: string };
const FALLBACK: Record<string, Cat[]> = { CONTEST: CONTENT_CATEGORIES, REEL: CONTENT_CATEGORIES, TALENT: TALENT_CATEGORIES, AUDITION: AUDITION_CATEGORIES };
const cache: Record<string, Cat[]> = {};

/** Categories managed in the admin dashboard (Categories tab). Falls back to the built-in list while loading or offline. */
export function useCategories(type: 'CONTEST' | 'REEL' | 'TALENT' | 'AUDITION'): Cat[] {
  const [list, setList] = useState<Cat[]>(cache[type] || FALLBACK[type]);
  useEffect(() => {
    let alive = true;
    api.get('/public/categories', { params: { type } }).then((r) => {
      if (!alive || !Array.isArray(r.data) || r.data.length === 0) return;
      const mapped: Cat[] = [{ key: 'All', label: 'All', icon: '✨' }, ...r.data.map((c: any) => ({ key: c.name, label: c.name, icon: c.icon || '•' }))];
      cache[type] = mapped; setList(mapped);
    }).catch(() => {});
    return () => { alive = false; };
  }, [type]);
  return list;
}
