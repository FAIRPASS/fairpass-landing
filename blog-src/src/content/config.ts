import { defineCollection, z } from 'astro:content';

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  author: z.string().default('FAIRPASS 팀'),
  image: z.string().optional(),
  draft: z.boolean().default(false),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
});

export const collections = {
  'blog-ko': defineCollection({ type: 'content', schema: postSchema }),
  'blog-en': defineCollection({ type: 'content', schema: postSchema }),
};
