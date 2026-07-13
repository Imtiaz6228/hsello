# Premium Seller Center redesign

The Seller Center was redesigned as an additive front-end layer. Existing API routes, permissions, product publishing, file and inventory upload, order chat, storefront editing, finance data, and withdrawal submission remain connected to their original workflows.

## Included improvements

- Premium grouped desktop navigation and animated mobile drawer
- Sticky mobile bottom navigation and publish-product action
- Balance hero, live refresh state, eight seller metrics, responsive revenue visual, quick actions, and recent orders
- Searchable/filterable product and order management views
- Financial Center using the existing seller finance endpoint
- Withdrawal form and history using the existing wallet endpoints
- Analytics, notification, buyer-message, and storefront views in one consistent system
- Responsive layouts for mobile, tablet, laptop, desktop, and wide screens
- Focus, hover, loading, success, warning, empty, and status treatments

## Validation

- Web TypeScript check passed
- API TypeScript check passed after Prisma Client generation
- Vite production build passed

Run `npm install`, `npm run prisma:generate`, and `npm run dev` for local development.
