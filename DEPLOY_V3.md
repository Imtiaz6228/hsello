# HSello v3 deployment

Deploy the complete package, including both the frontend and API service. The rebuilt `dist` contains the corrected mobile catalog. The rebuilt `dist-api` contains `/api/marketplace/stores`, which supplies recently admin-approved, active sellers to Featured Sellers.

After deployment, clear the hosting/CDN cache or create a fresh deployment. The catalog should load `CatalogPage-CzxY7RXU.js` and the stylesheet `index-wKlrA6j1.css`; older asset names indicate a cached v2 deployment.

PrimeStore appears when its `SellerProfile` has `isVerified=true`, `isSuspended=false`, and its related user is not suspended. Newly approved stores are ordered first.
