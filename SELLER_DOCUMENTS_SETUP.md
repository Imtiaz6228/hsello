# Seller document approval changes

This ZIP adds mandatory seller document verification to the existing seller application flow.

## What changed

- Seller application now requires:
  - Store name
  - Name on document
  - Document type: ID card/CNIC or passport
  - Front-side document upload
  - Back-side document upload
- Submitted applications show as pending approval / in moderation.
- Admin seller application cards show document details and private download links for front/back documents.
- Product upload routes now double-check that the seller application is approved and the seller profile is verified/not suspended.
- Seller documents are saved in `PRIVATE_UPLOAD_DIR`, not public `/uploads`.

## Deployment notes

1. Deploy the updated code.
2. Railway should run the included Prisma migration automatically through your existing `preDeployCommand`.
3. For reliable document storage on Railway, mount a persistent volume and set:

```env
PRIVATE_UPLOAD_DIR=/app/private-uploads
```

4. If ID/passport images are bigger than 2 MB, increase:

```env
MAX_UPLOAD_BYTES=5242880
```

Do not store real document uploads in GitHub. Uploaded files should remain only on the server/private volume.
