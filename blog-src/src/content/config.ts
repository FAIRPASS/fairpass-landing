import { defineCollection, z } from 'astro:content';

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  author: z.string().default('FAIRPASS 팀'),
  authorTitle: z.string().default(''),
  image: z.string().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  status: z.enum(['draft', 'review', 'approved', 'published']).default('draft'),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  translationKey: z.string().optional(),
  snsCopy: z.object({
    linkedinKo: z.string().default(''),
    linkedinEn: z.string().default(''),
    instagramKo: z.string().default(''),
    instagramEn: z.string().default(''),
    naverBlog: z.string().default(''),
  }).optional(),
});

export const collections = {
  'journal-ko': defineCollection({ type: 'content', schema: postSchema }),
  'journal-en': defineCollection({ type: 'content', schema: postSchema }),
};
