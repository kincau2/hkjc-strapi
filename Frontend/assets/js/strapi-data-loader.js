/**
 * Strapi Data Loader
 * 从 Strapi API 加载数据并渲染到页面
 */

(function () {
    'use strict';

    // 配置 Strapi API 地址
    window.STRAPI_BASE_URL = 'http://localhost:1337';
    // 全局数据存储
    window.strapiData = {
        banners: [],
        experts: [],
        expertPicks: [],
        articles: [],
        specialistsData: {},
        picksData: []
    };

    /**
     * 加载轮播图数据
     */
    async function loadBanners() {
        try {
            const banners = await window.StrapiAPI.Banner.getAll({
                locale: window.StrapiAPI.getCurrentLocale(),
                activeOnly: true
            });
            console.log('banners', banners);
            window.strapiData.banners = banners;
            renderBanners(banners);
        } catch (error) {
            console.error('Failed to load banners:', error);
        }
    }

    /**
     * 渲染轮播图
     */
    function renderBanners(banners) {
        const $wrapper = $('.home-banner-wrapper .swiper-wrapper');
        if (!$wrapper.length) return;

        $wrapper.empty();

        banners.forEach(banner => {
            const desktopImg = banner.desktopImage || '../assets/images/cover1_e.png';
            const mobileImg = banner.mobileImage || banner.desktopImage || '../assets/images/cover1_m_e.png';

            const slide = $(`
                <div class="swiper-slide">
                    <a href="${banner.linkUrl || '#'}" target="${banner.linkTarget || '_blank'}">
                        <div class="swiper-image d-flex align-items-center justify-content-center">
                            <img src="${desktopImg}" class="desktop-image" alt="${banner.title || 'Banner'}">
                            <img src="${mobileImg}" class="mobile-image" alt="${banner.title || 'Banner'}">
                        </div>
                    </a>
                </div>
            `);

            $wrapper.append(slide);
        });

        // 重新初始化 Swiper（延迟以确保 DOM 更新完成）
        setTimeout(() => {
            if (typeof Swiper !== 'undefined') {
                // 如果 Swiper 还未初始化，等待一下再初始化
                setTimeout(() => {
                    const bannerSwiper = new Swiper('.home-banner-wrapper', {
                        loop: true,
                        loopAdditionalSlides: 6,
                        speed: 600,
                        slidesPerView: 1.4,
                        centeredSlides: true,
                        spaceBetween: 16,
                        watchSlidesProgress: true,
                        autoplay: {
                            delay: 4000,
                            disableOnInteraction: false,
                        },
                        pagination: {
                            el: '.banner-pagination',
                            clickable: true,
                        },
                        on: {
                            progress(swiper) {
                                $(swiper.slides).each(function() {
                                    const slide = this;
                                    const slideProgress = slide.progress;
                                    const scale = 1 - Math.min(Math.abs(slideProgress) * 0.06, 0.12);
                                    const opacity = 1 - Math.min(Math.abs(slideProgress) * 0.35, 0.50);
                                    $(slide).css({
                                        'transform': `scale(${scale})`,
                                        'opacity': opacity
                                    });
                                });
                            },
                            setTransition(swiper, duration) {
                                $(swiper.slides).each(function() {
                                    $(this).css('transition', duration + 'ms');
                                });
                            }
                        }
                    });

                }, 100);
            }
        }, 100);
    }

    /**
     * 加载专家数据
     */
    async function loadExperts() {
        try {
            const experts = await window.StrapiAPI.Expert.getAll({
                locale: window.StrapiAPI.getCurrentLocale(),
                withPicks: true
            });
            console.log('experts', experts);
            window.strapiData.experts = experts;

            // 构建 specialistsData 对象（用于现有代码兼容）
            const specialistsData = {};
            experts.forEach(expert => {
                specialistsData[expert.name] = {
                    name: expert.name,
                    quote: expert.quote,
                    exploreLink: expert.profileLink || '#'
                };
            });
            window.strapiData.specialistsData = specialistsData;
            window.specialistsData = specialistsData; // 兼容现有代码
            console.log('window.StrapiAPI.getCurrentLocale()', window.StrapiAPI.getCurrentLocale())
            // 构建 picksData 数组（用于现有代码兼容）
            const picksData = experts
                .filter(expert => expert.picks && expert.picks.length > 0)
                .map(expert => ({
                    name: expert.name,
                    picks: expert.picks,
                }));
            window.strapiData.picksData = picksData;
            window.picksData = picksData; // 兼容现有代码

            renderExperts(experts);
            renderMoreSpecialists(experts);
        } catch (error) {
            console.error('Failed to load experts:', error);
        }
    }

    /**
     * 渲染专家卡片
     */
    function renderExperts(experts) {
        const $wrapper = $('.specialists-swiper .swiper-wrapper');
        if (!$wrapper.length) return;
        let filterList = []
        // 只渲染前三名
        let topThree = experts
            .filter(expert => expert.rank && expert.rank <= 3)
            .sort((a, b) => (a.rank || 999) - (b.rank || 999))
            .slice(0, 3);
        topThree.forEach(expert => {
            if (expert.rank === 1) {
                filterList[0] = expert;
            }
            if (expert.rank === 3) {
                filterList[1] = expert;
            }
            if (expert.rank === 2) {
                filterList[2] = expert;
            }
        });
        console.log('topThree', filterList);
        $wrapper.empty();
        let list2 = filterList.concat(filterList).concat(filterList).concat(filterList);
        console.log('topThree', list2);
        let locale = window.StrapiAPI.getCurrentLocale();
        list2.forEach(expert => {
            const avatar = expert.avatar || '../assets/images/KOL Image-2.png';
            const toneColor = expert.toneColor || 'green';
            const slide = $(`
                <div class="swiper-slide overflow-hidden rounded-4">
                    <div style="${expert.toneStyle}" class="specialist-bg tone-${toneColor} z-0 rounded-4 position-absolute bottom-0 start-0"></div>
                    <article class="specialist-card d-flex flex-row justify-content-end align-items-end w-100 h-100">
                        <div class="badge-rank z-1 position-absolute text-white d-flex flex-column justify-content-end gap-3">
                            <div class="rank-number">${expert.rank || ''}</div>
                            <div class="specialist-wrapper">
                                <p class="specialist-name mb-1">${expert.name}</p>
                                ${locale === 'tc' ? `<p class="specialist-title mb-0">${expert.title}</p>` : ''}
                            </div>
                        </div>
                        <div class="portrait position-absolute">
                            <img src="${avatar}" alt="${expert.name}" />
                        </div>
                        <div class="stats-box rounded-4 z-1">
                            <div class="row g-3 align-items-center p-0 m-0">
                                <div class="col-6 p-0 m-0">
                                    <div class="metric d-flex flex-column">
                                        <span class="label">${locale === 'tc' ? "命中率" : "Strike Rate"}</span>
                                        <span class="value">${expert.strikeRate ? expert.strikeRate.toFixed(1) + '%' : 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="col-6 p-0 m-0">
                                    <div class="metric d-flex flex-column">
                                        <span class="label">${locale === 'tc' ? "分數" : "Score"}</span>
                                        <span class="value">${expert.score || 0}</span>
                                    </div>
                                </div>
                                ${locale === 'tc' ? ` <div class="col-12 p-0 m-0">
                                            <div class="race-chip w-100" data-link=${expert.videoLink} data-title=${expert.name}>
                                                <span class="text-decoration-none d-flex align-items-center"
                                                 >
                                                    <img class="icon" src="../assets/images/movie-icon.png" alt="video"> <span class="text">賽日分析影片</span>
                                                </span>
                                            </div>
                                      </div>` : ''}
                            </div>
                        </div>
                    </article>
                </div>
            `);
            $wrapper.append(slide);
        });
        $wrapper.on('click', '.race-chip', function () {
            let profileLink = $(this).data('link');
            let title = $(this).data('title');
            if (profileLink && title) {
                console.log('click', profileLink, title);
                // 使用獨立的 single-video-popup.js，不使用 slick，只有一個視頻
                var singleVideoPopup = new SingleVideoPopup({
                    containerId: 'singleVideoPopupContainer'
                });
                window.singleVideoPopup = singleVideoPopup; // 保存到全局以便其他函數訪問
                window.singleVideoPopup.open({ link: profileLink, title: title + ' - 賽日分析影片' });
            }
        });
        // onclick="window.singleVideoPopup.open({ link: ${expert.profileLink}, title: '${expert.name} - 賽日分析影片' }); return false;"
        // 重新初始化 Swiper（延迟以确保 DOM 更新完成）
        setTimeout(() => {
            console.log('typeof Swiper----', typeof Swiper);
            if (typeof Swiper !== 'undefined') {
                // 如果 Swiper 还未初始化，等待一下再初始化
                setTimeout(() => {
                    
                    const specialistsSwiper = new Swiper('.specialists-swiper', {
                        slidesPerView: window.innerWidth <= 768 ? 1.2 : 3,
                        spaceBetween: window.innerWidth <= 768 ? 10 : 20,
                        loop: true,
                        speed: 600,
                        allowTouchMove: window.innerWidth <= 768 ? true : false,
                        watchSlidesProgress: true,
                        centeredSlides: true,
                    });
                    console.log('typeof Swiper----2', $wrapper);
                    let picksSwiper = null;

                    function renderPicks(idx) {
                        console.log('picksData-----renderPicks---1', idx);
                        // Expect picksData to be defined in the HTML file
                        if (typeof picksData === 'undefined') {
                            console.warn('picksData not defined');
                            return;
                        }
                        console.log('picksData-----picksData', picksData);
                        let pIndex = 0
                        // 第一
                        if([0,3,6,9].includes(idx)){
                            pIndex = 0
                        }
                            // 第三
                        if([1,4,7,10].includes(idx)){
                            pIndex = 2
                        }
                        if([2,5,8,11].includes(idx)){
                            pIndex = 1
                        }
                        console.log('pindex',pIndex, picksData)
                        // 第二
                        // if([2,5,8,11].includes(idx))
                        // const spec = picksData[idx % picksData.length];
                        const spec = picksData[pIndex];
                        const slidesHtml = spec.picks.map(p => `
                            <div class="swiper-slide">
                                <div class="pick-card">
                                    <h6 class="race-number">${p.race}</h6>
                                    <div class="meta">${p.meta}</div>
                                    <hr/>
                                    <div class="type mb-2">${p.type}</div>
                                    <div class="d-flex flex-row justify-content-between flex-nowrap align-items-end w-100">
                                        <div class="list">
                                            ${p.list.map(i => `<p>${i}</p>`).join('')}
                                        </div>
                                        <div class="">
                                            <button class="cta" type="button" onclick="window.location.href='${p.betLink}'">${locale === 'tc' ? "立即投注" : "Bet Now"}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                        $('#picksWrapper').html(slidesHtml);

                        // (Re)initialize picks swiper for fresh content
                        if (picksSwiper) {
                            picksSwiper.destroy(true, true);
                            picksSwiper = null;
                        }

                        var spaceBetween = window.innerWidth <= 768 ? 16 : 32;

                        picksSwiper = new Swiper('.picks-swiper', {
                            slidesPerView: 'auto',
                            spaceBetween: spaceBetween,
                            watchSlidesProgress: true
                        });
                    }

                    // Initial render - use realIndex which is correct even in loop mode
                    renderPicks(specialistsSwiper.realIndex);
                    $('.specialists-swiper').on('click', '.swiper-slide', function() {
                        if ($(this).hasClass('swiper-slide-prev')) {
                            specialistsSwiper.slidePrev();
                        } else if ($(this).hasClass('swiper-slide-next')) {
                            specialistsSwiper.slideNext();
                        }
                    });
                
                    // Update picks on slide change
                    specialistsSwiper.on('slideChange', function() {
                        renderPicks(specialistsSwiper.realIndex);
                        specialistsSwiper.updateSlides();
                        specialistsSwiper.updateProgress();
                        specialistsSwiper.updateSlidesClasses();
                        specialistsSwiper.update();
                    });
                }, 100);
            }
        }, 100);
    }

    /**
     * 渲染更多专家（非 top3）到 moreSpecialists 轮播
     */
    function renderMoreSpecialists(experts) {
        const $wrapper = $('.more-specialists-swiper .swiper-wrapper');
        if (!$wrapper.length) return;

        // 过滤出非 top3 的专家（rank > 3 或 isTopThree === false）
        const moreExperts = experts
            .filter(expert => {
                // 排除 top3：rank <= 3 且 isTopThree === true
                const isTopThree = expert.isTopThree === true || (expert.rank && expert.rank <= 3);
                return !isTopThree;
            })
            .sort((a, b) => (a.rank || 999) - (b.rank || 999));

        if (moreExperts.length === 0) {
            console.warn('No more specialists found (non-top3 experts)');
            return;
        }

        $wrapper.empty();
        const locale = window.StrapiAPI.getCurrentLocale();
        let expertsData = moreExperts.concat(moreExperts).concat(moreExperts).concat(moreExperts);
        expertsData.forEach(expert => {
            const avatar = expert.avatar || '../assets/images/KOL Image-2.png';
            const toneColor = expert.toneColor || 'green';
            const profileLink = expert.profileLink || '#';
            const slide = $(`
                <div class="swiper-slide">
                    <a href="${profileLink}">
                        <article class="mspec-card">
                            <div class="mspec-bg tone-${toneColor}"></div>
                            <div class="mspec-text">
                                <div class="mspec-name">${expert.name}</div>
                                ${locale === 'tc' && expert.title ? `<div class="mspec-title">${expert.title}</div>` : ''}
                            </div>
                            <div class="mspec-avatar">
                                <img src="${avatar}" alt="${expert.name}">
                            </div>
                        </article>
                    </a>
                </div>
            `);
            $wrapper.append(slide);
        });

        // 如果 moreSpecialists swiper 已经初始化，需要更新它
        if (window.moreSpecialists && typeof window.moreSpecialists.update === 'function') {
            setTimeout(() => {
                console.log('update moreSpecialists', window.specialistsData, typeof window.moreSpecialists.update);
                window.moreSpecialists.update();
            }, 100);
        }
    }

    /**
     * 渲染首页动画卡片（animation-cards-layer）
     */
    function renderAnimationCards() {
        const $cardsLayer = $('.animation-cards-layer');
        if (!$cardsLayer.length) return;

        // 获取已加载的特色文章（isFeatured）
        const featuredArticles = window.strapiData.indexData || [];

        if (featuredArticles.length === 0) {
            console.warn('No featured articles found for animation cards');
            return;
        }

        // 构建 videoList 用于 videoPop
        const videoList = featuredArticles
            .filter(article => article.videoLink) // 只包含有视频的文章
            .map(article => ({
                link: article.videoLink,
                thumbnail: article.thumbnail || '../assets/images/edu_area_video1.jpg',
                title: article.title,
                description: article.excerpt || ''
            }));

        // 更新 videoPop.videoList（如果 videoPop 已初始化）
        if (typeof window.videoPop !== 'undefined' && window.videoPop) {
            window.videoPop.videoList = videoList;
        } else {
            // 如果 videoPop 还未初始化，等待一下再设置
            setTimeout(() => {
                if (typeof window.videoPop !== 'undefined' && window.videoPop) {
                    window.videoPop.videoList = videoList;
                }
            }, 500);
        }

        // 清空现有卡片
        $cardsLayer.empty();

        const locale = window.StrapiAPI.getCurrentLocale();

        // 渲染卡片（只渲染有视频的文章）
        featuredArticles
            .filter(article => article.videoLink) // 只渲染有视频的文章
            .forEach((article, index) => {
                const thumbnail = article.thumbnail || '../assets/images/edu_area_video1.jpg';
                const tags = article.tags || [];

                // 构建标签 HTML
                const tagsHtml = tags.length > 0
                    ? `<div class="video-tag-wrapper">
                        ${tags.map(tag => `<span class="video-tag">${tag}</span>`).join('')}
                       </div>`
                    : '';

                const card = $(`
                    <figure class="media-card" onclick="openPopup(${index})">
                        <img src="${thumbnail}" class="video-thumbnail" alt="${article.title}">
                        <img src="../assets/images/video-play-icon.png" class="play-icon" alt="Play Icon">
                        <div class="img-overlay"></div>
                        <div class="info-box">
                            ${tagsHtml}
                            <p class="video-title">${article.title}</p>
                        </div>
                    </figure>
                `);
                $cardsLayer.append(card);
            });

        // 如果动画已经初始化，需要重新初始化以更新卡片
        // Global references for discover animation functions
        window.discoverAnimationFunctions = {
            setStartState: null,
            buildTimeline: null
        };

        // Global flag to check if animation section is hidden
        window.isAnimationHidden = false;

        $(function () {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            if (!window.gsap || !window.ScrollTrigger) return;
            gsap.registerPlugin(ScrollTrigger);

            const animationSticky = document.querySelector('#animation');
            if (!animationSticky) return;

            // Check if animation section is hidden (e.g., d-none class)
            window.isAnimationHidden = animationSticky.classList.contains('d-none') ||
                window.getComputedStyle(animationSticky).display === 'none';

            if (window.isAnimationHidden) {
                return;
            }

            const cards = gsap.utils.toArray('#animation .media-card');

            // Mobile swipe state
            let currentCardIndex = 0;
            let swipeEnabled = false;
            let touchStartX = 0;
            let touchEndX = 0;
            let isDragging = false;
            let initialCardPositions = [];
            let dragOffset = 0;

            function layoutRow() {
                const n = cards.length;
                const cw = cards[0].offsetWidth;
                const ch = cards[0].offsetHeight;
                const marginLeft = 24;
                const offSetWidthLeft = (cw * Math.cos(7 * Math.PI / 180) + ch * Math.sin(7 * Math.PI / 180) - cw) / 2;
                const isMobile = window.innerWidth <= 768;

                if (isMobile) {
                    const leftEdgeMargin = offSetWidthLeft + marginLeft;
                    const startOffset = -window.innerWidth / 2 + cw / 2 + leftEdgeMargin;
                    let step = cw * 0.70;

                    cards.forEach((el, i) => {
                        const offsetX = startOffset + i * step;
                        el.dataset.offsetX = String(offsetX);
                        el.dataset.baseOffsetX = String(offsetX);
                        el.style.zIndex = String(100 - i);
                    });
                } else {
                    const viewportWidth = window.innerWidth;
                    const margin = 40;
                    const availableWidth = viewportWidth - margin * 2;

                    let step = cw * 0.70;
                    let total = cw + (n - 1) * step;

                    if (total > availableWidth) {
                        step = (availableWidth - cw) / (n - 1);
                        total = cw + (n - 1) * step;
                    }

                    const centerOffset = -total / 2 + cw / 2;

                    cards.forEach((el, i) => {
                        const offsetX = centerOffset + i * step;
                        el.dataset.offsetX = String(offsetX);
                        el.style.zIndex = String(100 + i);
                    });
                }
            }

            function setCardAnimationStartState() {
                gsap.set('#animation .animation-text-wrapper .animation-text', {
                    yPercent: 15,
                    opacity: 1
                });

                gsap.set('#animation .animation-text-wrapper .animation-text.top', {
                    yPercent: 0,
                    xPercent: -30
                });

                gsap.set('#animation .animation-text-wrapper .animation-text.center', {
                    yPercent: 0,
                    xPercent: 20
                });

                gsap.set('#animation .animation-text-wrapper .animation-text.bottom', {
                    yPercent: 0,
                    xPercent: -20
                });

                gsap.set('#animation .animation-image-wrapper img', {
                    xPercent: -50,
                    yPercent: -50,
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0.9
                });

                gsap.set('#animation .animation-image-wrapper p', {
                    xPercent: -50,
                    yPercent: -50,
                    x: 0,
                    y: 0,
                    opacity: 0,
                    scale: 0.9
                });

                cards.forEach((el, i) => {
                    gsap.set(el, {
                        xPercent: -50,
                        yPercent: -50,
                        x: 0,
                        y: '70vh',
                        scale: 0.94,
                        opacity: 0,
                    });
                });

                gsap.set('#animation .animation-button-wrapper button', {
                    opacity: 0,
                });
            }

            function buildCardAnimationTimeline() {
                ScrollTrigger.getById('animation-timeline')?.kill();
                ScrollTrigger.getById('animation-pin')?.kill();

                gsap.set(animationSticky, { clearProps: 'all' });
                const sectionEl = document.querySelector('#animation');

                const header = document.querySelector('.site-header');
                const headerH = header ? header.offsetHeight : 0;
                const vh = window.innerHeight;
                const stageHeight = vh - headerH;

                const tl = gsap.timeline({
                    scrollTrigger: {
                        id: 'animation-timeline',
                        trigger: sectionEl,
                        start: 'top bottom',
                        end: '+=2500',
                        scrub: 1,
                        markers: false,
                        invalidateOnRefresh: true,
                        onRefresh: () => {
                            layoutRow();
                        },
                        onLeave: () => {
                            tl.scrollTrigger.disable(false);
                        }
                    }
                });

                const pin = gsap.timeline({
                    scrollTrigger: {
                        id: 'animation-pin',
                        trigger: sectionEl,
                        start: () => {
                            const header = document.querySelector('.site-header');
                            const headerH = header ? header.offsetHeight : 0;
                            return `top +=${headerH}px`;
                        },
                        end: () => {
                            return `+=${2500 - stageHeight}`;
                        },
                        scrub: 1,
                        pin: animationSticky,
                        markers: false,
                        invalidateOnRefresh: true,
                        onToggle: (self) => {
                            if (self.isActive) {
                                $('.animation-stage').css('position', 'relative');
                            } else {
                                $('.animation-stage').css('position', '');
                            }
                        },
                        onLeave: () => {
                            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                            const pinSpacer = document.querySelector('.pin-spacer-animation-pin');
                            const animSection = document.querySelector('#animation');

                            if (pinSpacer && animSection) {
                                tl.progress(1);

                                const oldHeight = pinSpacer.offsetHeight;
                                pin.scrollTrigger.disable(false);

                                const naturalHeight = animSection.offsetHeight;
                                const heightDiff = oldHeight - naturalHeight;

                                pinSpacer.style.height = naturalHeight + 'px';
                                pinSpacer.style.padding = '0px';

                                const newScroll = currentScroll - heightDiff;
                                window.scrollTo(0, Math.max(0, newScroll));

                                if (window.innerWidth <= 768) {
                                    fightCardMomentumScroll();
                                } else {
                                    ScrollTrigger.getById('discover-pin')?.kill();
                                    window.discoverAnimationFunctions.setStartState();
                                    window.discoverAnimationFunctions.buildTimeline();
                                }

                                gsap.set(animationSticky, { clearProps: 'transform' });
                            }
                        }
                    }
                });

                pin.add('text');
                tl.add('text');

                tl.to('#animation .animation-text-wrapper .animation-text.top', {
                    xPercent: 30,
                    ease: 'none',
                    opacity: 0,
                    duration: 1.5
                }, 'text');

                tl.to('#animation .animation-text-wrapper .animation-text.center', {
                    xPercent: -20,
                    ease: 'none',
                    opacity: 0,
                    duration: 1.7
                }, 'text+=0.08');

                tl.to('#animation .animation-text-wrapper .animation-text.bottom', {
                    xPercent: 1,
                    ease: 'none',
                    opacity: 0,
                    duration: 2.1
                }, 'text+=0.16');

                tl.to(cards, {
                    x: (i, el) => parseFloat(el.dataset.offsetX || '0'),
                    y: 0,
                    rotation: (i) => (i % 2 ? 7 : -7),
                    scale: 1,
                    opacity: 1,
                    ease: 'power1.out',
                    duration: 0.6,
                    stagger: 0.18
                }, 'text+=1.05');

                tl.to('#animation .animation-image-wrapper img', {
                    opacity: 1,
                    scale: 1,
                    ease: 'power2.out',
                    duration: 0.6
                }, 'text+=1.75');

                tl.to('#animation .animation-image-wrapper p', {
                    opacity: 1,
                    scale: 1,
                    ease: 'power2.out',
                    duration: 0.6
                }, 'text+=1.75');

                tl.to('#animation .animation-button-wrapper button', {
                    ease: 'power2.out',
                    opacity: 1,
                    duration: 0.3
                }, 'text+=2');

                tl.to('#animation .animation-button-wrapper button', {}, 'text+=2.5');

                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    tl.call(() => {
                        swipeEnabled = true;
                    }, null, 'text+=2.5');
                }
            }

            function fightCardMomentumScroll() {
                let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                let momentumTimeout = null;
                let isLocked = true;
                let touchEndReceived = false;

                const initialTouchCheck = setTimeout(() => {
                    if (!touchEndReceived) {
                        // Enable timeout-based release for momentum
                    }
                }, 50);

                const scrollLockHandler = () => {
                    window.scrollTo(0, lastScrollTop);
                    $('.animation-stage').css('position', 'fixed');
                    $('.animation-stage').css('bottom', '0');
                    $('.animation-stage').css('z-index', '9');

                    if (!touchEndReceived) {
                        clearTimeout(momentumTimeout);
                        momentumTimeout = setTimeout(() => {
                            if (isLocked) {
                                releaseLock();
                            }
                        }, 150);
                    }
                };

                const releaseLock = () => {
                    if (!isLocked) return;
                    isLocked = false;

                    clearTimeout(initialTouchCheck);
                    clearTimeout(momentumTimeout);
                    window.removeEventListener('scroll', scrollLockHandler);
                    document.removeEventListener('touchend', onTouchEnd);
                    document.removeEventListener('touchcancel', onTouchEnd);

                    $('.animation-stage').css('position', '');
                    $('.animation-stage').css('bottom', '');
                    $('.animation-stage').css('z-index', '');

                    ScrollTrigger.getById('discover-pin')?.kill();
                    window.discoverAnimationFunctions.setStartState();
                    window.discoverAnimationFunctions.buildTimeline();
                };

                const onTouchEnd = () => {
                    touchEndReceived = true;
                    clearTimeout(initialTouchCheck);
                    releaseLock();
                };

                window.addEventListener('scroll', scrollLockHandler);
                document.addEventListener('touchend', onTouchEnd, { once: true });
                document.addEventListener('touchcancel', onTouchEnd, { once: true });
            }

            function handleDragMove(currentX) {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile || !swipeEnabled || !isDragging) return;

                dragOffset = currentX - touchStartX;

                cards.forEach((el, i) => {
                    const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
                    const cw = cards[0].offsetWidth;
                    const step = cw * 0.70;
                    const currentSwipeOffset = -currentCardIndex * step;
                    const newX = baseOffset + currentSwipeOffset + dragOffset;

                    gsap.set(el, { x: newX });
                });
            }

            function findNearestCard() {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile) return currentCardIndex;

                const cw = cards[0].offsetWidth;
                const step = cw * 0.70;
                const screenCenter = 0;

                const totalOffset = -currentCardIndex * step + dragOffset;
                const estimatedIndex = Math.round(-totalOffset / step);

                return Math.max(0, Math.min(cards.length - 1, estimatedIndex));
            }

            function handleSwipeEnd() {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile || !swipeEnabled) return;

                const nearestIndex = findNearestCard();
                currentCardIndex = nearestIndex;
                dragOffset = 0;

                updateCardPositions(true);
            }

            function updateCardPositions(animate = true) {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile) return;

                const cw = cards[0].offsetWidth;
                const step = cw * 0.70;
                const swipeOffset = -currentCardIndex * step;

                cards.forEach((el, i) => {
                    const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
                    const newX = baseOffset + swipeOffset;

                    if (animate) {
                        gsap.to(el, {
                            x: newX,
                            duration: 0.4,
                            ease: 'power2.out'
                        });
                    } else {
                        gsap.set(el, { x: newX });
                    }

                    const zIndex = i === currentCardIndex ? 200 : (100 - i);
                    el.style.zIndex = String(zIndex);
                });
            }

            function initSwipeListeners() {
                const cardsLayer = document.querySelector('#animation .animation-cards-layer');
                if (!cardsLayer) return;

                cardsLayer.addEventListener('touchstart', (e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (!isMobile || !swipeEnabled) return;

                    touchStartX = e.touches[0].clientX;
                    touchEndX = touchStartX;
                    isDragging = true;
                    dragOffset = 0;

                    cards.forEach((el, i) => {
                        const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
                        const cw = cards[0].offsetWidth;
                        const step = cw * 0.70;
                        const currentSwipeOffset = -currentCardIndex * step;
                        initialCardPositions[i] = baseOffset + currentSwipeOffset;
                    });
                }, { passive: true });

                cardsLayer.addEventListener('touchmove', (e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (!isMobile || !swipeEnabled || !isDragging) return;

                    touchEndX = e.touches[0].clientX;
                    handleDragMove(touchEndX);
                }, { passive: true });

                cardsLayer.addEventListener('touchend', (e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (!isMobile || !swipeEnabled || !isDragging) return;

                    isDragging = false;
                    handleSwipeEnd();
                }, { passive: true });

                cardsLayer.addEventListener('touchcancel', (e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (!isMobile || !swipeEnabled || !isDragging) return;

                    isDragging = false;
                    handleSwipeEnd();
                }, { passive: true });
            }

            layoutRow();
            setCardAnimationStartState();
            buildCardAnimationTimeline();
            initSwipeListeners();
        });

        // =============================================================================
        // DISCOVER ANIMATION SECTION (GSAP + ScrollTrigger)
        // =============================================================================

        $(function () {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            if (!window.gsap || !window.ScrollTrigger) return;
            gsap.registerPlugin(ScrollTrigger);
            ScrollTrigger.normalizeScroll(true);
            ScrollTrigger.config({ ignoreMobileResize: true });

            const discoverSticky = document.querySelector('#discover');
            if (!discoverSticky) return;
            const clipRect = document.querySelector('#discoverClipRect');
            const clipRectMobile = document.querySelector('#discoverClipRectMobile');
            if (!clipRect || !clipRectMobile) return;

            const DISCOVER_BASE_RATIO = 490 / 928;
            const DISCOVER_MOBILE_RATIO = 407 / 269;
            let discoverGeom = null;

            // Check if animation section is hidden - if so, initialize directly
            const shouldInitializeDirectly = window.isAnimationHidden || false;


            function calculateDiscoverGeometry() {
                const header = document.querySelector('.site-header');
                const headerH = header ? header.offsetHeight : 0;
                const sectionWidth = window.innerWidth;
                const sectionHeight = Math.max(0, window.innerHeight - headerH);
                const isMobile = window.innerWidth <= 768;

                let baseWidth, baseHeight, rx, ry;

                if (isMobile) {
                    const maxHeightFromViewport = sectionHeight * 0.82;
                    const maxHeightFromWidth = sectionWidth * DISCOVER_MOBILE_RATIO * 0.92;
                    baseHeight = Math.max(280, Math.min(928, maxHeightFromViewport * 0.9));
                    baseWidth = baseHeight / DISCOVER_MOBILE_RATIO;
                    rx = baseWidth / 2;
                    ry = baseWidth / 2;
                } else {
                    const maxWidthFromViewport = sectionWidth * 0.82;
                    const maxWidthFromHeight = sectionHeight / DISCOVER_BASE_RATIO * 0.92;
                    baseWidth = Math.max(280, Math.min(928, maxWidthFromViewport * 0.8));
                    baseHeight = baseWidth * DISCOVER_BASE_RATIO;
                    rx = baseHeight / 2;
                    ry = baseHeight / 2;
                }

                const initialX = (sectionWidth - baseWidth) / 2;
                const initialY = (sectionHeight - baseHeight) / 2;

                const overshootX = sectionWidth * 0.18;
                const overshootY = sectionHeight * 0.22;

                return {
                    sectionWidth,
                    sectionHeight,
                    baseWidth,
                    baseHeight,
                    initialRect: {
                        x: initialX,
                        y: initialY,
                        width: baseWidth,
                        height: baseHeight,
                        rx: rx,
                        ry: ry
                    },
                    finalRect: {
                        x: -overshootX,
                        y: -overshootY,
                        width: sectionWidth + overshootX * 2,
                        height: sectionHeight + overshootY * 2,
                        rx: 0,
                        ry: 0
                    }
                };
            }

            function applyDiscoverLayout(geom) {
                const background = discoverSticky.querySelector('.discover-background');
                const imgBackground = discoverSticky.querySelector('.discover-image-background');
                const isMobile = window.innerWidth <= 768;

                if (background) {
                    background.style.setProperty('--discover-shell-width', `${geom.baseWidth}px`);
                    background.style.setProperty('--discover-shell-height', `${geom.baseHeight}px`);
                    background.style.setProperty('--discover-shell-radius', `${Math.min(geom.baseWidth, geom.baseHeight) / 2}px`);

                    if (isMobile) {
                        background.style.clipPath = 'url(#discover-clip-mobile)';
                        background.style.webkitClipPath = 'url(#discover-clip-mobile)';
                        imgBackground.style.clipPath = 'url(#discover-clip-mobile)';
                        imgBackground.style.webkitClipPath = 'url(#discover-clip-mobile)';
                    } else {
                        background.style.clipPath = 'url(#discover-clip)';
                        background.style.webkitClipPath = 'url(#discover-clip)';
                        imgBackground.style.clipPath = 'url(#discover-clip)';
                        imgBackground.style.webkitClipPath = 'url(#discover-clip)';
                    }
                }

                const activeClipRect = isMobile ? clipRectMobile : clipRect;
                gsap.set(activeClipRect, {
                    attr: {
                        x: geom.initialRect.x,
                        y: geom.initialRect.y,
                        width: geom.initialRect.width,
                        height: geom.initialRect.height,
                        rx: geom.initialRect.rx,
                        ry: geom.initialRect.ry
                    }
                });
            }

            function refreshDiscoverGeometry() {
                discoverGeom = calculateDiscoverGeometry();
                applyDiscoverLayout(discoverGeom);
                return discoverGeom;
            }

            function setDiscoverStartState() {
                discoverGeom = refreshDiscoverGeometry();

                gsap.set('#discover .discover-background', {
                    xPercent: -50,
                    yPercent: -50,
                    scale: 1
                });

                gsap.set('#discover .discover-content .discover-dot', {
                    opacity: 0
                });

                gsap.set('#discover .discover-content .discover-text', {
                    opacity: 0,
                    x: 0,
                    xPercent: -50,
                    yPercent: -50,
                    maxWidth: discoverGeom.baseWidth - 80 + 'px',
                    scale: 1.1
                });

                const isMobile = window.innerWidth <= 768;
                var offsetDifferent;
                var iconHeight = document.querySelector('#discover .discover-content .discover-icon')?.offsetHeight || 0;

                if (isMobile) {
                    offsetDifferent = 20;
                } else {
                    offsetDifferent = (discoverGeom.baseHeight / 2 - iconHeight - 30) / 2;
                }

                var textHeight = document.querySelector('#discover .discover-content .discover-text')?.offsetHeight || 0;
                var textInitialY = 30 + offsetDifferent + textHeight / 2 - 6;

                gsap.set('#discover .discover-content .discover-text', {
                    y: textInitialY
                });

                gsap.set('#discover .discover-content .discover-icon', {
                    x: 0,
                    y: 0,
                    xPercent: -50,
                    yPercent: -50
                });

                gsap.set('#discover .discover-image-background img', {
                    scale: 1.04
                });

                gsap.set('#discover .discover-post', {
                    opacity: 0,
                    visibility: 'hidden'
                });

                if (isMobile) {
                    adjustMobileDiscoverSwiperWidth();
                } else {
                    adjustDesktopDiscoverSwiperWidth();
                }
            }

            function buildDiscoverTimeline() {
                const sectionEl = document.querySelector('#discover');
                var discoverGeom = refreshDiscoverGeometry();

                const tl = gsap.timeline({
                    scrollTrigger: {
                        id: 'discover-pin',
                        trigger: sectionEl,
                        start: () => {
                            const header = document.querySelector('.site-header');
                            const headerH = header ? header.offsetHeight : 0;
                            return `top +=${headerH}px`;
                        },
                        end: '+=400%',
                        scrub: 1,
                        pin: discoverSticky,
                        anticipatePin: 1,
                        markers: false,
                        invalidateOnRefresh: true,
                        onRefresh: refreshDiscoverGeometry,
                        onLeave: () => {
                            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                            const pinSpacer = document.querySelector('.pin-spacer-discover-pin');
                            const discoverSection = document.querySelector('#discover');

                            if (pinSpacer && discoverSection) {
                                tl.progress(1);

                                const oldHeight = pinSpacer.offsetHeight;
                                tl.scrollTrigger.disable(false);

                                const naturalHeight = discoverSection.offsetHeight;
                                const heightDiff = oldHeight - naturalHeight;

                                pinSpacer.style.height = naturalHeight + 'px';
                                pinSpacer.style.padding = '0px';

                                const newScroll = currentScroll - heightDiff;
                                window.scrollTo(0, Math.max(0, newScroll));

                                if (window.innerWidth <= 768) {
                                    fightDiscoverMomentumScroll();
                                }

                                gsap.set(discoverSticky, { clearProps: 'transform' });
                            }
                        }
                    }
                });

                tl.add('timeline');

                const isMobile = window.innerWidth <= 768;
                var offsetDifferent;
                var iconHeight = document.querySelector('#discover .discover-content .discover-icon')?.offsetHeight || 0;

                if (isMobile) {
                    offsetDifferent = 20;
                } else {
                    offsetDifferent = (discoverGeom.baseHeight / 2 - iconHeight - 30) / 2;
                }

                var iconFinalY = 30 + offsetDifferent + iconHeight / 2;

                tl.to('#discover .discover-content .discover-icon', {
                    y: -iconFinalY,
                    opacity: 1,
                    ease: 'power1.out',
                    duration: 1,
                }, 'timeline');

                tl.to('#discover .discover-content .discover-dot', {
                    opacity: 1,
                    ease: 'power4.in',
                    duration: 1.5,
                }, 'timeline+=0.5');

                tl.to('#discover .discover-content .discover-dot', {
                    height: '50px',
                    ease: 'power1.in',
                    duration: 1.5,
                }, 'timeline+=2');

                tl.to('#discover .discover-content .discover-dot', {
                    y: 0,
                    ease: 'power1.out',
                    duration: 1.5,
                }, 'timeline+=2');

                tl.to('#discover .discover-content .discover-text', {
                    opacity: 1,
                    scale: 1,
                    ease: 'power4.out',
                    duration: 2,
                }, 'timeline+=3.5');

                const activeClipRect = isMobile ? clipRectMobile : clipRect;

                tl.to(activeClipRect, {
                    attr: {
                        x: () => discoverGeom.finalRect.x,
                        y: () => discoverGeom.finalRect.y,
                        width: () => discoverGeom.finalRect.width,
                        height: () => discoverGeom.finalRect.height,
                        rx: () => discoverGeom.finalRect.rx,
                        ry: () => discoverGeom.finalRect.ry
                    },
                    ease: 'power2.inOut',
                    duration: 5,
                }, 'timeline+=5.5');

                tl.to('#discover .discover-content .discover-icon', {
                    opacity: 0,
                    ease: 'power1.out',
                    duration: 1,
                }, 'timeline+=8');

                tl.to('#discover .discover-content .discover-dot', {
                    opacity: 0,
                    ease: 'power1.out',
                    duration: 1,
                }, 'timeline+=8');

                tl.to('#discover .discover-content .discover-text', {
                    opacity: 0,
                    ease: 'power1.out',
                    duration: 1,
                }, 'timeline+=8');

                tl.to('#discover .discover-post', {
                    opacity: 1,
                    visibility: 'visible',
                    ease: 'power1.out',
                    duration: 1,
                }, 'timeline+=9');
            }

            function adjustMobileDiscoverSwiperWidth() {
                const isMobile = window.innerWidth <= 768;
                if (!isMobile) return;

                const discoverPost = document.querySelector('#discover .discover-post');
                if (!discoverPost) return;

                const postWrappers = discoverPost.querySelectorAll('.post-wrapper');

                postWrappers.forEach(wrapper => {
                    const swiper = wrapper.querySelector('.swiper');
                    const title = wrapper.querySelector('.section-title');

                    if (!swiper) return;

                    const discoverPostHeight = discoverPost.offsetHeight - 48 - 15;
                    const wrapperMaxHeight = discoverPostHeight * 0.5;

                    const titleHeight = title.offsetHeight;
                    const gap = 15;

                    const availableHeight = wrapperMaxHeight - titleHeight - gap;
                    const textWrapperHeight = wrapper.querySelector('.post-text-wrapper')?.offsetHeight || 60;
                    const featureImgHeight = availableHeight - textWrapperHeight;

                    const aspectRatio = 245 / 138;
                    var postWidth = featureImgHeight * aspectRatio;

                    if (postWidth > window.innerWidth - 15) {
                        postWidth = (window.innerWidth - 30) / 1.3;
                    }

                    const slides = swiper.querySelectorAll('.swiper-slide .post');
                    slides.forEach(slide => {
                        slide.style.width = `${postWidth}px`;
                    });
                });

                // (removed) enforce equal heights across cards
            }

            function adjustDesktopDiscoverSwiperWidth() {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) return;

                const discoverPost = document.querySelector('#discover .discover-post');
                if (!discoverPost) return;

                const postWrappers = discoverPost.querySelectorAll('.post-wrapper');

                postWrappers.forEach(wrapper => {
                    const swiper = wrapper.querySelector('.swiper');
                    const title = wrapper.querySelector('.section-title');

                    if (!swiper) return;

                    const discoverPostHeight = discoverPost.offsetHeight - 40 - 20;
                    const wrapperMaxHeight = discoverPostHeight * 0.5;

                    const titleHeight = title.offsetHeight;
                    const gap = 20;

                    const availableHeight = wrapperMaxHeight - titleHeight - gap;

                    const textWrapperHeight = wrapper.querySelector('.post-text-wrapper')?.offsetHeight || 60;

                    const featureImgHeight = availableHeight - textWrapperHeight;

                    const aspectRatio = 245 / 138;
                    const postWidth = featureImgHeight * aspectRatio;

                    const swiperWidth = (postWidth * 3) + (gap * 2);

                    if (swiperWidth > 900) return;

                    swiper.style.width = `${swiperWidth}px`;
                    swiper.style.maxWidth = '100%';

                    const slides = swiper.querySelectorAll('.swiper-slide .post');
                    slides.forEach(slide => {
                        slide.style.width = `${postWidth}px`;
                    });
                });
            }

            function fightDiscoverMomentumScroll() {
                let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                let momentumTimeout = null;
                let isLocked = true;
                let touchEndReceived = false;

                const initialTouchCheck = setTimeout(() => {
                    if (!touchEndReceived) {
                        // Enable timeout-based release for momentum
                    }
                }, 50);

                const scrollLockHandler = () => {
                    window.scrollTo(0, lastScrollTop);
                    $('.discover-stage').css('position', 'fixed');
                    $('.discover-stage').css('bottom', '0');
                    $('.discover-stage').css('z-index', '9');

                    if (!touchEndReceived) {
                        clearTimeout(momentumTimeout);
                        momentumTimeout = setTimeout(() => {
                            if (isLocked) {
                                releaseLock();
                            }
                        }, 150);
                    }
                };

                const releaseLock = () => {
                    if (!isLocked) return;
                    isLocked = false;

                    clearTimeout(initialTouchCheck);
                    clearTimeout(momentumTimeout);
                    window.removeEventListener('scroll', scrollLockHandler);
                    document.removeEventListener('touchend', onTouchEnd);
                    document.removeEventListener('touchcancel', onTouchEnd);

                    $('.discover-stage').css('position', '');
                    $('.discover-stage').css('bottom', '');
                    $('.discover-stage').css('z-index', '');
                };

                const onTouchEnd = () => {
                    touchEndReceived = true;
                    clearTimeout(initialTouchCheck);
                    releaseLock();
                };

                window.addEventListener('scroll', scrollLockHandler);
                document.addEventListener('touchend', onTouchEnd, { once: true });
                document.addEventListener('touchcancel', onTouchEnd, { once: true });
            }

            window.discoverAnimationFunctions.setStartState = setDiscoverStartState;
            window.discoverAnimationFunctions.buildTimeline = buildDiscoverTimeline;

            // If animation section is hidden, initialize discover animations directly
            if (shouldInitializeDirectly) {
                setDiscoverStartState();
                buildDiscoverTimeline();
            }

        });
    }

    /**
     * 渲染 Discover Posts Swiper（discover-posts-swiper-1）
     */
    function renderDiscoverPosts() {
        const $swiperWrapper = $('.discover-posts-swiper-1 .swiper-wrapper');
        if (!$swiperWrapper.length) return;

        // 获取已加载的 discover-highlight 文章
        // 需要从全局数据中获取，因为 loadArticles 可能被多次调用
        const articles = window.strapiData.discoverHighlightData || [];
        console.log('articles-----discover-highlight', articles);
        // const discoverArticles = articles.filter(article => article.section === 'discover-highlight');
        const discoverArticles = articles

        if (discoverArticles.length === 0) {
            console.warn('No discover-highlight articles found');
            return;
        }

        // 清空现有内容
        $swiperWrapper.empty();

        // 渲染文章卡片
        discoverArticles.forEach(article => {
            const thumbnail = article.thumbnail || '../assets/images/KOL_video_1.png';
            const title = article.title || '';
            const excerpt = article.excerpt || '';

            // 构建点击事件：如果有 videoLink，打开视频弹窗；否则跳转到 urlLink
            let onClickHandler = '';
            if (article.videoLink) {
                onClickHandler = `singleVideoPopup.open({ link: '${article.videoLink}', title: '${title.replace(/'/g, "\\'")}', description: '${excerpt.replace(/'/g, "\\'")}' }); return false;`;
            } else if (article.urlLink) {
                onClickHandler = `window.location.href='${article.urlLink}'; return false;`;
            } else {
                let post = {
                    id: article.id,
                    title: article.title,
                    excerpt: article.excerpt,
                    thumbnail: article.thumbnail,
                    videoLink: article.videoLink,
                    type: 'discover-highlight',
                    content: article.content,
                    contentImg: article.contentImg,
                    urlLink: article.urlLink,
                    category: article.category,
                    views: article.views || 0,
                    date: article.date || article.publishedAt
                }
                const fallbackLink = `post-detail.html?id=${post.id}&type=${post.type}`;
                localStorage.setItem('post-' + post.id, JSON.stringify(post));
                const targetLink = (post.category === 'videos' && post.videoLink)
                    ? fallbackLink
                    : (post.urlLink || post.articleLink || post.eventLink || fallbackLink);
                    onClickHandler = `window.location.href='${targetLink}'; return false;`;
            }
            console.log('onClickHandler-----onClickHandler', onClickHandler);
            const slide = $(`
                <div class="swiper-slide">
                    <div class="post">
                        <a class="post-link" href="#" onclick="${onClickHandler}">
                            <div class="feature-img">
                                <img src="${thumbnail}" alt="${title}">
                            </div>
                            <div class="post-text-wrapper">
                                <p class="post-title">${title}</p>
                                <p class="post-excerpt">${excerpt}</p>
                            </div>
                        </a>
                    </div>
                </div>
            `);
            $swiperWrapper.append(slide);
        });

        // 更新 Swiper 实例（如果已初始化）
        if (typeof window.initDiscoverSwipers === 'function') {
            // 如果 Swiper 还未初始化，等待一下再初始化
            setTimeout(() => {
                if (typeof window.initDiscoverSwipers === 'function') {
                    window.initDiscoverSwipers();
                }
            }, 200);
        }
    }

    /**
     * 渲染 Racecourse Experience Posts Swiper（discover-posts-swiper-2）
     */
    function renderRacecourseExperiencePosts() {
        const $swiperWrapper = $('.discover-posts-swiper-2 .swiper-wrapper');
        if (!$swiperWrapper.length) return;
        console.log('racecourseArticles-----racecourseArticles---start')
        // 获取已加载的 racecourse-experience 文章
        const articles = window.strapiData.racecourseExperienceData || [];
        const racecourseArticles = articles;
        console.log('racecourseArticles-----racecourseArticles---start')
        if (racecourseArticles.length === 0) {
            console.warn('No racecourse-experience articles found');
            return;
        }

        // 清空现有内容
        $swiperWrapper.empty();
        console.log('racecourseArticles-----racecourseArticles', racecourseArticles);
        // 渲染文章卡片
        racecourseArticles.forEach(article => {
            const thumbnail = article.thumbnail || '../assets/images/KOL_video_4.png';
            const title = article.title || '';
            const excerpt = article.excerpt || '';

            // 构建点击事件：如果有 videoLink，打开视频弹窗；否则跳转到 urlLink
            let onClickHandler = '';
            let href = '#';
            if (article.videoLink) {
                onClickHandler = `singleVideoPopup.open({ link: '${article.videoLink}', title: '${title.replace(/'/g, "\\'")}', description: '${excerpt.replace(/'/g, "\\'")}' }); return false;`;
            } else if (article.urlLink) {
                href = article.urlLink;
                onClickHandler = '';
            } else {
                let post = {
                        id: article.id,
                        title: article.title,
                        excerpt: article.excerpt,
                        thumbnail: article.thumbnail,
                        videoLink: article.videoLink,
                        type: 'racecourse-experience',
                        content: article.content,
                        contentImg: article.contentImg,
                        urlLink: article.urlLink,
                        category: article.category,
                        views: article.views || 0,
                        date: article.date || article.publishedAt
                }
                const fallbackLink = `post-detail.html?id=${post.id}&type=${post.type}`;
                localStorage.setItem('post-' + post.id, JSON.stringify(post));
                const targetLink = (post.category === 'videos' && post.videoLink)
                    ? fallbackLink
                    : (post.urlLink || post.articleLink || post.eventLink || fallbackLink);
                    onClickHandler = `window.location.href='${targetLink}'; return false;`;
            }
            console.log('racecourseArticles-----racecourseArticles-href', href);
            const slide = $(`
                <div class="swiper-slide">
                    <div class="post">
                        <a class="post-link" href="${href}" ${onClickHandler ? `onclick="${onClickHandler}"` : ''}>
                            <div class="feature-img">
                                <img src="${thumbnail}" alt="${title}">
                            </div>
                            <div class="post-text-wrapper">
                                <p class="post-title">${title}</p>
                                <p class="post-excerpt">${excerpt}</p>
                            </div>
                        </a>
                    </div>
                </div>
            `);
            $swiperWrapper.append(slide);
        });

        // 更新 Swiper 实例（如果已初始化）
        if (window.hkjcSwipers && window.hkjcSwipers.discoverPosts2) {
            setTimeout(() => {
                window.hkjcSwipers.discoverPosts2.update();
            }, 100);
        } else if (typeof window.initDiscoverSwipers === 'function') {
            // 如果 Swiper 还未初始化，等待一下再初始化
            setTimeout(() => {
                if (typeof window.initDiscoverSwipers === 'function') {
                    window.initDiscoverSwipers();
                }
            }, 200);
        }
    }

    /**
     * 更新 Racing Academy 页面的数据
     */
    function updateRacingAcademyPage(articles) {
        console.log('updateRacingAcademyPage-----articles', articles);
        // 转换为页面需要的格式
        const postsData = articles.map(article => ({
            id: article.id,
            title: article.title,
            excerpt: article.excerpt,
            thumbnail: article.thumbnail || '../assets/images/edu_area_video1.jpg',
            videoLink: article.videoLink,
            urlLink: article.urlLink,
            type: 'racing-academy',
            level: article.level || 'beginner',
            tags: Array.isArray(article.tags) ? article.tags : [],
            views: article.views || 0,
            date: article.date || article.publishedAt
        }));
        console.log('articles-----racing-academy', postsData);
        // 更新全局 postsData（racing-academy.js 会读取）
        window.RacingAcademyData = postsData;

        // 触发自定义事件，让页面 JS 监听并重新渲染
        $(document).trigger('postsDataUpdated');

        // 如果页面已经加载了 racing-academy.js，也尝试直接触发
        // racing-academy.js 中的 renderPosts 是局部函数，需要通过事件触发
        setTimeout(() => {
            $(document).trigger('postsDataUpdated');
        }, 100);
    }

    /**
     * 更新 Discover Highlight 页面的数据
     */
    function updateDiscoverHighlightPage(articles) {
        console.log('articles-----discover-highlight', articles);
        // 转换为页面需要的格式
        const postsData = articles.map(article => ({
            id: article.id,
            title: article.title,
            excerpt: article.excerpt,
            thumbnail: article.thumbnail,
            videoLink: article.videoLink,
            type: 'discover-highlight',
            content: article.content,
            contentImg: article.contentImg,
            urlLink: article.urlLink,
            category: article.category,
            views: article.views || 0,
            date: article.date || article.publishedAt
        }));
        console.log('postsData-----discover-highlight---1', postsData);
        // 更新全局 postsData（discover-highlight.js 会读取）
        window.postsData = postsData;

        // 触发自定义事件，让页面 JS 监听并重新渲染
        $(document).trigger('postsDataUpdated');

        // 延迟再次触发，确保页面 JS 已加载
        setTimeout(() => {
            $(document).trigger('postsDataUpdated');
        }, 200);
    }

    /**
     * 更新 Racecourse Experience 页面的数据
     */
    function updateRacecourseExperiencePage(articles) {
        console.log('articles-----racecourse-experience', articles);
        // 转换为页面需要的格式
        const postsData = articles.map(article => ({
            id: article.id,
            title: article.title,
            excerpt: article.excerpt,
            thumbnail: article.thumbnail,
            videoLink: article.videoLink,
            type: 'racecourse-experience',
            content: article.content,
            contentImg: article.contentImg,
            urlLink: article.urlLink,
            category: article.category,
            views: article.views || 0,
            date: article.date || article.publishedAt
        }));

        // 更新全局 postsData（discover-highlight.js 会读取，racecourse-experience 也使用同一个 JS）
        window.postsData = postsData;

        // 触发自定义事件，让页面 JS 监听并重新渲染
        $(document).trigger('postsDataUpdated');

        // 延迟再次触发，确保页面 JS 已加载
        setTimeout(() => {
            $(document).trigger('postsDataUpdated');
        }, 200);
    }

    /**
     * 加载文章数据（用于 discover-highlight 页面）
     */
    async function loadArticles(section = 'discover-highlight', page = '') {
        try {
            let opt = {
                locale: window.StrapiAPI.getCurrentLocale(),
                section,
            }
            if (section === 'isFeatured') {
                opt.isFeatured = true;
                if (page === 'index') {
                    opt.section = 'racing-academy';
                }
                if (page === 'discover-highlight') {
                    opt.section = 'discover-highlight';
                }
                if (page === 'racecourse-experience') {
                    opt.section = 'racecourse-experience';
                }
            }
            console.log('opt-----opt', opt);
            const articles = await window.StrapiAPI.Article.getAll(opt);

            window.strapiData.articles = articles;

            // 转换为 postsData 格式（用于现有代码兼容）
            const postsData = articles.map(article => ({
                id: article.id,
                title: article.title,
                excerpt: article.excerpt,
                thumbnail: article.thumbnail || '../assets/images/edu_area_video1.jpg',
                videoLink: article.videoLink,
                urlLink: article.urlLink,
                category: article.category,
                tags: article.tags || [],
                views: article.views || 0,
                date: article.date || article.publishedAt
            }));
            if (section === 'isFeatured') {
                if (page === 'index') {
                    console.log('postsData-----index', postsData);
                    window.strapiData.indexData = postsData;
                } else if (page === 'discover-highlight') {
                    window.strapiData.discoverHighlightData = articles;
                    // 渲染到 discover-posts-swiper-1（首页）
                    renderDiscoverPosts();
                } else if (page === 'racecourse-experience') {
                    window.strapiData.racecourseExperienceData = articles;
                    // 渲染到 discover-posts-swiper-2（首页）
                    renderRacecourseExperiencePosts();
                }
            } else {
                if (section === 'discover-highlight') {
                    console.log('section-----discover-highlight----1', section);
                    updateDiscoverHighlightPage(articles);
                } else if (section === 'racing-academy') {
                    console.log('section-----racing-academy', section);
                    updateRacingAcademyPage(articles);
                } else if (section === 'racecourse-experience') {
                    console.log('section-----racecourse-experience', section);
                    updateRacecourseExperiencePage(articles);
                }
            }

            return articles;
        } catch (error) {
            console.error('Failed to load articles:', error);
            return [];
        }
    }

    /**
     * 初始化数据加载
     */
    async function init() {
        // 等待 StrapiAPI 加载
        if (typeof window.StrapiAPI === 'undefined') {
            console.error('StrapiAPI is not loaded. Make sure strapi-api.js is included before this script.');
            return;
        }

        // 等待 DOM 和 jQuery 完全加载
        if (typeof jQuery === 'undefined') {
            console.warn('jQuery is not loaded. Waiting...');
            setTimeout(init, 100);
            return;
        }

        // 根据页面加载相应的数据
        const path = window.location.pathname;

        try {
            // 首页：加载轮播图和专家
            if (path.indexOf('/index') !== -1 || path.endsWith('/') || path.endsWith('/en/') || path.endsWith('/tc/')) {
                await Promise.all([
                    loadBanners(),
                    loadExperts(),
                    loadArticles('isFeatured', 'index'),
                    loadArticles('isFeatured', 'discover-highlight'), // 精选
                    loadArticles('isFeatured', 'racecourse-experience') // 活动
                ]);
                console.log('window.strapiData.articles', window.strapiData.articles);
                // 渲染首页动画卡片
                renderAnimationCards();
            }
            console.log('path-----path', path);
            // Discover Highlight 页面：加载文章
            if (path.indexOf('discover-highlight') !== -1) {
                console.log('path-----discover-highlight', path);
                await loadArticles('discover-highlight', 'discover-highlight');
            }

            // Racing Academy 页面：加载文章
            if (path.indexOf('racing-academy') !== -1) {
                await loadArticles('racing-academy', 'racing-academy');
            }

            // Racecourse Experience 页面：加载文章
            if (path.indexOf('racecourse-experience') !== -1) {
                console.log('path-----racecourse-experience', path);
                await loadArticles('racecourse-experience', 'racecourse-experience');
            }

        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // 页面加载完成后初始化（等待 jQuery 和 Swiper 加载）
    function startInit() {
        if (typeof jQuery !== 'undefined' && typeof Swiper !== 'undefined') {
            // 等待一小段时间确保所有脚本都已执行
            setTimeout(init, 200);
        } else {
            setTimeout(startInit, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startInit);
    } else {
        startInit();
    }

    // 导出到全局
    window.StrapiDataLoader = {
        loadBanners,
        loadExperts,
        loadArticles,
        renderAnimationCards,
        renderDiscoverPosts,
        renderRacecourseExperiencePosts,
        updateRacingAcademyPage,
        updateDiscoverHighlightPage,
        updateRacecourseExperiencePage,
        init
    };

})();

