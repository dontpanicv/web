import { defineCollection, z } from 'astro:content';

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  tags: z.array(z.string()).optional(),
  translationKey: z.string().optional(),
  xUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
});

const posts = defineCollection({
  type: 'content',
  schema: postSchema,
});

const postsCs = defineCollection({
  type: 'content',
  schema: postSchema,
});

export const collections = { posts, postsCs };

