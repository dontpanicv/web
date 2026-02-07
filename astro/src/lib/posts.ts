import { getCollection } from 'astro:content';

import type { Lang } from './i18n';

type PostCollection = 'posts' | 'postsCs';

function collectionForLang(lang: Lang): PostCollection {
  return lang === 'cs' ? 'postsCs' : 'posts';
}

export async function getPublishedPosts(lang: Lang) {
  const collection = collectionForLang(lang);
  const entries = await getCollection(collection);
  return entries
    .filter((p) => p.data.status !== 'draft')
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getAllPosts(lang: Lang) {
  const collection = collectionForLang(lang);
  const entries = await getCollection(collection);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

