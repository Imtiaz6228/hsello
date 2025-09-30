// SEO Middleware for Dynamic Meta Tags
const path = require('path');

class SEOMiddleware {
  constructor() {
    this.defaultSEO = {
      title: 'Hsello - Premium Digital Marketplace | Buy & Sell Digital Accounts, Services & Tools',
      description: 'Discover premium digital accounts, services, and tools at Hsello. Buy verified Instagram, Gmail, Facebook accounts, and more with secure transactions and instant delivery. Trusted by 25,000+ users.',
      keywords: 'digital marketplace, buy instagram accounts, sell gmail accounts, digital products, verified accounts, social media accounts, premium accounts, digital services, online marketplace, secure transactions',
      author: 'Hsello',
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      language: 'English',
      revisitAfter: '1 days',
      canonical: 'https://hsello.com/',
      ogType: 'website',
      ogImage: 'https://hsello.com/images/og-image.jpg',
      ogImageWidth: '1200',
      ogImageHeight: '630',
      twitterCard: 'summary_large_image',
      twitterImage: 'https://hsello.com/images/twitter-image.jpg'
    };
  }

  // Generate SEO data for different page types
  generateSEO(pageType, data = {}) {
    const seo = { ...this.defaultSEO };

    switch (pageType) {
      case 'product':
        seo.title = `${data.name || 'Premium Digital Product'} - Buy Now | Hsello`;
        seo.description = `${data.description || data.shortDescription || 'Premium digital product with instant delivery and secure payment'}. Price: $${data.price || 'N/A'}. Trusted seller on Hsello marketplace.`;
        seo.keywords = `${data.name || 'digital product'}, ${data.itemCategory || 'digital'}, buy ${data.itemCategory || 'digital product'}, premium accounts, verified products, instant delivery`;
        seo.canonical = `https://hsello.com/product/${data.sellerId || 'seller'}/${data.id || 'product'}`;
        seo.ogType = 'product';
        seo.ogImage = data.images && data.images.length > 0 ? `https://hsello.com/uploads/${data.images[0]}` : seo.ogImage;
        break;

      case 'store':
        seo.title = `${data.storeName || 'Digital Store'} - Premium Digital Products | Hsello`;
        seo.description = `${data.storeDescription || 'Premium digital store offering verified accounts, services, and tools with instant delivery and secure transactions.'} ${data.totalProducts || 'Multiple'} products available.`;
        seo.keywords = `${data.storeName || 'digital store'}, digital marketplace, verified accounts, premium products, instant delivery, secure payments`;
        seo.canonical = `https://hsello.com/store/${data.sellerId || 'seller'}`;
        seo.ogType = 'website';
        break;

      case 'category':
        seo.title = `${data.categoryName || 'Digital Products'} - Buy Premium Accounts | Hsello`;
        seo.description = `Browse ${data.categoryName || 'premium digital products'} at Hsello. Verified accounts, instant delivery, secure payments. ${data.productCount || 'Multiple'} products available.`;
        seo.keywords = `${data.categoryName || 'digital products'}, buy ${data.categoryName || 'accounts'}, premium marketplace, verified products, instant delivery`;
        seo.canonical = `https://hsello.com/products?category=${encodeURIComponent(data.categoryName || '')}`;
        break;

      case 'login':
        seo.title = 'Login to Hsello - Secure Digital Marketplace Access';
        seo.description = 'Login to your Hsello account to access premium digital products, manage orders, and enjoy secure transactions. Join 25,000+ satisfied customers.';
        seo.keywords = 'login, digital marketplace, account access, secure login, user dashboard, order management';
        seo.canonical = 'https://hsello.com/login';
        seo.robots = 'noindex, nofollow'; // Don't index login pages
        break;

      case 'signup':
        seo.title = 'Sign Up for Hsello - Join Premium Digital Marketplace';
        seo.description = 'Create your free Hsello account today. Buy and sell premium digital products with secure transactions and instant delivery. Join 25,000+ users.';
        seo.keywords = 'signup, register, digital marketplace, create account, premium products, secure transactions';
        seo.canonical = 'https://hsello.com/signup';
        break;

      case 'blog':
        seo.title = `${data.title || 'Digital Marketing Blog'} - Hsello Insights`;
        seo.description = data.excerpt || 'Stay updated with the latest digital marketing trends, marketplace insights, and premium account buying guides from Hsello.';
        seo.keywords = `${data.tags ? data.tags.join(', ') : 'digital marketing, marketplace insights, buying guides, premium accounts'}`;
        seo.canonical = `https://hsello.com/blog/${data.slug || 'article'}`;
        seo.ogType = 'article';
        break;

      case 'admin':
        seo.title = `Admin ${data.pageName || 'Dashboard'} - Hsello Management`;
        seo.description = `Hsello administration panel - ${data.pageName || 'Dashboard'} for managing digital marketplace operations.`;
        seo.canonical = `https://hsello.com/admin/${data.pageSlug || 'dashboard'}`;
        seo.robots = 'noindex, nofollow'; // Don't index admin pages
        break;

      case 'orders':
        seo.title = 'My Orders - Track Your Digital Product Purchases | Hsello';
        seo.description = 'Track your digital product orders, download purchased items, and manage your Hsello marketplace transactions securely.';
        seo.keywords = 'orders, purchases, digital products, order tracking, downloads, transaction history';
        seo.canonical = 'https://hsello.com/orders';
        seo.robots = 'noindex, nofollow'; // Private user data
        break;

      case 'profile':
        seo.title = 'My Profile - Manage Your Hsello Account';
        seo.description = 'Manage your Hsello profile, update account information, and customize your digital marketplace experience.';
        seo.keywords = 'profile, account settings, user management, digital marketplace';
        seo.canonical = 'https://hsello.com/profile';
        seo.robots = 'noindex, nofollow'; // Private user data
        break;

      case 'become-seller':
        seo.title = 'Become a Seller - Start Selling Digital Products | Hsello';
        seo.description = 'Join Hsello as a seller and start earning money by selling premium digital products. Easy application process, instant payouts, and dedicated support.';
        seo.keywords = 'become seller, sell digital products, marketplace seller, earn money online, digital commerce';
        seo.canonical = 'https://hsello.com/become-seller';
        break;

      case 'contact':
        seo.title = 'Contact Us - Get Help with Digital Products | Hsello';
        seo.description = 'Need help with your digital product purchase? Contact Hsello support team for instant assistance. 24/7 customer support available.';
        seo.keywords = 'contact, support, help, customer service, digital marketplace';
        seo.canonical = 'https://hsello.com/contact';
        break;

      case 'services':
        seo.title = 'Digital Services - Professional Digital Marketing Services | Hsello';
        seo.description = 'Professional digital marketing services including SEO, social media growth, content creation, and digital strategy consulting.';
        seo.keywords = 'digital services, SEO, social media marketing, content creation, digital strategy';
        seo.canonical = 'https://hsello.com/services';
        break;

      default:
        // Keep default SEO for homepage and other pages
        break;
    }

    return seo;
  }

  // Generate structured data for different content types
  generateStructuredData(pageType, data = {}) {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Hsello",
      "url": "https://hsello.com",
      "description": "Premium digital marketplace for buying and selling verified digital accounts, services, and tools",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://hsello.com/products?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    switch (pageType) {
      case 'product':
        return {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": data.name || "Digital Product",
          "description": data.description || data.shortDescription || "Premium digital product",
          "image": data.images && data.images.length > 0 ? `https://hsello.com/uploads/${data.images[0]}` : "https://hsello.com/images/product-placeholder.jpg",
          "offers": {
            "@type": "Offer",
            "price": data.price || 0,
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "name": data.storeName || "Hsello Seller"
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": data.averageRating || 4.8,
            "reviewCount": data.reviewCount || 0
          }
        };

      case 'store':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": data.storeName || "Digital Store",
          "description": data.storeDescription || "Premium digital products store",
          "url": `https://hsello.com/store/${data.sellerId}`,
          "logo": data.logo ? `https://hsello.com/uploads/${data.logo}` : "https://hsello.com/images/store-logo.png",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": data.rating || 4.8,
            "reviewCount": data.reviewCount || 0
          }
        };

      case 'organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Hsello",
          "url": "https://hsello.com",
          "logo": "https://hsello.com/images/logo.png",
          "description": "Premium digital marketplace for buying and selling verified digital accounts, services, and tools",
          "foundingDate": "2025",
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+1-555-0123",
            "contactType": "customer service",
            "availableLanguage": "English"
          },
          "sameAs": [
            "https://twitter.com/hsello",
            "https://facebook.com/hsello",
            "https://instagram.com/hsello"
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "1250",
            "bestRating": "5",
            "worstRating": "1"
          }
        };

      case 'breadcrumb':
        const breadcrumbs = data.breadcrumbs || [];
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": crumb.url
          }))
        };

      default:
        return baseData;
    }
  }

  // Middleware function to inject SEO data into res.locals
  middleware() {
    return (req, res, next) => {
      // Set default SEO data
      res.locals.seo = this.generateSEO('default');

      // Add SEO helper functions to locals
      res.locals.setSEO = (pageType, data) => {
        res.locals.seo = this.generateSEO(pageType, data);
      };

      res.locals.getStructuredData = (pageType, data) => {
        return this.generateStructuredData(pageType, data);
      };

      // Set current URL for canonical links
      res.locals.currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

      next();
    };
  }

  // Generate robots.txt content
  generateRobotsTxt() {
    return `User-agent: *
Allow: /
Allow: /products
Allow: /stores
Allow: /blog
Allow: /services
Allow: /become-seller

Disallow: /admin/
Disallow: /login
Disallow: /signup
Disallow: /profile
Disallow: /orders
Disallow: /favorites
Disallow: /api/
Disallow: /uploads/private/

# Allow access to CSS, JS, and image files
Allow: /css/
Allow: /js/
Allow: /images/

# Sitemap
Sitemap: https://hsello.com/sitemap.xml
Sitemap: https://hsello.com/sitemap-llm.xml`;
  }

  // Generate XML sitemap
  generateXMLSitemap(urls = []) {
    const defaultUrls = [
      { url: 'https://hsello.com/', priority: '1.0', changefreq: 'daily' },
      { url: 'https://hsello.com/products', priority: '0.9', changefreq: 'daily' },
      { url: 'https://hsello.com/stores', priority: '0.8', changefreq: 'weekly' },
      { url: 'https://hsello.com/services', priority: '0.7', changefreq: 'monthly' },
      { url: 'https://hsello.com/become-seller', priority: '0.8', changefreq: 'monthly' },
      { url: 'https://hsello.com/blog', priority: '0.6', changefreq: 'weekly' },
      { url: 'https://hsello.com/contact', priority: '0.5', changefreq: 'monthly' }
    ];

    const allUrls = [...defaultUrls, ...urls];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    allUrls.forEach(urlData => {
      xml += '  <url>\n';
      xml += `    <loc>${urlData.url}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += `    <changefreq>${urlData.changefreq}</changefreq>\n`;
      xml += `    <priority>${urlData.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  // Generate LLM sitemap for ChatGPT, Grok, and other AI models
  generateLLMSitemap(urls = []) {
    const defaultUrls = [
      {
        url: 'https://hsello.com/',
        title: 'Hsello - Premium Digital Marketplace',
        description: 'Buy and sell verified digital accounts, services, and tools with secure transactions and instant delivery.',
        keywords: ['digital marketplace', 'buy accounts', 'sell products', 'verified accounts', 'instant delivery']
      },
      {
        url: 'https://hsello.com/products',
        title: 'Browse Digital Products - Hsello',
        description: 'Explore thousands of premium digital products including Instagram accounts, Gmail accounts, and more.',
        keywords: ['digital products', 'accounts for sale', 'premium products', 'verified accounts']
      },
      {
        url: 'https://hsello.com/stores',
        title: 'Top Digital Stores - Hsello',
        description: 'Discover trusted sellers and premium digital stores offering verified accounts and services.',
        keywords: ['digital stores', 'trusted sellers', 'premium stores', 'verified sellers']
      },
      {
        url: 'https://hsello.com/become-seller',
        title: 'Become a Seller - Hsello',
        description: 'Start selling digital products on Hsello. Easy application, instant payouts, and dedicated support.',
        keywords: ['become seller', 'sell online', 'digital marketplace', 'earn money']
      }
    ];

    const allUrls = [...defaultUrls, ...urls];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:llm="https://schema.org/llm">\n';

    allUrls.forEach(urlData => {
      xml += '  <url>\n';
      xml += `    <loc>${urlData.url}</loc>\n`;
      xml += `    <llm:title>${urlData.title}</llm:title>\n`;
      xml += `    <llm:description>${urlData.description}</llm:description>\n`;
      if (urlData.keywords && urlData.keywords.length > 0) {
        xml += `    <llm:keywords>${urlData.keywords.join(', ')}</llm:keywords>\n`;
      }
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }
}

module.exports = new SEOMiddleware();