const mongoose = require('mongoose');
const User = require('./models/User');
const { ObjectId } = mongoose.Types;

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/digitalmarket';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const createDemoProducts = async () => {
    try {
        await connectDB();

        // Create demo seller
        const demoSeller = await User.findOneAndUpdate(
            { email: 'demo@digitalmarket.com' },
            {
                firstName: 'Demo',
                lastName: 'Seller',
                email: 'demo@digitalmarket.com',
                password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewfsl VrDkzoNzMi', // demo123
                isSeller: true,
                balance: 500.00,
                sellerApplication: {
                    pending: false,
                    approved: true,
                    applicationId: new ObjectId()
                },
                store: {
                    name: 'Premium Digital Accounts',
                    category: 'Digital Marketing',
                    description: 'High-quality verified digital accounts and social media accounts',
                    banner: '/uploads/demo-banner.jpg',
                    logo: '/uploads/demo-logo.jpg',
                    contactEmail: 'demo@digitalmarket.com',
                    contactPhone: '+1 (555) 123-4567',
                    items: [],
                    seoDescription: 'Premium digital accounts marketplace',
                    rules: 'All sales final, instant delivery',
                    contactEmail: 'demo@digitalmarket.com',
                    contactPhone: '+1 (555) 123-4567'
                }
            },
            { upsert: true, new: true }
        );

        console.log('✅ Demo seller created/updated');

        // Demo products for Gmail category
        const gmailProducts = [
            {
                id: `gmail_${Date.now()}_1`,
                name: 'Premium Gmail Account - Verified',
                shortDescription: 'Fresh Gmail account with phone & device verification',
                description: 'High-quality Gmail account created with proper verification including phone number and 2FA setup. Perfect for business, marketing, and personal use.',
                seoTitle: 'Premium Gmail Account - Verified & Ready',
                metaDescription: 'Get verified Gmail account with phone verification for business or personal use',
                itemCategory: 'GMail',
                directionCategory: 'Email Services',
                subcategory: 'Verified',
                registrationMethod: 'Advanced',
                profileFullness: 'Full',
                yearOfRegistration: 2024,
                countryOfRegistration: 'USA',
                loginMethod: 'Secure',
                numberOfSubscribers: 1,
                price: 3.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 500,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 150,
                tags: ['gmail', 'verified', 'phone', 'premium', 'business'],
                seoKeywords: ['gmail account', 'verified gmail', 'premium gmail', 'google account'],
                images: ['/uploads/demo-gmail.jpg'],
                files: [
                    {
                        filename: 'demo-gmail-data.txt',
                        filepath: '/uploads/demo-gmail-data.txt',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-gmail-guide.pdf',
                        filepath: '/uploads/demo-gmail-guide.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_gmail_1',
                        userId: 1,
                        userName: 'Alice Johnson',
                        rating: 5,
                        comment: 'Excellent Gmail account, verified and ready to use!',
                        date: new Date('2024-09-01')
                    },
                    {
                        id: 'review_gmail_2',
                        userId: 2,
                        userName: 'Bob Smith',
                        rating: 5,
                        comment: 'Perfect for business use, great price!',
                        date: new Date('2024-09-02')
                    }
                ]
            },
            {
                id: `gmail_${Date.now()}_2`,
                name: 'Business Gmail Package (5 Accounts)',
                shortDescription: '5 verified Gmail accounts with bonus setup guide',
                description: 'Complete business package including 5 verified Gmail accounts, setup instructions, and customer support. Perfect for businesses needing multiple professional email addresses.',
                seoTitle: 'Business Gmail Package - 5 Verified Accounts',
                metaDescription: 'Business Gmail package with 5 verified accounts, setup guide, and support',
                itemCategory: 'GMail',
                directionCategory: 'Email Services',
                subcategory: 'Business',
                registrationMethod: 'Professional',
                profileFullness: 'Full',
                yearOfRegistration: 2024,
                countryOfRegistration: 'USA',
                loginMethod: 'Secure',
                numberOfSubscribers: 5,
                price: 15.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 100,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 85,
                tags: ['gmail', 'business', 'package', 'custom', 'professional'],
                seoKeywords: ['business gmail', 'gmail package', 'corporate email', 'professional gmail'],
                images: ['/uploads/demo-gmail-package.jpg'],
                files: [
                    {
                        filename: 'demo-business-gmail.zip',
                        filepath: '/uploads/demo-business-gmail.zip',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_business_gmail_1',
                        userId: 3,
                        userName: 'Sarah Wilson',
                        rating: 5,
                        comment: 'Great value! All accounts work perfectly.',
                        date: new Date('2024-09-03')
                    }
                ]
            },
            {
                id: `gmail_${Date.now()}_3`,
                name: 'Gmail + Google Drive Premium',
                shortDescription: 'Verified Gmail with 100GB Google Drive storage',
                description: 'Ultimate package: Verified Gmail account with bonus 100GB Google Drive storage. Access to Gmail, Google Drive, Docs, Sheets, and all Google Workspace tools.',
                seoTitle: 'Gmail + Google Drive - 100GB Storage Package',
                metaDescription: 'Premium Gmail + Google Drive package with 100GB cloud storage',
                itemCategory: 'GMail',
                directionCategory: 'Email Services',
                subcategory: 'Premium',
                registrationMethod: 'Ultimate',
                profileFullness: 'Full',
                yearOfRegistration: 2024,
                countryOfRegistration: 'USA',
                loginMethod: 'Secure',
                numberOfSubscribers: 1,
                price: 8.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 200,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 95,
                tags: ['gmail', 'drive', 'storage', 'premium', 'ultimate'],
                seoKeywords: ['gmail drive', 'google drive storage', 'gmail plus drive', 'cloud storage gmail'],
                images: ['/uploads/demo-gmail-drive.jpg'],
                files: [
                    {
                        filename: 'demo-gmail-drive-guide.pdf',
                        filepath: '/uploads/demo-gmail-drive-guide.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-drive-access.txt',
                        filepath: '/uploads/demo-drive-access.txt',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_drive_gmail_1',
                        userId: 4,
                        userName: 'Mike Davis',
                        rating: 5,
                        comment: 'Best value! Gmail + Drive in one package.',
                        date: new Date('2024-09-04')
                    }
                ]
            }
        ];

        // Demo products for Instagram category
        const instagramProducts = [
            {
                id: `instagram_${Date.now()}_1`,
                name: 'Verified Instagram Account - 5K Followers',
                shortDescription: 'Real Instagram account with 5K genuine followers ready to use',
                description: 'High-quality Instagram account with 5K real followers from various demographics. Perfect for business marketing, influencer promotions, or personal use. Account comes with verified email and phone number.',
                seoTitle: 'Verified Instagram Account - 5K Real Followers',
                metaDescription: 'Premium Instagram account with 5K real followers, verified and ready to use',
                itemCategory: 'Instagram',
                directionCategory: 'Social Media',
                subcategory: 'Business Account',
                registrationMethod: 'Full Verification',
                profileFullness: 'Complete',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'App + Browser',
                numberOfSubscribers: 5000,
                price: 19.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 75,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 120,
                tags: ['instagram', 'verified', 'followers', 'real', 'marketing'],
                seoKeywords: ['instagram account', 'verified instagram', 'instagram followers', 'social media account'],
                images: ['/uploads/demo-instagram-5k.jpg'],
                files: [
                    {
                        filename: 'demo-instagram-5k-guide.pdf',
                        filepath: '/uploads/demo-instagram-5k-guide.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-instagram-login.txt',
                        filepath: '/uploads/demo-instagram-login.txt',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_instagram_1',
                        userId: 5,
                        userName: 'Emma Taylor',
                        rating: 5,
                        comment: 'Perfect Instagram account! Real followers and looks professional.',
                        date: new Date('2024-09-01')
                    },
                    {
                        id: 'review_instagram_2',
                        userId: 6,
                        userName: 'James Brown',
                        rating: 4,
                        comment: 'Good quality followers, account working well.',
                        date: new Date('2024-09-02')
                    }
                ]
            },
            {
                id: `instagram_${Date.now()}_2`,
                name: 'Business Instagram Profile - 10K Followers',
                shortDescription: 'Complete business Instagram with custom theme and 10K followers',
                description: 'Premium business Instagram account with professional branding, custom theme, 10K targeted followers, and complete setup. Includes customization guide and management tips.',
                seoTitle: 'Business Instagram - 10K Followers Custom Brand',
                metaDescription: 'Complete business Instagram profile with 10K followers and custom branding',
                itemCategory: 'Instagram',
                directionCategory: 'Social Media',
                subcategory: 'Business Premium',
                registrationMethod: 'Business Verification',
                profileFullness: 'Professional',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'Business Account',
                numberOfSubscribers: 10000,
                price: 34.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 40,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 88,
                tags: ['instagram', 'business', 'custom', 'branding', 'professional'],
                seoKeywords: ['business instagram', 'instagram branding', 'professional ig', 'instagram business'],
                images: ['/uploads/demo-instagram-business.jpg'],
                files: [
                    {
                        filename: 'demo-instagram-business-setup.pdf',
                        filepath: '/uploads/demo-instagram-business-setup.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-instagram-brandbook.pdf',
                        filepath: '/uploads/demo-instagram-brandbook.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_instagram_business_1',
                        userId: 7,
                        userName: 'Lisa Garcia',
                        rating: 5,
                        comment: 'Beautiful business Instagram setup! Highly recommended.',
                        date: new Date('2024-09-03')
                    }
                ]
            }
        ];

        // Demo products for Facebook category
        const facebookProducts = [
            {
                id: `facebook_${Date.now()}_1`,
                name: 'Facebook Verified Account - 2K Friends',
                shortDescription: 'Verified Facebook account with 2K targeted friends',
                description: 'Premium Facebook account with verified badge and 2K quality friends from various demographics. Perfect for business networking and social media marketing. Includes phone verification and email verification.',
                seoTitle: 'Verified Facebook Account - 2K Friends Premium',
                metaDescription: 'Quality Facebook account with 2K friends, verified and ready for marketing',
                itemCategory: 'Facebook',
                directionCategory: 'Social Media',
                subcategory: 'Verified Account',
                registrationMethod: 'Business Verification',
                profileFullness: 'Complete',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'App + Browser',
                numberOfSubscribers: 2000,
                price: 12.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 85,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 145,
                tags: ['facebook', 'verified', 'friends', 'social media', 'marketing'],
                seoKeywords: ['facebook account', 'verified facebook', 'facebook friends', 'social media account'],
                images: ['/uploads/demo-facebook-2k.jpg'],
                files: [
                    {
                        filename: 'demo-facebook-guide.pdf',
                        filepath: '/uploads/demo-facebook-guide.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-facebook-login.txt',
                        filepath: '/uploads/demo-facebook-login.txt',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_facebook_1',
                        userId: 8,
                        userName: 'David Chen',
                        rating: 5,
                        comment: 'Great Facebook account! Verified and good friend quality.',
                        date: new Date('2024-09-01')
                    },
                    {
                        id: 'review_facebook_2',
                        userId: 9,
                        userName: 'Maria Rodriguez',
                        rating: 5,
                        comment: 'Perfect for my marketing needs!',
                        date: new Date('2024-09-02')
                    }
                ]
            },
            {
                id: `facebook_${Date.now()}_2`,
                name: 'Business Facebook Page - 1K Followers',
                shortDescription: 'Established business Facebook page with engaged followers',
                description: 'Ready-to-use business Facebook page with custom branding, 1K engaged followers, and established posting history. Perfect for businesses looking to establish their social media presence immediately.',
                seoTitle: 'Business Facebook Page - 1K Engaged Followers',
                metaDescription: 'Business Facebook page with 1K followers and established presence',
                itemCategory: 'Facebook',
                directionCategory: 'Social Media',
                subcategory: 'Business Page',
                registrationMethod: 'Premium Business',
                profileFullness: 'Corporate',
                yearOfRegistration: 2022,
                countryOfRegistration: 'USA',
                loginMethod: 'Business Account',
                numberOfSubscribers: 1000,
                price: 25.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 60,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 98,
                tags: ['facebook', 'business', 'page', 'engaged', 'corporate'],
                seoKeywords: ['business facebook page', 'facebook business', 'corporate facebook', 'established facebook'],
                images: ['/uploads/demo-facebook-page.jpg'],
                files: [
                    {
                        filename: 'demo-facebook-page-setup.pdf',
                        filepath: '/uploads/demo-facebook-page-setup.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-facebook-branding.pdf',
                        filepath: '/uploads/demo-facebook-branding.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_facebook_page_1',
                        userId: 10,
                        userName: 'Jennifer Williams',
                        rating: 5,
                        comment: 'Perfect for our business! Already has good engagement.',
                        date: new Date('2024-09-03')
                    }
                ]
            },
            {
                id: `facebook_${Date.now()}_3`,
                name: 'Facebook Premium Group - 500 Members',
                shortDescription: 'Premium Facebook group with active community',
                description: 'Established Facebook group with custom theme, 500 active members, and regular activity. Perfect for community building, marketing, or selling digital products with social proof.',
                seoTitle: 'Premium Facebook Group - 500 Active Members',
                metaDescription: 'Established Facebook group with 500 members and active community',
                itemCategory: 'Facebook',
                directionCategory: 'Social Media',
                subcategory: 'Premium Group',
                registrationMethod: 'Community Verification',
                profileFullness: 'Community',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'Admin Account',
                numberOfSubscribers: 500,
                price: 15.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 45,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 67,
                tags: ['facebook', 'group', 'community', 'premium', 'active'],
                seoKeywords: ['facebook group', 'premium facebook group', 'community group', 'active facebook group'],
                images: ['/uploads/demo-facebook-group.jpg'],
                files: [
                    {
                        filename: 'demo-facebook-group-management.pdf',
                        filepath: '/uploads/demo-facebook-group-management.pdf',
                        uploadedAt: new Date()
                    },
                    {
                        filename: 'demo-group-engagement.pdf',
                        filepath: '/uploads/demo-group-engagement.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_facebook_group_1',
                        userId: 11,
                        userName: 'Robert Taylor',
                        rating: 5,
                        comment: 'Excellent group! Active members and great engagement.',
                        date: new Date('2024-09-04')
                    }
                ]
            }
        ];

        // Clear existing demo products
        demoSeller.store.items = [];

        // Demo products for Twitter category
        const twitterProducts = [
            {
                id: `twitter_${Date.now()}_1`,
                name: 'Verified Twitter Account - 1K Followers',
                shortDescription: 'Blue check Twitter account with 1K real followers',
                description: 'Premium Twitter account with verified blue check, 1K targeted followers, and established posting history. Perfect for influencers and businesses.',
                seoTitle: 'Verified Twitter Account - 1K Followers Blue Check',
                metaDescription: 'Premium Twitter account with blue check verification and 1K followers',
                itemCategory: 'Twitter',
                directionCategory: 'Social Media',
                subcategory: 'Verified Account',
                registrationMethod: 'Premium Verification',
                profileFullness: 'Complete',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'App + Browser',
                numberOfSubscribers: 1000,
                price: 14.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 65,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 95,
                tags: ['twitter', 'verified', 'blue check', 'followers', 'social media'],
                seoKeywords: ['twitter account', 'verified twitter', 'blue check twitter', 'twitter followers'],
                images: ['/uploads/demo-twitter.jpg'],
                files: [
                    {
                        filename: 'demo-twitter-guide.pdf',
                        filepath: '/uploads/demo-twitter-guide.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_twitter_1',
                        userId: 12,
                        userName: 'Alex Johnson',
                        rating: 5,
                        comment: 'Great Twitter account with blue check!',
                        date: new Date('2024-09-05')
                    }
                ]
            }
        ];

        // Demo products for LinkedIn category
        const linkedinProducts = [
            {
                id: `linkedin_${Date.now()}_1`,
                name: 'Premium LinkedIn Account - 500 Connections',
                shortDescription: 'Professional LinkedIn account with premium features',
                description: 'Established LinkedIn account with 500 professional connections, premium badge, and complete profile. Perfect for business networking and professional branding.',
                seoTitle: 'Premium LinkedIn Account - 500 Professional Connections',
                metaDescription: 'Professional LinkedIn account with premium features and connections',
                itemCategory: 'LinkedIn',
                directionCategory: 'Professional Network',
                subcategory: 'Premium Account',
                registrationMethod: 'Business Verification',
                profileFullness: 'Professional',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'Browser',
                numberOfSubscribers: 500,
                price: 18.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 55,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 78,
                tags: ['linkedin', 'professional', 'premium', 'connections', 'business'],
                seoKeywords: ['linkedin account', 'professional linkedin', 'business linkedin', 'linkedin premium'],
                images: ['/uploads/demo-linkedin.jpg'],
                files: [
                    {
                        filename: 'demo-linkedin-guide.pdf',
                        filepath: '/uploads/demo-linkedin-guide.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_linkedin_1',
                        userId: 13,
                        userName: 'Sarah Business',
                        rating: 5,
                        comment: 'Perfect for professional networking!',
                        date: new Date('2024-09-06')
                    }
                ]
            }
        ];

        // Demo products for TikTok category
        const tiktokProducts = [
            {
                id: `tiktok_${Date.now()}_1`,
                name: 'TikTok Account - 2K Followers',
                shortDescription: 'Trending TikTok account with 2K engaged followers',
                description: 'Popular TikTok account with 2K engaged followers, trending videos, and established content niche. Ready for content creation and monetization.',
                seoTitle: 'Trending TikTok Account - 2K Engaged Followers',
                metaDescription: 'Popular TikTok account with 2K followers and trending content',
                itemCategory: 'TikTok',
                directionCategory: 'Social Media',
                subcategory: 'Content Creator',
                registrationMethod: 'Verified',
                profileFullness: 'Creator',
                yearOfRegistration: 2023,
                countryOfRegistration: 'USA',
                loginMethod: 'App',
                numberOfSubscribers: 2000,
                price: 16.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 70,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 110,
                tags: ['tiktok', 'trending', 'followers', 'content creator', 'viral'],
                seoKeywords: ['tiktok account', 'tiktok followers', 'viral tiktok', 'content creator tiktok'],
                images: ['/uploads/demo-tiktok.jpg'],
                files: [
                    {
                        filename: 'demo-tiktok-guide.pdf',
                        filepath: '/uploads/demo-tiktok-guide.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_tiktok_1',
                        userId: 14,
                        userName: 'Content Creator',
                        rating: 5,
                        comment: 'Amazing TikTok account! Already trending!',
                        date: new Date('2024-09-07')
                    }
                ]
            }
        ];

        // Demo products for YouTube category
        const youtubeProducts = [
            {
                id: `youtube_${Date.now()}_1`,
                name: 'YouTube Channel - 500 Subscribers',
                shortDescription: 'Established YouTube channel with monetization enabled',
                description: 'Ready-to-use YouTube channel with 500 subscribers, monetization enabled, and established content. Perfect for content creators and businesses.',
                seoTitle: 'Monetized YouTube Channel - 500 Subscribers',
                metaDescription: 'Established YouTube channel with monetization and subscribers',
                itemCategory: 'YouTube',
                directionCategory: 'Video Platform',
                subcategory: 'Monetized Channel',
                registrationMethod: 'Verified',
                profileFullness: 'Creator',
                yearOfRegistration: 2022,
                countryOfRegistration: 'USA',
                loginMethod: 'Browser',
                numberOfSubscribers: 500,
                price: 29.99,
                itemType: 'Digital',
                completionTime: 0,
                isDigital: true,
                stockQuantity: 35,
                status: 'active',
                moderationStatus: 'approved',
                createdAt: new Date(),
                soldCount: 65,
                tags: ['youtube', 'monetized', 'subscribers', 'content creator', 'video'],
                seoKeywords: ['youtube channel', 'monetized youtube', 'youtube subscribers', 'content creator'],
                images: ['/uploads/demo-youtube.jpg'],
                files: [
                    {
                        filename: 'demo-youtube-guide.pdf',
                        filepath: '/uploads/demo-youtube-guide.pdf',
                        uploadedAt: new Date()
                    }
                ],
                reviews: [
                    {
                        id: 'review_youtube_1',
                        userId: 15,
                        userName: 'Video Maker',
                        rating: 5,
                        comment: 'Great YouTube channel with monetization ready!',
                        date: new Date('2024-09-08')
                    }
                ]
            }
        ];

        // Add all demo products
        demoSeller.store.items.push(...gmailProducts);
        demoSeller.store.items.push(...instagramProducts);
        demoSeller.store.items.push(...facebookProducts);
        demoSeller.store.items.push(...twitterProducts);
        demoSeller.store.items.push(...linkedinProducts);
        demoSeller.store.items.push(...tiktokProducts);
        demoSeller.store.items.push(...youtubeProducts);

        await demoSeller.save();

        console.log('✅ Demo products created successfully!');
        console.log(`📦 Created ${gmailProducts.length} Gmail products`);
        console.log(`📦 Created ${instagramProducts.length} Instagram products`);
        console.log(`📦 Created ${facebookProducts.length} Facebook products`);
        console.log(`📦 Created ${twitterProducts.length} Twitter products`);
        console.log(`📦 Created ${linkedinProducts.length} LinkedIn products`);
        console.log(`📦 Created ${tiktokProducts.length} TikTok products`);
        console.log(`📦 Created ${youtubeProducts.length} YouTube products`);
        console.log('🔑 Demo Seller Login: demo@digitalmarket.com / demo123');
        console.log('👤 Categories available: GMail, Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating demo products:', error);
        process.exit(1);
    }
};

// Run the script
createDemoProducts();
