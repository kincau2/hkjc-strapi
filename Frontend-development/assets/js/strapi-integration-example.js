/**
 * Strapi 集成示例
 * 展示如何在现有页面中集成 Strapi API
 * 
 * 使用方法：
 * 1. 在 HTML 中引入 api-service.js
 * 2. 在页面底部添加此脚本或将其内容合并到现有脚本中
 */

$(document).ready(async function() {
    // 检测当前语言
    const locale = document.documentElement.lang === 'zh-Hant' ? 'tc' : 'en';
    
    // 检查是否已加载 apiService
    if (typeof apiService === 'undefined') {
        console.error('apiService is not loaded. Please include api-service.js first.');
        return;
    }

    try {
        // ============================================
        // 1. 加载轮播图数据
        // ============================================
        await loadBanners(locale);
        
        // ============================================
        // 2. 加载专家数据
        // ============================================
        await loadExperts(locale);
        
        // ============================================
        // 3. 加载文章数据（如果页面需要）
        // ============================================
        if (document.querySelector('#discover')) {
            await loadDiscoverArticles(locale);
        }
        
    } catch (error) {
        console.error('Failed to load data from Strapi:', error);
        // 可以在这里显示错误提示给用户
    }
});

/**
 * 加载并渲染轮播图
 */
async function loadBanners(locale) {
    try {
        const banners = await apiService.getBanners(locale);
        
        if (banners.length === 0) {
            console.warn('No banners found');
            return;
        }
        
        const swiperWrapper = document.querySelector('.home-banner-wrapper .swiper-wrapper');
        if (!swiperWrapper) {
            console.warn('Banner swiper wrapper not found');
            return;
        }
        
        // 生成轮播图 HTML
        swiperWrapper.innerHTML = banners.map(banner => `
            <div class="swiper-slide">
                <a href="${banner.linkUrl}" target="${banner.linkTarget}">
                    <div class="swiper-image d-flex align-items-center justify-content-center">
                        <img src="${banner.desktopImage}" class="desktop-image" alt="Banner">
                        <img src="${banner.mobileImage}" class="mobile-image" alt="Banner">
                    </div>
                </a>
            </div>
        `).join('');
        
        // 重新初始化 Swiper（如果已存在）
        if (window.hkjcSwipers && window.hkjcSwipers.banner) {
            window.hkjcSwipers.banner.update();
        }
        
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

/**
 * 加载并渲染专家数据
 */
async function loadExperts(locale) {
    try {
        // 加载前三名专家
        const topExperts = await apiService.getExperts(locale, { 
            topThree: true, 
            populate: true 
        });
        
        // 加载所有专家（用于"更多专家"区域）
        const allExperts = await apiService.getExperts(locale, { 
            topThree: false 
        });
        
        // 转换数据格式以匹配现有的 picksData 结构
        if (topExperts.length > 0) {
            window.picksData = topExperts.map(expert => ({
                name: expert.name,
                picks: expert.picks.map(pick => ({
                    race: pick.race,
                    type: pick.type,
                    meta: pick.meta,
                    list: pick.list,
                    betLink: pick.betLink
                }))
            }));
        }
        
        // 更新 specialistsData
        if (!window.specialistsData) {
            window.specialistsData = {};
        }
        
        [...topExperts, ...allExperts].forEach(expert => {
            window.specialistsData[expert.name] = {
                name: expert.name,
                quote: expert.quote,
                exploreLink: expert.profileLink
            };
        });
        
        // 如果页面需要动态渲染专家卡片，可以在这里调用渲染函数
        // renderExpertCards(topExperts);
        
    } catch (error) {
        console.error('Error loading experts:', error);
    }
}

/**
 * 加载 Discover 区域的文章
 */
async function loadDiscoverArticles(locale) {
    try {
        const articles = await apiService.getArticles(locale, {
            section: 'discover-highlight',
            sort: 'publishedAt:desc',
            limit: 10
        });
        
        // 转换为现有格式
        if (typeof window.postsData === 'undefined') {
            window.postsData = [];
        }
        
        // 合并或替换数据
        window.postsData = articles.map(article => ({
            id: article.id,
            title: article.title,
            excerpt: article.excerpt,
            thumbnail: article.thumbnail,
            videoLink: article.videoLink,
            urlLink: article.urlLink,
            category: article.category,
            views: article.views || 0,
            date: article.publishedAt
        }));
        
        // 如果 discover-highlight.js 已加载，触发重新渲染
        if (typeof renderPosts === 'function') {
            renderPosts();
        }
        
    } catch (error) {
        console.error('Error loading discover articles:', error);
    }
}

/**
 * 动态渲染专家卡片（可选）
 * 如果专家卡片需要从 API 动态生成，可以使用此函数
 */
function renderExpertCards(experts) {
    const swiperWrapper = document.querySelector('.specialists-swiper .swiper-wrapper');
    if (!swiperWrapper) return;
    
    const toneColorMap = {
        green: 'tone-green',
        blue: 'tone-blue',
        teal: 'tone-teal',
        purple: 'tone-purple',
        amber: 'tone-amber',
        gold: 'tone-gold',
        slate: 'tone-slate',
        pink: 'tone-pink'
    };
    
    swiperWrapper.innerHTML = experts.map(expert => {
        const toneClass = toneColorMap[expert.toneColor] || 'tone-green';
        
        return `
            <div class="swiper-slide overflow-hidden rounded-4">
                <div class="specialist-bg ${toneClass} z-0 rounded-4 position-absolute bottom-0 start-0"></div>
                <article class="specialist-card d-flex flex-row justify-content-end align-items-end w-100 h-100">
                    <div class="badge-rank z-1 position-absolute text-white d-flex flex-column justify-content-end gap-3">
                        <div class="rank-number">${expert.rank}</div>
                        <div class="specialist-wrapper">
                            <p class="specialist-name mb-1">${expert.name}</p>
                            ${expert.title ? `<p class="specialist-title mb-0">${expert.title}</p>` : ''}
                        </div>
                    </div>
                    <div class="portrait position-absolute">
                        <img src="${expert.avatar}" alt="${expert.name}" />
                    </div>
                    <div class="stats-box rounded-4 z-1">
                        <div class="row g-3 align-items-center p-0 m-0">
                            <div class="col-6 p-0 m-0">
                                <div class="metric d-flex flex-column">
                                    <span class="label">${locale === 'tc' ? '命中率' : 'Strike Rate'}</span>
                                    <span class="value">${expert.strikeRate}%</span>
                                </div>
                            </div>
                            <div class="col-6 p-0 m-0">
                                <div class="metric d-flex flex-column">
                                    <span class="label">${locale === 'tc' ? '分數' : 'Score'}</span>
                                    <span class="value">${expert.score}</span>
                                </div>
                            </div>
                            ${expert.videoLink ? `
                            <div class="col-12 p-0 m-0">
                                <div class="race-chip w-100">
                                    <a class="text-decoration-none d-flex align-items-center" href="#" 
                                       onclick="singleVideoPopup.open({ link: '${expert.videoLink}', title: '${expert.name} - ${locale === 'tc' ? '賽日分析影片' : 'Race Analysis Video'}' }); return false;">
                                        <img class="icon" src="../assets/images/movie-icon.png" alt="video">
                                        <span class="text">${locale === 'tc' ? '賽日分析影片' : 'Race Analysis Video'}</span>
                                    </a>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </article>
            </div>
        `;
    }).join('');
    
    // 重新初始化 Swiper
    if (window.hkjcSwipers && window.hkjcSwipers.specialists) {
        window.hkjcSwipers.specialists.update();
    }
}

/**
 * 错误处理辅助函数
 */
function handleApiError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    // 可以在这里显示用户友好的错误提示
    // 例如：显示一个 toast 通知或错误消息
    
    // 如果 API 失败，可以回退到使用默认数据
    // 这需要预先准备一些默认数据
}

