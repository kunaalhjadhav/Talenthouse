const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** Simple server-side fetch helper for public, unauthenticated GET endpoints (SSR-friendly, no client JS needed for these). */
export async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: revalidateSeconds } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
