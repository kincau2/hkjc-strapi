/**
 * Strapi API Service
 * 统一管理所有 Strapi API 请求
 */

(function() {
    'use strict';
    const ImageBaseUrl = 'http://localhost:1337'; //'https://api.hkjc-event.org'//'http://47.83.120.101:1337';
    // 配置
    const STRAPI_BASE_URL = 'http://localhost:1337'; //'https://api.hkjc-event.org' //'http://47.83.120.101:1337' || 'http://localhost:1337';
    // const STRAPI_BASE_URL =  'http://localhost:1337' //'http://47.83.120.101:1337' || 'http://localhost:1337';
    const API_BASE = `${STRAPI_BASE_URL}/api`;

    // 检测当前语言环境
    function getCurrentLocale() {
        const path = window.location.pathname;
        if (path.indexOf('/tc/') !== -1 || path.indexOf('/zh-HK') !== -1) {
            return 'tc';
        }
        return 'en';
    }

    // 获取图片 URL
    function getImageUrl(image) {
        if (!image) return null;
        if (typeof image === 'string') {
            // 如果是相对路径，转换为绝对路径
            if (image.startsWith('../') || image.startsWith('./')) {
                return image;
            }
            if(image.includes(':1337')){
                // 需要将http://47.83.120.101:1337/uploads/img_specialists_A_c46b28f713.jpg改成 
                // ImageBaseUrl + /uploads/img_specialists_A_c46b28f713.jpg
                return image.replace('http://47.83.120.101:1337', ImageBaseUrl)
            }
            // 如果是完整 URL
            if (image.startsWith('http://') || image.startsWith('https://')) {
                return image;
            }
            // Strapi 返回的图片对象
            return `${ImageBaseUrl}${image}`;
        }
        // Strapi 图片对象格式
        if (image.url) {
            return `${ImageBaseUrl}${image.url}`;
        }
        if (image.data && image.data.attributes && image.data.attributes.url) {
            return `${ImageBaseUrl}${image.data.attributes.url}`;
        }
        return null;
    }
    function formatStrapiImageContent(rawContent) {
        if (!rawContent) return '';
      
        // 正则匹配Markdown图片语法：![图片名称](图片URL)
        const markdownImgRegex = /!\[(.*?)\]\((.*?)\)/g;
      
        // 替换Markdown语法为纯HTML img标签，保留原有div样式
        const pureHtmlContent = rawContent.replace(
          markdownImgRegex,
          (match, altText, imgUrl) => {
            // 生成符合规范的img标签，添加响应式样式
            return `<img src="${getImageUrl(imgUrl)}" alt="${altText || '图片'}" class="img-fluid">`;
          }
        );
        return pureHtmlContent;
      }

    // API 请求封装
    async function apiRequest(endpoint, params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            // 添加语言参数（只有 banner 使用 language 字段过滤）
            if (!params.locale) {
                params.locale = getCurrentLocale();
            }
            // 只有 banner 端点使用 language 字段过滤
            // if (endpoint.includes('/banners')) {
            //     if (!params.filters) {
            //         params.filters = {};
            //     }
            //     params.filters.language = params.locale;
            // }
            
            // 添加其他参数
            if (params.filters) {
                Object.keys(params.filters).forEach(key => {
                    queryParams.append(`filters[${key}][$eq]`, params.filters[key]);
                });
            }
            
            if (params.sort) {
                queryParams.append('sort', params.sort);
            }
            
            if (params.populate) {
                // 处理 populate 参数（支持字符串或对象格式）
                if (typeof params.populate === 'string') {
                    queryParams.append('populate', params.populate);
                } else if (typeof params.populate === 'object') {
                    // Strapi 5.x 对象格式：populate[field]=*
                    Object.keys(params.populate).forEach(key => {
                        if (params.populate[key]) {
                            queryParams.append(`populate[${key}]`, '*');
                        }
                    });
                }
            }
            
            if (params.pagination) {
                queryParams.append('pagination[page]', params.pagination.page || 1);
                queryParams.append('pagination[pageSize]', params.pagination.pageSize || 100);
            }

            const url = `${API_BASE}${endpoint}?${queryParams.toString()}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 处理 Strapi 5.x 响应格式
            if (data.data) {
                return Array.isArray(data.data) ? data.data : [data.data];
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Banner API
    const BannerAPI = {
        /**
         * 获取所有轮播图
         * @param {Object} options - 选项
         * @param {string} options.locale - 语言 (en/tc)
         * @param {boolean} options.activeOnly - 只获取激活的
         * @returns {Promise<Array>}
         */
        async getAll(options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                sort: 'order:asc',
                populate: '*'  // 使用 * 填充所有字段，包括 media 字段
            };
            let local = options.locale || getCurrentLocale();
            const data = await apiRequest('/banners', params);
            console.log('local', local)
            return data.map(item => {
                const attrs = item.attributes || item;
                attrs.desktopImage = local === 'tc' ? attrs.desktopImageTc : attrs.desktopImageEn;
                attrs.mobileImage = local === 'tc' ? attrs.mobileImageTc : attrs.mobileImageEn;
                attrs.linkUrl = local === 'tc' ? attrs.linkUrlTc : attrs.linkUrlEn;
                return {
                    id: item.id,
                    title: attrs.title,
                    desktopImage: getImageUrl(attrs.desktopImage),
                    mobileImage: getImageUrl(attrs.mobileImage),
                    linkUrl: attrs.linkUrl,
                    linkTarget: attrs.linkTarget || '_blank',
                    order: attrs.order,
                };
            });
        }
    };

    // Expert API
    const ExpertAPI = {
        /**
         * 获取所有专家
         * @param {Object} options - 选项
         * @param {string} options.locale - 语言
         * @param {boolean} options.topThreeOnly - 只获取前三名
         * @param {boolean} options.withPicks - 包含心水选择
         * @returns {Promise<Array>}
         */
        async getAll(options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                sort: 'rank:asc',
                populate:  '*'
            };
            
            // if (options.topThreeOnly) {
            //     params.filters = {
            //         'isTopThree': true
            //     };
            // }
            
            const data = await apiRequest('/experts', params);
            console.log('experts-data', data)
            return data.map(item => {
                const attrs = item.attributes || item;
                const locale = params.locale || getCurrentLocale();
                // console.log('profileLink', attrs);
                attrs.picks = attrs.picks || []
                attrs.picks = attrs.picks.map(e=>{
                    console.log('e----2', e)
                    return {
                        race: locale === 'tc' ? e.raceTc : e.raceEn,
                        meta: locale === 'tc' ? e.metaTc : e.metaEn,
                        list: locale === 'tc' ? e.listTc ? e.listTc.split(',').map(item => item.trim().replace(/'/g, '')) : [] : e.listEn ? e.listEn.split(',').map(item => item.trim().replace(/'/g, '')) : [],
                        betLink: e.betLink,
                        type: (locale === 'tc' ? e.typeTc : e.typeEn) || '',
                        // origin: e,
                    }
                })
                attrs.profileLink = locale === 'tc' ? (attrs.profileLinkTc || attrs.profileLinkEn || attrs.profileLink) : (attrs.profileLinkEn || attrs.profileLinkTc || attrs.profileLink);
                // console.log(' attrs.picks', attrs, attrs.picks)
                // attrs.picks = attrs['picks' + (locale === 'tc' ? 'Tc': 'En')] ? attrs['picks' + (locale === 'tc' ? 'Tc': 'En')].picks : [];
                return {
                    id: item.id,
                    name: locale === 'tc' ? (attrs.nameTc || attrs.name) : (attrs.nameEn || attrs.name),
                    // nameEn: attrs.nameEn || attrs.name,
                    // nameTc: attrs.nameTc || attrs.name,
                    avatar: getImageUrl(attrs.avatar),
                    rank: attrs.rank,
                    strikeRate: attrs.strikeRate,
                    score: attrs.score,
                    title: locale === 'tc' ? (attrs.titleTc || attrs.title) : (attrs.titleEn || attrs.title),
                    // titleEn: attrs.titleEn || attrs.title,
                    // titleTc: attrs.titleTc || attrs.title,
                    quote: locale === 'tc' ? (attrs.quoteTc || attrs.quote) : (attrs.quoteEn || attrs.quote),
                    // quoteEn: attrs.quoteEn || attrs.quote,
                    // quoteTc: attrs.quoteTc || attrs.quote,
                    videoLink: attrs.videoLink,
                    profileLink: attrs.profileLink,
                    toneColor: attrs.toneColor || 'green',
                    toneStyle: attrs.toneStyle || '',
                    isTopThree: attrs.isTopThree || false,
                    picks: attrs.picks || []
                    // picks: attrs.picks ? ( attrs.picks).map(pick => {
                    //     const pickAttrs = pick.attributes || pick;
                    //     return {
                    //         race: pickAttrs.race,
                    //         type: pickAttrs.type,
                    //         meta: pickAttrs.meta,
                    //         horses: pickAttrs.horses || [],
                    //         betLink: pickAttrs.betLink,
                    //         raceDate: pickAttrs.raceDate
                    //     };
                    // }) : []
                };
            });
        },

        /**
         * 获取单个专家
         * @param {number} id - 专家 ID
         * @param {Object} options - 选项
         * @returns {Promise<Object>}
         */
        async getById(id, options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                // populate: options.withPicks ? 'picks' : '*'
            };
            
            const data = await apiRequest(`/experts/${id}`, params);
            const item = Array.isArray(data) ? data[0] : data;
            const attrs = item.attributes || item;
            const locale = params.locale || getCurrentLocale();
            
            return {
                id: item.id,
                name: locale === 'tc' ? (attrs.nameTc || attrs.name) : (attrs.nameEn || attrs.name),
                nameEn: attrs.nameEn || attrs.name,
                nameTc: attrs.nameTc || attrs.name,
                avatar: getImageUrl(attrs.avatar),
                rank: attrs.rank,
                strikeRate: attrs.strikeRate,
                score: attrs.score,
                title: locale === 'tc' ? (attrs.titleTc || attrs.title) : (attrs.titleEn || attrs.title),
                quote: locale === 'tc' ? (attrs.quoteTc || attrs.quote) : (attrs.quoteEn || attrs.quote),
                videoLink: attrs.videoLink,
                profileLink: attrs.profileLink,
                toneColor: attrs.toneColor || 'green',
                isTopThree: attrs.isTopThree || false,
                picks: attrs.picks ? (attrs.picks.data || attrs.picks).map(pick => {
                    const pickAttrs = pick.attributes || pick;
                    return {
                        id: pick.id,
                        race: pickAttrs.race,
                        type: pickAttrs.type,
                        meta: pickAttrs.meta,
                        horses: pickAttrs.horses || [],
                        betLink: pickAttrs.betLink,
                        raceDate: pickAttrs.raceDate
                    };
                }) : []
            };
        }
    };

    // Expert Pick API
    const ExpertPickAPI = {
        /**
         * 获取专家心水
         * @param {Object} options - 选项
         * @param {number} options.expertId - 专家 ID
         * @param {string} options.locale - 语言
         * @returns {Promise<Array>}
         */
        async getByExpert(expertId, options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                filters: {
                    'expert': expertId
                },
                sort: 'raceDate:desc',
                populate: '*'
            };
            
            const data = await apiRequest('/expert-picks', params);
            const locale = params.locale || getCurrentLocale();
            return data.map(item => {
                const attrs = item.attributes || item;
                return {
                    id: item.id,
                    race: attrs.race,
                    type: locale === 'tc' ? attrs.typeTc : attrs.typeEn,
                    meta: attrs.meta,
                    horses: attrs.horses || [],
                    betLink: attrs.betLink,
                    raceDate: attrs.raceDate
                };
            });
        }
    };

    // Article API
    const ArticleAPI = {
        /**
         * 获取所有文章
         * @param {Object} options - 选项
         * @param {string} options.locale - 语言
         * @param {string} options.section - 板块 (discover-highlight, racecourse-experience, racing-academy)
         * @param {string} options.category - 分类 (videos, articles, events)
         * @param {string} options.contentType - 内容类型 (video, article, event)
         * @returns {Promise<Array>}
         */
        async getAll(options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                sort: 'publishedAt:desc',
                populate: '*'
            };
            let url = '/articles';
            if (options.section) {
                // params.filters = {
                //     ...params.filters,
                //     'section': options.section
                // };
                if(options.section === 'racing-academy'){
                    url = "/racing-academies";
                }else{
                    url = "/" +options.section + 's';
                }
                // url = "/" +options.section + 's'
            }
            
            if (options.category) {
                params.filters = {
                    ...params.filters,
                    'category': options.category
                };
            }
            
            // if (options.contentType) {
            //     params.filters = {
            //         ...params.filters,
            //         'contentType': options.contentType
            //     };
            // }
            
            if (options.isFeatured) {
                params.filters = {
                    ...params.filters,
                    'isFeatured': true
                };
            }
            
            if (options.showInRecommendation !== undefined) {
                params.filters = {
                    ...params.filters,
                    'showInRecommendation': options.showInRecommendation
                };
            }
            
            console.log('params', params, options)
            const data = await apiRequest(url, params);
            
            return data.map(item => {
                console.log('item-----articles', item);
                const attrs = item.attributes || item;
                const locale = params.locale || getCurrentLocale();
                attrs.thumbnail = locale === 'tc' ? (attrs.thumbnailTc || attrs.thumbnail) : (attrs.thumbnailEn || attrs.thumbnail);
                attrs.contentImg = locale === 'tc' ? (attrs.contentImgTc || attrs.contentImg) : (attrs.contentImgEn || attrs.contentImg);
                attrs.content = locale === 'tc' ? (attrs.contentTc || attrs.content) : (attrs.contentEn || attrs.content);
                attrs.tags = attrs.tags && attrs.tags.length > 0 ? attrs.tags.map(e=>{
                    return {
                        key: e.key,
                        value: e.value
                    }
                }) : [];
                attrs.title = locale === 'tc' ? (attrs.titleTc || attrs.titleEn || attrs.title) : (attrs.titleEn || attrs.titleTc || attrs.title);
                attrs.excerpt = locale === 'tc' ? (attrs.excerptTc || attrs.excerptEn || attrs.excerpt) : (attrs.excerptEn || attrs.excerptTc || attrs.excerpt);
                attrs.videoLink = locale === 'tc' ? (attrs.videoLinkTc || attrs.videoLinkEn || attrs.videoLink) : (attrs.videoLinkEn || attrs.videoLinkTc || attrs.videoLink);
                attrs.urlLink = locale === 'tc' ? (attrs.urlLinkTc || attrs.urlLinkEn || attrs.urlLink) : (attrs.urlLinkEn || attrs.urlLinkTc || attrs.urlLink);
                return {
                    id: item.id,
                    title: attrs.title,
                    titleEn: attrs.titleEn || attrs.title,
                    titleTc: attrs.titleTc || attrs.title,
                    excerpt: locale === 'tc' ? (attrs.excerptTc || attrs.excerpt) : (attrs.excerptEn || attrs.excerpt),
                    excerptEn: attrs.excerptEn || attrs.excerpt,
                    excerptTc: attrs.excerptTc || attrs.excerpt,
                    thumbnail: getImageUrl(attrs.thumbnail),
                    contentImg: getImageUrl(attrs.contentImg),
                    content: formatStrapiImageContent(attrs.content),
                    category: attrs.category,
                    contentType: attrs.contentType,
                    videoLink: attrs.videoLink,
                    urlLink: attrs.urlLink,
                    views: attrs.views || 0,
                    section: attrs.section,
                    level: attrs.level || 'beginner',
                    tags: attrs.tags.map(e=>{
                        // return locale === 'tc' ? e.key : e.value;
                        return e.key
                    }) || [],
                    date: attrs.publishedAt ? new Date(attrs.publishedAt).toISOString().split('T')[0] : null,
                    publishedAt: attrs.publishedAt,
                    showInRecommendation: attrs.showInRecommendation || false
                };
            });
        },

        /**
         * 获取单个文章
         * @param {number} id - 文章 ID
         * @param {Object} options - 选项
         * @returns {Promise<Object>}
         */
        async getById(id, options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                populate: '*'
            };
            
            const data = await apiRequest(`/articles/${id}`, params);
            const item = Array.isArray(data) ? data[0] : data;
            const attrs = item.attributes || item;
            const locale = params.locale || getCurrentLocale();
            
            return {
                id: item.id,
                title: locale === 'tc' ? (attrs.titleTc || attrs.title) : (attrs.titleEn || attrs.title),
                excerpt: locale === 'tc' ? (attrs.excerptTc || attrs.excerpt) : (attrs.excerptEn || attrs.excerpt),
                thumbnail: getImageUrl(attrs.thumbnail),
                category: attrs.category,
                contentType: attrs.contentType,
                videoLink: attrs.videoLink,
                urlLink: attrs.urlLink,
                views: attrs.views || 0,
                section: attrs.section,
                date: attrs.publishedAt ? new Date(attrs.publishedAt).toISOString().split('T')[0] : null
            };
        }
    };

    // Footer API
    const FooterAPI = {
        /**
         * 获取 Footer 配置
         * @param {Object} options - 选项
         * @param {string} options.locale - 语言 (en/tc)
         * @returns {Promise<Object>}
         */
        async getConfig(options = {}) {
            const params = {
                locale: options.locale || getCurrentLocale(),
                populate: '*'
            };
            
            const data = await apiRequest('/footer-config', params);
           
            // 处理 Strapi 响应格式（可能是数组或单个对象）
            const item = Array.isArray(data) ? data[0] : data;
            const attrs = item.attributes || item;
            const locale = params.locale || getCurrentLocale();
            console.log('data----footer-config',locale, attrs)
            // 根据语言返回对应的 HTML 内容
            const htmlContent = locale === 'tc' 
                ? (attrs.contentTc || attrs.contentTc || '') 
                : (attrs.contentEn || attrs.contentEn || '');
            
            return {
                id: item.id,
                htmlContent: htmlContent,
                htmlContentEn: attrs.contentEn || '',
                htmlContentTc: attrs.contentTc || '',
                locale: locale
            };
        }
    }
    // 导出 API 对象
    window.StrapiAPI = {
        Banner: BannerAPI,
        Expert: ExpertAPI,
        ExpertPick: ExpertPickAPI,
        Article: ArticleAPI,
        Footer: FooterAPI,
        // 工具函数
        getCurrentLocale: getCurrentLocale,
        getImageUrl: getImageUrl
    };

})();

