export type Lang = 'en' | 'cs';

export function homeHref(lang: Lang): string {
  return lang === 'cs' ? '/cs/' : '/';
}

export function cvHref(lang: Lang): string {
  return lang === 'cs' ? '/cs/cv' : '/cv';
}

export function postHref(lang: Lang, slug: string): string {
  return lang === 'cs' ? `/cs/posts/${slug}` : `/posts/${slug}`;
}

export function postsPageHref(lang: Lang, page: number): string {
  const base = lang === 'cs' ? '/cs/page' : '/page';
  return `${base}/${page}`;
}

export function formatDate(date: Date, lang: Lang): string {
  const locale = lang === 'cs' ? 'cs-CZ' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

