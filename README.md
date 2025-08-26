This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## UI Updates

- Home page background updated to a subtle linear gradient using `#9da7ae` and `#939198`. Implemented on the root container in `app/page.tsx` via Chakra's `bgGradient` prop.
- Hero spacing adjusted to bring the flip-card and intro text higher on screen; see container `pt` values in `app/page.tsx`.
- Navbar and card borders re-tinted to the same bluish-purple hue to maintain consistent palette.
- Added Art gallery page at `app/art/page.tsx` rendering images from `public/art` in a responsive grid. Navbar now includes an `Art` link.
- Footer adapts on `/art` to the same bluish‑purple gradient and divider color to keep visual consistency.
- Increased top padding on the Art page to provide spacing below the fixed navbar.
- Global background updated to the bluish‑purple gradient across all pages via `app/globals.css`. Removed `bg-white` from layout wrappers in `app/layout.tsx`.
 - Home page cards updated to match site style: replaced ad-hoc `bg`/`borderColor` props with the global `glass-effect` class on cards in `app/page.tsx` (featured projects container, blog section, video section, and individual item cards).
- Fixed navbar overlap issue on homepage by increasing top padding from `pt={{ base: 6, sm: 8, md: 12, lg: 14 }}` to `pt={{ base: 20, sm: 24, md: 28, lg: 32 }}` in `app/page.tsx` to ensure proper spacing below the navbar.
- Fixed TypeScript compilation errors by adding missing `Book` type to schema and temporarily disabling RAG functionality in chat API to resolve database file reference issues.
- Enhanced chat widget and API with conversation history support - the AI assistant now maintains context across messages for better conversational flow.
- Fixed RAG (Retrieval-Augmented Generation) functionality to enable resume document search - AI assistant can now access and answer questions about specific resume content including football coaching experience.
- Updated chat widget design to match architectural minimalist theme with warm beige/charcoal color palette from globals.css, replaced Input with Textarea for text wrapping, and added keyboard shortcuts (Enter to send, Shift+Enter for new line).
- Added markdown rendering to chat widget responses using react-markdown with custom styled components that match the architectural theme, including proper formatting for bold text, italics, lists, code blocks, and syntax highlighting.
- Fixed production API timeout issues by adding request timeouts, AbortController support, and enhanced error handling with specific messages for different failure scenarios.
