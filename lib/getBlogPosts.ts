import { parseStringPromise } from 'xml2js'

export type BlogSource = 'medium' | 'substack'

export interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  categories: string[];
  creator: string;
  content: string;
  guid: string;
  imageUrl?: string;
  source: BlogSource;
}

interface RSSItem {
  title: [string];
  link: [string];
  pubDate: [string];
  category?: [string];
  'dc:creator'?: [string];
  'content:encoded'?: [string];
  description?: [string];
  guid: [string | { _: string }];
  enclosure?: [{ $: { url?: string } }];
}

interface RSSFeed {
  rss: {
    channel: [{
      item?: RSSItem[];
    }];
  };
}

// Each feed the blog page pulls from. Substack's subdomain is whatever the
// publication was created with; if it is renamed in Substack settings, update it here.
const FEEDS: { source: BlogSource; url: string }[] = [
  { source: 'medium', url: 'https://medium.com/@bertomill/feed' },
  { source: 'substack', url: 'https://robertmillwriting.substack.com/feed' },
]

const stripCdata = (value: string) => value.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')

// Helper function to extract first image URL from content
const extractImageUrl = (content: string): string | undefined => {
  const imgRegex = /<img[^>]+src="([^"]+)"/i
  const match = content.match(imgRegex)
  return match ? match[1] : undefined
}

async function fetchFeed(source: BlogSource, url: string): Promise<BlogPost[]> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }
    })

    const xmlData = await response.text()
    const result = await parseStringPromise(xmlData) as RSSFeed
    const items = result.rss.channel[0].item ?? []

    return items.map((item: RSSItem) => {
      const content = stripCdata(item['content:encoded']?.[0] || item.description?.[0] || '')
      const rawGuid = item.guid?.[0]
      const guid = typeof rawGuid === 'string' ? rawGuid : rawGuid?._ ?? item.link[0]

      return {
        title: stripCdata(item.title[0]),
        link: item.link[0],
        pubDate: item.pubDate[0],
        categories: item.category?.map(stripCdata) || [],
        creator: stripCdata(item['dc:creator']?.[0] || ''),
        content,
        guid,
        imageUrl: extractImageUrl(content) ?? item.enclosure?.[0]?.$?.url,
        source,
      }
    })
  } catch (error) {
    console.error(`Error fetching ${source} blog posts:`, error)
    return []
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const results = await Promise.all(FEEDS.map(feed => fetchFeed(feed.source, feed.url)))

  return results
    .flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
}
