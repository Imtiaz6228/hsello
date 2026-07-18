import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryMatches,
  productCategoryBuckets,
} from "../src/commerce/catalogHierarchy";
import { catalogCategories, catalogProducts } from "../src/data/catalog";

test("Social Media includes products assigned to the legacy platform tree", () => {
  const instagramProduct = catalogProducts.find(
    (product) => product.categorySlug === "instagram-reels-templates",
  );
  assert.ok(instagramProduct);
  assert.equal(
    categoryMatches(
      instagramProduct.categorySlug,
      "social-media-marketplace",
      catalogCategories,
    ),
    true,
  );
});

test("category buckets count products under canonical and legacy roots", () => {
  const buckets = productCategoryBuckets(
    "instagram-reels-templates",
    catalogCategories,
  );
  assert.equal(buckets.has("instagram"), true);
  assert.equal(buckets.has("social-media-marketplace"), true);
});
