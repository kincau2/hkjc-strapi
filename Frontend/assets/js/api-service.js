/**
 * Strapi API Service
 * 统一管理所有 Strapi API 调用
 */

class StrapiApiService {
    constructor(config = {}) {
        // 从环境变量或配置中获取 Strapi URL
        this.baseUrl = config.baseUrl || 'https://strapi.hkjc-event.org';
        this.apiToken = config.apiToken || null;
        this.defaultLocale = config.defaultLocale || 'en';
    }

    /**
     * 通用 API 请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/api${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * 获取轮播图
     * @param {string} locale - 语言代码 (en/tc)
     * @param {object} filters - 额外过滤条件
     */
    async getBanners(locale = this.defaultLocale, filters = {}) {
        const queryParams = new URLSearchParams({
            // 'filters[language][$eq]': locale,
            // 'filters[isActive][$eq]': 'true',
            'sort': 'order:asc',
            ...filters
        });

        const data = await this.request(`/banners?${queryParams}`);
        return this.transformBanners(data.data || []);
    }

    /**
     * 获取专家列表
     * @param {string} locale - 语言代码
     * @param {object} options - 选项 { topThree: boolean, populate: boolean }
     */
    async getExperts(locale = this.defaultLocale, options = {}) {
        const { topThree = false, populate = false } = options;
        const queryParams = new URLSearchParams({
            'sort': 'rank:asc'
        });

        if (topThree) {
            queryParams.append('filters[isTopThree][$eq]', 'true');
        }

        // if (populate) {
        //     queryParams.append('populate', 'picks');
        // }

        const data = await this.request(`/experts?${queryParams}`);
        return this.transformExperts(data.data || [], locale);
    }

    /**
     * 获取专家的心水选择
     * @param {number} expertId - 专家 ID
     * @param {string} locale - 语言代码
     */
    async getExpertPicks(expertId, locale = this.defaultLocale) {
        const queryParams = new URLSearchParams({
            'filters[expert][id][$eq]': expertId.toString(),
            'sort': 'raceDate:desc'
        });

        const data = await this.request(`/expert-picks?${queryParams}`);
        return this.transformExpertPicks(data.data || []);
    }

    /**
     * 获取文章列表
     * @param {string} locale - 语言代码
     * @param {object} options - 选项 { section, category, sort, limit }
     */
    async getArticles(locale = this.defaultLocale, options = {}) {
        const {
            section = null,
            category = null,
            sort = 'publishedAt:desc',
            limit = null
        } = options;

        const queryParams = new URLSearchParams({
            'sort': sort
        });

        if (section) {
            queryParams.append('filters[section][$eq]', section);
        }

        if (category) {
            queryParams.append('filters[category][$eq]', category);
        }

        if (limit) {
            queryParams.append('pagination[limit]', limit.toString());
        }

        const data = await this.request(`/articles?${queryParams}`);
        return this.transformArticles(data.data || []);
    }

    /**
     * 获取单篇文章
     * @param {number|string} id - 文章 ID 或 slug
     * @param {string} locale - 语言代码
     */
    async getArticle(id, locale = this.defaultLocale) {
        const endpoint = typeof id === 'number' 
            ? `/articles/${id}`
            : `/articles?filters[slug][$eq]=${id}`;
        
        const data = await this.request(endpoint);
        const articles = data.data || [];
        return articles.length > 0 ? this.transformArticle(articles[0]) : null;
    }

    /**
     * 转换轮播图数据格式
     */
    transformBanners(banners) {
        return banners.map(banner => ({
            id: banner.id,
            desktopImage: this.getImageUrl(banner.attributes.desktopImage),
            mobileImage: this.getImageUrl(banner.attributes.mobileImage),
            linkUrl: banner.attributes.linkUrl,
            linkTarget: banner.attributes.linkTarget || '_blank',
            order: banner.attributes.order
        }));
    }

    /**
     * 转换专家数据格式
     */
    transformExperts(experts, locale) {
        return experts.map(expert => {
            const attrs = expert.attributes;
            const localeKey = locale === 'tc' ? 'Tc' : 'En';
            
            return {
                id: expert.id,
                name: attrs[`name${localeKey}`] || attrs.name,
                avatar: this.getImageUrl(attrs.avatar),
                rank: attrs.rank,
                strikeRate: attrs.strikeRate,
                score: attrs.score,
                title: attrs[`title${localeKey}`] || attrs.title,
                quote: attrs[`quote${localeKey}`] || attrs.quote,
                videoLink: attrs.videoLink,
                profileLink: attrs.profileLink,
                toneColor: attrs.toneColor,
                picks: attrs.picks?.data ? this.transformExpertPicks(attrs.picks.data) : []
            };
        });
    }

    /**
     * 转换专家心水数据格式
     */
    transformExpertPicks(picks) {
        return picks.map(pick => {
            const attrs = pick.attributes || pick;
            return {
                race: attrs.race,
                type: attrs.type,
                meta: attrs.meta,
                list: this.parseHorsesList(attrs.horses),
                betLink: attrs.betLink
            };
        });
    }

    /**
     * 解析马匹列表（从 JSON 转换为 HTML 字符串）
     */
    parseHorsesList(horses) {
        if (!horses || !Array.isArray(horses)) return [];
        
        return horses.map(horse => {
            let html = '';
            if (horse.badge) {
                const badgeClass = horse.badge === 'BANKER' || horse.badge === '膽' 
                    ? 'text-bg-primary' 
                    : '';
                html += `<span class="badge ${badgeClass} me-1">${horse.badge}</span>`;
            }
            html += `${horse.number}. ${horse.name}`;
            return html;
        });
    }

    /**
     * 转换文章数据格式
     */
    transformArticles(articles) {
        return articles.map(article => this.transformArticle(article));
    }

    /**
     * 转换单篇文章数据格式
     */
    transformArticle(article) {
        const attrs = article.attributes || article;
        const locale = attrs.locale || this.defaultLocale;
        const localeKey = locale === 'tc' ? 'Tc' : 'En';
        
        return {
            id: article.id,
            title: attrs[`title${localeKey}`] || attrs.title,
            slug: attrs.slug,
            excerpt: attrs[`excerpt${localeKey}`] || attrs.excerpt,
            thumbnail: this.getImageUrl(attrs.thumbnail),
            category: attrs.category,
            contentType: attrs.contentType,
            videoLink: attrs.videoLink,
            urlLink: attrs.urlLink,
            views: attrs.views || 0,
            tags: attrs.tags || [],
            level: attrs.level,
            section: attrs.section,
            publishedAt: attrs.publishedAt,
            isFeatured: attrs.isFeatured || false
        };
    }

    /**
     * 获取图片完整 URL
     */
    getImageUrl(image) {
        if (!image) return null;
        
        if (typeof image === 'string') return image;
        
        const data = image.data || image;
        if (!data) return null;
        
        const url = data.attributes?.url || data.url;
        if (!url) return null;
        
        // 如果是相对路径，拼接 baseUrl
        if (url.startsWith('/')) {
            return `${this.baseUrl}${url}`;
        }
        
        // 如果已经是完整 URL，直接返回
        if (url.startsWith('http')) {
            return url;
        }
        
        return `${this.baseUrl}${url}`;
    }
}

// 创建全局实例
// 在实际使用时，需要根据环境配置 baseUrl
const apiService = new StrapiApiService({
    baseUrl: window.STRAPI_URL || 'https://strapi.hkjc-event.org',
    defaultLocale: document.documentElement.lang === 'zh-Hant' ? 'tc' : 'en'
});

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrapiApiService;
} else {
    window.StrapiApiService = StrapiApiService;
    window.apiService = apiService;
}

