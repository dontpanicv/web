import { getCollection } from 'astro:content';
import * as fs from 'fs';
import * as path from 'path';

import type { Lang } from './i18n';

type PostCollection = 'posts' | 'postsCs';

function collectionForLang(lang: Lang): PostCollection {
  return lang === 'cs' ? 'postsCs' : 'posts';
}

export async function getPublishedPosts(lang: Lang) {
  const collection = collectionForLang(lang);
  const entries = await getCollection(collection);
  // Read raw markdown for each post
  return (
    await Promise.all(
      entries
        .filter((p) => p.data.status !== 'draft')
        .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
        .map(async (post) => {
          try {
            const contentDir = path.join(process.cwd(), 'src', 'content');
            const filePath = path.join(contentDir, collection, `${post.slug}.md`);
            const raw = fs.readFileSync(filePath, 'utf-8');
            return { ...post, rawMarkdown: raw };
          } catch {
            return { ...post, rawMarkdown: null };
          }
        })
    )
  );
}

export async function getAllPosts(lang: Lang) {
  const collection = collectionForLang(lang);
  const entries = await getCollection(collection);
  // Read raw markdown for each post
  return (
    await Promise.all(
      entries
        .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
        .map(async (post) => {
          try {
            const contentDir = path.join(process.cwd(), 'src', 'content');
            const filePath = path.join(contentDir, collection, `${post.slug}.md`);
            const raw = fs.readFileSync(filePath, 'utf-8');
            return { ...post, rawMarkdown: raw };
          } catch {
            return { ...post, rawMarkdown: null };
          }
        })
    )
  );
}

