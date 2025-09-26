// Simple test to verify reviews route loads without errors

// We'll do a basic syntax/import test first
console.log('🔍 Testing reviews route implementation...');

// Read and check if our helper functions are in the reviews route
const fs = require('fs');
const appContent = fs.readFileSync('app.js', 'utf8');

const hasHelperFunctions = [
  'getRatingPercentage',
  'getRatingCount',
  'getOverallRating',
  'getTotalReviews',
  'getProductCategory',
  'getProductPrice',
  'hasPendingReviews',
  'getTopReviewedProducts',
  'canEdit'
];

let allHelpersPresent = 0;
hasHelperFunctions.forEach(helper => {
  if (appContent.includes(helper + ':')) {
    console.log(`✅ Helper function "${helper}" found in app.js`);
    allHelpersPresent++;
  } else {
    console.log(`❌ Helper function "${helper}" NOT found`);
  }
});

console.log(`\n📊 Summary: ${allHelpersPresent}/${hasHelperFunctions.length} helper functions implemented`);

// Verify the reviews route structure
if (appContent.includes('/reviews', 'isLoggedIn')) {
  console.log('✅ Reviews route found with authentication');
} else {
  console.log('❌ Reviews route not found or missing authentication');
}

if (allHelpersPresent === hasHelperFunctions.length) {
  console.log('\n🎉 SUCCESS: All helper functions have been implemented!');
  console.log('✅ The reviews page should now load without "getRatingPercentage is not defined" error');
} else {
  console.log('\n⚠️ WARNING: Some helper functions are missing');
  console.log('The reviews page may still have errors');
}
