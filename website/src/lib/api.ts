const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try { const res = await fetch(`${API_URL}${path}`, { next: { revalidate: revalidateSeconds } }); if (!res.ok) return null; return res.json(); } catch { return null; }
}

/** Categories managed in the admin dashboard; falls back to the built-in list if the API is unreachable. */
export async function fetchCategories(type: 'CONTEST' | 'REEL' | 'TALENT' | 'AUDITION', fallback: string[]): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/public/categories?type=${type}`);
    if (!res.ok) return fallback;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? ['All', ...rows.map((r: any) => r.name)] : fallback;
  } catch { return fallback; }
}
