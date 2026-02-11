// Hong Kong Jockey Club - Main JavaScript
// This file contains all the interactive functionality for the website

// =============================================================================
// INITIALIZATION
// =============================================================================

function scrollToHash(hash, options) {
    if (!hash || hash === '#') return;
    var target = null;
    try {
        target = document.querySelector(hash);
    } catch (_) {
        return;
    }
    if (!target) return;

    var header = document.querySelector('.site-header');
    var headerHeight = header ? header.offsetHeight : 0;
    var rect = target.getBoundingClientRect();
    var offsetTop = rect.top + window.pageYOffset - headerHeight;
    var behavior = (options && options.behavior) ? options.behavior : 'smooth';

    window.scrollTo({
        top: Math.max(offsetTop, 0),
        behavior: behavior
    });
}

// Scroll handling on Page Load/Refresh
$(function() {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    var hash = window.location.hash;
    if (hash) {
        setTimeout(function() {
            scrollToHash(hash, { behavior: 'auto' });
        }, 0);
    } else {
        window.scrollTo(0, 0);
    }
});

// =============================================================================
// BANNER SWIPER
// =============================================================================

$(document).ready(function() {
    if (typeof Swiper === 'undefined') {
        console.warn('Swiper library not loaded');
        return;
    }
    
    // const bannerSwiper = new Swiper('.home-banner-wrapper', {
    //     loop: true,
    //     loopAdditionalSlides: 6,
    //     speed: 600,
    //     slidesPerView: 1.4,
    //     centeredSlides: true,
    //     spaceBetween: 16,
    //     watchSlidesProgress: true,
    //     autoplay: {
    //         delay: 4000,
    //         disableOnInteraction: false,
    //     },
    //     pagination: {
    //         el: '.banner-pagination',
    //         clickable: true,
    //     },
    //     breakpoints: {
    //         320: {
    //           spaceBetween: 24
    //         },
    //         768: {
    //           spaceBetween: 32
    //         }
    //       },
    //     on: {
    //         progress(swiper) {
    //             $(swiper.slides).each(function() {
    //                 const slide = this;
    //                 const slideProgress = slide.progress;
    //                 const scale = 1 - Math.min(Math.abs(slideProgress) * 0.06, 0.12);
    //                 const opacity = 1 - Math.min(Math.abs(slideProgress) * 0.35, 0.50);
    //                 $(slide).css({
    //                     'transform': `scale(${scale})`,
    //                     'opacity': opacity
    //                 });
    //             });
    //         },
    //         setTransition(swiper, duration) {
    //             $(swiper.slides).each(function() {
    //                 $(this).css('transition', duration + 'ms');
    //             });
    //         }
    //     }
    // });
    
    // Store instance globally
    // if (window.hkjcSwipers) {
    //     window.hkjcSwipers.banner = bannerSwiper;
    // }
});

// =============================================================================
// SPECIALISTS SWIPER
// =============================================================================



// =============================================================================
// MORE SPECIALISTS SWIPER
// =============================================================================

$(document).ready(function() {
    // rAF handle for ongoing animation updates
    var moreAnimRaf = null;

    // Conditional slide presentation based on device screen width
    var allowTouchMove;
    var spaceBetween;
    
    if (window.innerWidth <= 768) {
        spaceBetween = 10;
        allowTouchMove = true;
    } else {
        spaceBetween = 30;
        allowTouchMove = false;
    }

    const moreSwiper = new Swiper('.more-specialists-swiper', {
        loop: true,
        slidesPerView: 5,
        spaceBetween: spaceBetween,
        centeredSlides: true,
        allowTouchMove: allowTouchMove,
        watchSlidesProgress: true,
        speed: 1000,
        navigation: {
            nextEl: ".more-specialists-swiper .swiper-button-next",
            prevEl: ".more-specialists-swiper .swiper-button-prev",
        },
        on: {
            init(sw) {
                applyMoreScale(sw);
                updateMspecQuote(sw);
            },
            setTranslate(sw) {
                applyMoreScale(sw);
            },
            progress(sw) {
                applyMoreScale(sw);
            },
            setTransition(sw, duration) {
                $(sw.slides).each(function() {
                    $(this).css('transition', duration + 'ms');
                });
            },
            slideChange(sw) {
                updateMspecQuote(sw);
            },
            transitionStart(sw) {
                ensureAnimatingUpdates(sw);
            },
            transitionEnd(sw) {
                applyMoreScale(sw);
            },
        },
    });

    // Helper: smooth, position-based scaling
    function applyMoreScale(swiper) {
        $(swiper.slides).each(function() {
            const slide = this;
            const raw = slide.progress || 0;
            const p = Math.abs(raw);
            const reduce = Math.min(0.40, 0.25 * p);
            const scale = 1 - reduce;
            const $slide = $(slide);
            
            const hasPrevNextClass = $slide.hasClass('swiper-slide-prev') || $slide.hasClass('swiper-slide-next');
            const isActive = $slide.hasClass('swiper-slide-active');
            const nearPrev = raw <= -0.85 && raw >= -1.15;
            const nearNext = raw >= 0.85 && raw <= 1.15;
            const isImmediate = hasPrevNextClass || nearPrev || nearNext;

            if (isActive) {
                $slide.css('transform-origin', '');
            } else if (isImmediate) {
                $slide.css('transform-origin', '');
            } else if (raw < -0.05) {
                $slide.css('transform-origin', '0% 50%');
            } else if (raw > 0.05) {
                $slide.css('transform-origin', '100% 50%');
            } else {
                $slide.css('transform-origin', '');
            }

            $slide.css('transform', `scale(${scale})`);
        });
    }
    
    // During animations, ensure updates keep running
    function ensureAnimatingUpdates(swiper) {
        if (moreAnimRaf) cancelAnimationFrame(moreAnimRaf);
        const tick = () => {
            applyMoreScale(swiper);
            if (swiper && swiper.animating) {
                moreAnimRaf = requestAnimationFrame(tick);
            } else {
                moreAnimRaf = null;
            }
        };
        moreAnimRaf = requestAnimationFrame(tick);
    }

    const defaultSpecialistData = {
        quote: 'Insights that matter—balance data with instincts for smarter picks.',
        exploreLink: '#'
    };

    // Update the quote and button link based on the active slide
    function updateMspecQuote(sw) {
        try {
            // Expect specialistsData to be defined in the HTML file
            if (typeof specialistsData === 'undefined') {
                console.warn('specialistsData not defined');
                return;
            }
            
            const $active = $(sw.slides[sw.activeIndex]);
            const name = ($active.find('.mspec-name').text() || '').trim();
            const specialistInfo = specialistsData[name] || defaultSpecialistData;
            
            $('.more-specialists-wrap .mspec-quote').text(`${specialistInfo.quote}`);
            $('.more-specialists-wrap .mspec-quote-wrapper button a').attr('href', specialistInfo.exploreLink);
        } catch (e) {
            // fail-safe: do nothing
        }
    }
    
    // Store instance globally
    window.moreSpecialists = moreSwiper;
});

// =============================================================================
// CARD ANIMATION SECTION (GSAP + ScrollTrigger)
// =============================================================================
// 已经移到strapi-data-loader.js中去实现，获取数据之后再进行初始化
// Global references for discover animation functions
//window.discoverAnimationFunctions = {
//    setStartState: null,
//    buildTimeline: null
//};

// Global flag to check if animation section is hidden
//window.isAnimationHidden = false;

//$(function() {
//    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
//    if (!window.gsap || !window.ScrollTrigger) return;
//    gsap.registerPlugin(ScrollTrigger);

//    const animationSticky = document.querySelector('#animation');
//    if (!animationSticky) return;
    
//    // Mobile swipe state
//    let currentCardIndex = 0;
//    let swipeEnabled = false;
//    let touchStartX = 0;
//    let touchEndX = 0;
//    let isDragging = false;
//    let initialCardPositions = [];
//    let dragOffset = 0;

//    function layoutRow() {
//        const n = cards.length;
//        const cw = cards[0].offsetWidth;
//        const ch = cards[0].offsetHeight;
//        const marginLeft = 24;
//        const offSetWidthLeft = (cw * Math.cos(7 * Math.PI / 180) + ch * Math.sin(7 * Math.PI / 180) - cw) / 2;
//        const isMobile = window.innerWidth <= 768;

//        if (isMobile) {
//            const leftEdgeMargin = offSetWidthLeft + marginLeft;
//            const startOffset = -window.innerWidth / 2 + cw / 2 + leftEdgeMargin;
//            let step = cw * 0.70;

//            cards.forEach((el, i) => {
//                const offsetX = startOffset + i * step;
//                el.dataset.offsetX = String(offsetX);
//                el.dataset.baseOffsetX = String(offsetX);
//                el.style.zIndex = String(100 - i);
//            });
//        } else {
//            const viewportWidth = window.innerWidth;
//            const margin = 40;
//            const availableWidth = viewportWidth - margin * 2;
            
//            let step = cw * 0.70;
//            let total = cw + (n - 1) * step;
            
//            if (total > availableWidth) {
//                step = (availableWidth - cw) / (n - 1);
//                total = cw + (n - 1) * step;
//            }
            
//            const centerOffset = -total / 2 + cw / 2;

//            cards.forEach((el, i) => {
//                const offsetX = centerOffset + i * step;
//                el.dataset.offsetX = String(offsetX);
//                el.style.zIndex = String(100 + i);
//            });
//        }
//    }

//    function setCardAnimationStartState() {
//        gsap.set('#animation .animation-text-wrapper .animation-text', {
//            yPercent: 15,
//            opacity: 1
//        });

//        gsap.set('#animation .animation-text-wrapper .animation-text.top', {
//            yPercent: 0,
//            xPercent: -30
//        });

//        gsap.set('#animation .animation-text-wrapper .animation-text.center', {
//            yPercent: 0,
//            xPercent: 20
//        });

//        gsap.set('#animation .animation-text-wrapper .animation-text.bottom', {
//            yPercent: 0,
//            xPercent: -20
//        });

//        gsap.set('#animation .animation-image-wrapper img', {
//            xPercent: -50,
//            yPercent: -50,
//            x: 0,
//            y: 0,
//            opacity: 0,
//            scale: 0.9
//        });

//        gsap.set('#animation .animation-image-wrapper p', {
//            xPercent: -50,
//            yPercent: -50,
//            x: 0,
//            y: 0,
//            opacity: 0,
//            scale: 0.9
//        });

//        cards.forEach((el, i) => {
//            gsap.set(el, {
//                xPercent: -50,
//                yPercent: -50,
//                x: 0,
//                y: '70vh',
//                scale: 0.94,
//                opacity: 0,
//            });
//        });

//        gsap.set('#animation .animation-button-wrapper button', {
//            opacity: 0,
//        });
//    }

//    function buildCardAnimationTimeline() {
//        ScrollTrigger.getById('animation-timeline')?.kill();
//        ScrollTrigger.getById('animation-pin')?.kill();
//        
//        gsap.set(animationSticky, { clearProps: 'all' });
//        const sectionEl = document.querySelector('#animation');
        
//        const header = document.querySelector('.site-header');
//        const headerH = header ? header.offsetHeight : 0;
//        const vh = window.innerHeight;
//        const stageHeight = vh - headerH;
        
//        const tl = gsap.timeline({
//            scrollTrigger: {
//                id: 'animation-timeline',
//                trigger: sectionEl,
//                start: 'top bottom',
//                end: '+=2500',
//                scrub: 1,
//                markers: false,
//                invalidateOnRefresh: true,
//                onRefresh: () => {
//                    layoutRow();
//                },
//                onLeave: () => {
//                    tl.scrollTrigger.disable(false);
//                }
//            }
//        });

//        const pin = gsap.timeline({
//            scrollTrigger: {
//                id: 'animation-pin',
//                trigger: sectionEl,
//                start: () => {
//                    const header = document.querySelector('.site-header');
//                    const headerH = header ? header.offsetHeight : 0;
//                    return `top +=${headerH}px`;
//                },
//                end: () => {
//                    return `+=${2500 - stageHeight}`;
//                },
//                scrub: 1,
//                pin: animationSticky,
//                markers: false,
//                invalidateOnRefresh: true,
//                onToggle: (self) => {
//                    if (self.isActive) {
//                        $('.animation-stage').css('position', 'relative');
//                    } else {
//                        $('.animation-stage').css('position', '');
//                    }
//                },
//                onLeave: () => {
//                    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
//                    const pinSpacer = document.querySelector('.pin-spacer-animation-pin');
//                    const animSection = document.querySelector('#animation');
                    
//                    if (pinSpacer && animSection) {
//                        tl.progress(1);

//                        const oldHeight = pinSpacer.offsetHeight;
//                        pin.scrollTrigger.disable(false);

//                        const naturalHeight = animSection.offsetHeight;
//                        const heightDiff = oldHeight - naturalHeight;
                        
//                        pinSpacer.style.height = naturalHeight + 'px';
//                        pinSpacer.style.padding = '0px';
                        
//                        const newScroll = currentScroll - heightDiff;
//                        window.scrollTo(0, Math.max(0, newScroll));

//                        if (window.innerWidth <= 768) {
//                            fightCardMomentumScroll();
//                        } else {
//                            ScrollTrigger.getById('discover-pin')?.kill();
//                            window.discoverAnimationFunctions.setStartState();
//                            window.discoverAnimationFunctions.buildTimeline();
//                        }
                        
//                        gsap.set(animationSticky, { clearProps: 'transform' });
//                    }
//                }
//            }
//        });

//        pin.add('text');
//        tl.add('text');

//        tl.to('#animation .animation-text-wrapper .animation-text.top', {
//            xPercent: 30,
//            ease: 'none',
//            opacity: 0,
//            duration: 1.5
//        }, 'text');
        
//        tl.to('#animation .animation-text-wrapper .animation-text.center', {
//            xPercent: -20,
//            ease: 'none',
//            opacity: 0,
//            duration: 1.7
//        }, 'text+=0.08');
        
//        tl.to('#animation .animation-text-wrapper .animation-text.bottom', {
//            xPercent: 1,
//            ease: 'none',
//            opacity: 0,
//            duration: 2.1
//        }, 'text+=0.16');

//        tl.to(cards, {
//            x: (i, el) => parseFloat(el.dataset.offsetX || '0'),
//            y: 0,
//            rotation: (i) => (i % 2 ? 7 : -7),
//            scale: 1,
//            opacity: 1,
//            ease: 'power1.out',
//            duration: 0.6,
//            stagger: 0.18
//        }, 'text+=1.05');

//        tl.to('#animation .animation-image-wrapper img', {
//            opacity: 1,
//            scale: 1,
//            ease: 'power2.out',
//            duration: 0.6
//        }, 'text+=1.75');

//        tl.to('#animation .animation-image-wrapper p', {
//            opacity: 1,
//            scale: 1,
//            ease: 'power2.out',
//            duration: 0.6
//        }, 'text+=1.75');

//        tl.to('#animation .animation-button-wrapper button', {
//            ease: 'power2.out',
//            opacity: 1,
//            duration: 0.3
//        }, 'text+=2');

//        tl.to('#animation .animation-button-wrapper button', {}, 'text+=2.5');
//        
//        const isMobile = window.innerWidth <= 768;
//        if (isMobile) {
//            tl.call(() => {
//                swipeEnabled = true;
//            }, null, 'text+=2.5');
//        }
//    }

//    function fightCardMomentumScroll() {
//        let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
//        let momentumTimeout = null;
//        let isLocked = true;
//        let touchEndReceived = false;
//        
//        const initialTouchCheck = setTimeout(() => {
//            if (!touchEndReceived) {
//                // Enable timeout-based release for momentum
//            }
//        }, 50);
        
//        const scrollLockHandler = () => {
//            window.scrollTo(0, lastScrollTop);
//            $('.animation-stage').css('position', 'fixed');
//            $('.animation-stage').css('bottom', '0');
//            $('.animation-stage').css('z-index', '9');
            
//            if (!touchEndReceived) {
//                clearTimeout(momentumTimeout);
//                momentumTimeout = setTimeout(() => {
//                    if (isLocked) {
//                        releaseLock();
//                    }
//                }, 150);
//            }
//        };
        
//        const releaseLock = () => {
//            if (!isLocked) return;
//            isLocked = false;
            
//            clearTimeout(initialTouchCheck);
//            clearTimeout(momentumTimeout);
//            window.removeEventListener('scroll', scrollLockHandler);
//            document.removeEventListener('touchend', onTouchEnd);
//            document.removeEventListener('touchcancel', onTouchEnd);
            
//            $('.animation-stage').css('position', '');
//            $('.animation-stage').css('bottom', '');
//            $('.animation-stage').css('z-index', '');
            
//            ScrollTrigger.getById('discover-pin')?.kill();
//            window.discoverAnimationFunctions.setStartState();
//            window.discoverAnimationFunctions.buildTimeline();
//        };
        
//        const onTouchEnd = () => {
//            touchEndReceived = true;
//            clearTimeout(initialTouchCheck);
//            releaseLock();
//        };
        
//        window.addEventListener('scroll', scrollLockHandler);
//        document.addEventListener('touchend', onTouchEnd, { once: true });
//        document.addEventListener('touchcancel', onTouchEnd, { once: true });
//    }
    
//    function handleDragMove(currentX) {
//        const isMobile = window.innerWidth <= 768;
//        if (!isMobile || !swipeEnabled || !isDragging) return;
//        
//        dragOffset = currentX - touchStartX;
//        
//        cards.forEach((el, i) => {
//            const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
//            const cw = cards[0].offsetWidth;
//            const step = cw * 0.70;
//            const currentSwipeOffset = -currentCardIndex * step;
//            const newX = baseOffset + currentSwipeOffset + dragOffset;
//            
//            gsap.set(el, { x: newX });
//        });
//    }
    
//    function findNearestCard() {
//        const isMobile = window.innerWidth <= 768;
//        if (!isMobile) return currentCardIndex;
//        
//        const cw = cards[0].offsetWidth;
//        const step = cw * 0.70;
//        const screenCenter = 0;
//        
//        const totalOffset = -currentCardIndex * step + dragOffset;
//        const estimatedIndex = Math.round(-totalOffset / step);
//        
//        return Math.max(0, Math.min(cards.length - 1, estimatedIndex));
//    }
    
//    function handleSwipeEnd() {
//        const isMobile = window.innerWidth <= 768;
//        if (!isMobile || !swipeEnabled) return;
//        
//        const nearestIndex = findNearestCard();
//        currentCardIndex = nearestIndex;
//        dragOffset = 0;
//        
//        updateCardPositions(true);
//    }
    
//    function updateCardPositions(animate = true) {
//        const isMobile = window.innerWidth <= 768;
//        if (!isMobile) return;
//        
//        const cw = cards[0].offsetWidth;
//        const step = cw * 0.70;
//        const swipeOffset = -currentCardIndex * step;
//        
//        cards.forEach((el, i) => {
//            const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
//            const newX = baseOffset + swipeOffset;
//            
//            if (animate) {
//                gsap.to(el, {
//                    x: newX,
//                    duration: 0.4,
//                    ease: 'power2.out'
//                });
//            } else {
//                gsap.set(el, { x: newX });
//            }
//            
//            const zIndex = i === currentCardIndex ? 200 : (100 - i);
//            el.style.zIndex = String(zIndex);
//        });
//    }
    
//    function initSwipeListeners() {
//        const cardsLayer = document.querySelector('#animation .animation-cards-layer'); //
//        if (!cardsLayer) return;
//        
//        cardsLayer.addEventListener('touchstart', (e) => {
//            const isMobile = window.innerWidth <= 768;
//            if (!isMobile || !swipeEnabled) return;
//            
//            touchStartX = e.touches[0].clientX;
//            touchEndX = touchStartX;
//            isDragging = true;
//            dragOffset = 0;
            
//            cards.forEach((el, i) => {
//                const baseOffset = parseFloat(el.dataset.baseOffsetX || '0');
//                const cw = cards[0].offsetWidth;
//                const step = cw * 0.70;
//                const currentSwipeOffset = -currentCardIndex * step;
//                initialCardPositions[i] = baseOffset + currentSwipeOffset;
//            });
//        }, { passive: true });
        
//        cardsLayer.addEventListener('touchmove', (e) => {
//            const isMobile = window.innerWidth <= 768;
//            if (!isMobile || !swipeEnabled || !isDragging) return;
//            
//            touchEndX = e.touches[0].clientX;
//            handleDragMove(touchEndX);
//        }, { passive: true });
        
//        cardsLayer.addEventListener('touchend', (e) => {
//            const isMobile = window.innerWidth <= 768;
//            if (!isMobile || !swipeEnabled || !isDragging) return;
//            
//            isDragging = false;
//            handleSwipeEnd();
//        }, { passive: true });
//
//        cardsLayer.addEventListener('touchcancel', (e) => {
//            const isMobile = window.innerWidth <= 768;
//            if (!isMobile || !swipeEnabled || !isDragging) return;      
            
//            isDragging = false;
//            handleSwipeEnd();
//        }, { passive: true });
//    }

//    layoutRow();
//    setCardAnimationStartState();
//    buildCardAnimationTimeline();
//    initSwipeListeners();
//});

// =============================================================================
// DISCOVER ANIMATION SECTION (GSAP + ScrollTrigger)
// =============================================================================

//$(function() {
//    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
//    if (!window.gsap || !window.ScrollTrigger) return;
//    gsap.registerPlugin(ScrollTrigger);
//    ScrollTrigger.normalizeScroll(true);
//    ScrollTrigger.config({ ignoreMobileResize: true });

//    const discoverSticky = document.querySelector('#discover');
//    if (!discoverSticky) return;
//    const clipRect = document.querySelector('#discoverClipRect');
//    const clipRectMobile = document.querySelector('#discoverClipRectMobile');
//    if (!clipRect || !clipRectMobile) return;

//    const DISCOVER_BASE_RATIO = 490 / 928;
//    const DISCOVER_MOBILE_RATIO = 407 / 269;
//    let discoverGeom = null;
    
//    // Check if animation section is hidden - if so, initialize directly
//    const shouldInitializeDirectly = window.isAnimationHidden || false;

    
//    function calculateDiscoverGeometry() {
//        const header = document.querySelector('.site-header');
//        const headerH = header ? header.offsetHeight : 0;
//        const sectionWidth = window.innerWidth;
//        const sectionHeight = Math.max(0, window.innerHeight - headerH);
//        const isMobile = window.innerWidth <= 768;

//        let baseWidth, baseHeight, rx, ry;
        
//        if (isMobile) {
//            const maxHeightFromViewport = sectionHeight * 0.82;
//            const maxHeightFromWidth = sectionWidth * DISCOVER_MOBILE_RATIO * 0.92;
//            baseHeight = Math.max(280, Math.min(928, maxHeightFromViewport * 0.9));
//            baseWidth = baseHeight / DISCOVER_MOBILE_RATIO;
//            rx = baseWidth / 2;
//            ry = baseWidth / 2;
//        } else {
//            const maxWidthFromViewport = sectionWidth * 0.82;
//            const maxWidthFromHeight = sectionHeight / DISCOVER_BASE_RATIO * 0.92;
//            baseWidth = Math.max(280, Math.min(928, maxWidthFromViewport * 0.8));
//            baseHeight = baseWidth * DISCOVER_BASE_RATIO;
//            rx = baseHeight / 2;
//            ry = baseHeight / 2;
//        }

//        const initialX = (sectionWidth - baseWidth) / 2;
//        const initialY = (sectionHeight - baseHeight) / 2;

//        const overshootX = sectionWidth * 0.18;
//        const overshootY = sectionHeight * 0.22;

//        return {
//            sectionWidth,
//            sectionHeight,
//            baseWidth,
//            baseHeight,
//            initialRect: {
//                x: initialX,
//                y: initialY,
//                width: baseWidth,
//                height: baseHeight,
//                rx: rx,
//                ry: ry
//            },
//            finalRect: {
//                x: -overshootX,
//                y: -overshootY,
//                width: sectionWidth + overshootX * 2,
//                height: sectionHeight + overshootY * 2,
//                rx: 0,
//                ry: 0
//            }
//        };
//    }

//    function applyDiscoverLayout(geom) {  
//        const background = discoverSticky.querySelector('.discover-background');
//        const imgBackground = discoverSticky.querySelector('.discover-image-background');
//        const isMobile = window.innerWidth <= 768;
//        
//        if (background) {
//            background.style.setProperty('--discover-shell-width', `${geom.baseWidth}px`);
//            background.style.setProperty('--discover-shell-height', `${geom.baseHeight}px`);
//            background.style.setProperty('--discover-shell-radius', `${Math.min(geom.baseWidth, geom.baseHeight) / 2}px`);
//            
//            if (isMobile) {
//                background.style.clipPath = 'url(#discover-clip-mobile)';
//                background.style.webkitClipPath = 'url(#discover-clip-mobile)';
//                imgBackground.style.clipPath = 'url(#discover-clip-mobile)';
//                imgBackground.style.webkitClipPath = 'url(#discover-clip-mobile)';
//            } else {
//                background.style.clipPath = 'url(#discover-clip)';
//                background.style.webkitClipPath = 'url(#discover-clip)';
//                imgBackground.style.clipPath = 'url(#discover-clip)';
//                imgBackground.style.webkitClipPath = 'url(#discover-clip)';
//            }
//        }

//        const activeClipRect = isMobile ? clipRectMobile : clipRect;
//        gsap.set(activeClipRect, {
//            attr: {
//                x: geom.initialRect.x,
//                y: geom.initialRect.y,
//                width: geom.initialRect.width,
//                height: geom.initialRect.height,
//                rx: geom.initialRect.rx,
//                ry: geom.initialRect.ry
//            }
//        });
//    }

//    function refreshDiscoverGeometry() {
//        discoverGeom = calculateDiscoverGeometry();
//        applyDiscoverLayout(discoverGeom);
//        return discoverGeom;
//    }

//    function setDiscoverStartState() {
//        discoverGeom = refreshDiscoverGeometry();

//        gsap.set('#discover .discover-background', {
//            xPercent: -50,
//            yPercent: -50,
//            scale: 1
//        });
//
//        gsap.set('#discover .discover-content .discover-dot', {
//            opacity: 0
//        });

//        gsap.set('#discover .discover-content .discover-text', {
//            opacity: 0,
//            x: 0,
//            xPercent: -50,
//            yPercent: -50,
//            maxWidth: discoverGeom.baseWidth - 80 + 'px',
//            scale: 1.1
//        });

//        const isMobile = window.innerWidth <= 768;
//        var offsetDifferent;
//        var iconHeight = document.querySelector('#discover .discover-content .discover-icon')?.offsetHeight || 0;
//        
//        if (isMobile) {
//            offsetDifferent = 20;
//        } else {
//            offsetDifferent = (discoverGeom.baseHeight / 2 - iconHeight - 30) / 2;
//        }
        
//        var textHeight = document.querySelector('#discover .discover-content .discover-text')?.offsetHeight || 0;
//        var textInitialY = 30 + offsetDifferent + textHeight / 2 - 6;
//        
//        gsap.set('#discover .discover-content .discover-text', {
//            y: textInitialY
//        });
        
//        gsap.set('#discover .discover-content .discover-icon', {
//            x: 0,
//            y: 0,
//            xPercent: -50,
//            yPercent: -50
//        });

//        gsap.set('#discover .discover-image-background img', {
//            scale: 1.04
//        });

//        gsap.set('#discover .discover-post', {
//            opacity: 0,
//            visibility: 'hidden'
//        });

//        if (isMobile) {
//            adjustMobileDiscoverSwiperWidth();
//        } else {
//            adjustDesktopDiscoverSwiperWidth();
//        }
//    }

//    function buildDiscoverTimeline() {
//        const sectionEl = document.querySelector('#discover');
//        var discoverGeom = refreshDiscoverGeometry();
//        
//        const tl = gsap.timeline({
//            scrollTrigger: {
//                id: 'discover-pin',
//                trigger: sectionEl,
//                start: () => {
//                    const header = document.querySelector('.site-header');
//                    const headerH = header ? header.offsetHeight : 0;
//                    return `top +=${headerH}px`;
//                },
//                end: '+=400%',
//                scrub: 1,
//                pin: discoverSticky,
//                anticipatePin: 1,
//                markers: false,
//                invalidateOnRefresh: true,
//                onRefresh: refreshDiscoverGeometry,
//                onLeave: () => {
//                    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
//                    const pinSpacer = document.querySelector('.pin-spacer-discover-pin');
//                    const discoverSection = document.querySelector('#discover');
                    
//                    if (pinSpacer && discoverSection) {
//                        tl.progress(1);
//                        
//                        const oldHeight = pinSpacer.offsetHeight;
//                        tl.scrollTrigger.disable(false);
//                        
//                        const naturalHeight = discoverSection.offsetHeight;
//                        const heightDiff = oldHeight - naturalHeight;
//                        
//                        pinSpacer.style.height = naturalHeight + 'px';
//                        pinSpacer.style.padding = '0px';
//                        
//                        const newScroll = currentScroll - heightDiff;
//                        window.scrollTo(0, Math.max(0, newScroll));
//                        
//                        if (window.innerWidth <= 768) {
//                            fightDiscoverMomentumScroll();
//                        }
//                        
//                        gsap.set(discoverSticky, { clearProps: 'transform' });
//                    }
//                }
//            }   
//        });
        
//        tl.add('timeline');

//        const isMobile = window.innerWidth <= 768;
//        var offsetDifferent;
//        var iconHeight = document.querySelector('#discover .discover-content .discover-icon')?.offsetHeight || 0;
        
//        if (isMobile) {
//            offsetDifferent = 20;
//        } else {
//            offsetDifferent = (discoverGeom.baseHeight / 2 - iconHeight - 30) / 2;
//        }
        
//        var iconFinalY = 30 + offsetDifferent + iconHeight / 2;

//        tl.to('#discover .discover-content .discover-icon', {
//            y: -iconFinalY,
//            opacity: 1,
//            ease: 'power1.out',
//            duration: 1,
//        }, 'timeline');

//        tl.to('#discover .discover-content .discover-dot', {
//            opacity: 1,
//            ease: 'power4.in',
//            duration: 1.5,
//        }, 'timeline+=0.5');

//        tl.to('#discover .discover-content .discover-dot', {
//            height: '50px',
//            ease: 'power1.in',
//            duration: 1.5,
//        }, 'timeline+=2');

//        tl.to('#discover .discover-content .discover-dot', {
//            y: 0,
//            ease: 'power1.out',
//            duration: 1.5,
//        }, 'timeline+=2');

//        tl.to('#discover .discover-content .discover-text', {
//            opacity: 1,
//            scale: 1,
//            ease: 'power4.out', 
//            duration: 2,
//        }, 'timeline+=3.5');

//        const activeClipRect = isMobile ? clipRectMobile : clipRect;
        
//        tl.to(activeClipRect, {
//            attr: {
//                x: () => discoverGeom.finalRect.x,
//                y: () => discoverGeom.finalRect.y,
//                width: () => discoverGeom.finalRect.width,
//                height: () => discoverGeom.finalRect.height,
//                rx: () => discoverGeom.finalRect.rx,
//                ry: () => discoverGeom.finalRect.ry
//            },
//            ease: 'power2.inOut',
//            duration: 5,
//        }, 'timeline+=5.5');

//        tl.to('#discover .discover-content .discover-icon', {
//            opacity: 0,
//            ease: 'power1.out',
//            duration: 1,
//        }, 'timeline+=8');
        
//        tl.to('#discover .discover-content .discover-dot', {
//            opacity: 0,
//            ease: 'power1.out',
//            duration: 1,
//        }, 'timeline+=8');
        
//        tl.to('#discover .discover-content .discover-text', {
//            opacity: 0,
//            ease: 'power1.out',
//            duration: 1,
//        }, 'timeline+=8');

//        tl.to('#discover .discover-post', {
//            opacity: 1,
//            visibility: 'visible',
//            ease: 'power1.out',
//            duration: 1,
//        }, 'timeline+=9');
//    }

//    function adjustMobileDiscoverSwiperWidth() {
//        const isMobile = window.innerWidth <= 768;
//        if (!isMobile) return;

//        const discoverPost = document.querySelector('#discover .discover-post');
//        if (!discoverPost) return;

//        const postWrappers = discoverPost.querySelectorAll('.post-wrapper');
        
//        postWrappers.forEach(wrapper => {
//            const swiper = wrapper.querySelector('.swiper');
//            const title = wrapper.querySelector('.section-title');
//            
//            if (!swiper) return;

//            const discoverPostHeight = discoverPost.offsetHeight - 48 - 15;
//            const wrapperMaxHeight = discoverPostHeight * 0.5;
//            
//            const titleHeight = title.offsetHeight;
//            const gap = 15;
            
//            const availableHeight = wrapperMaxHeight - titleHeight - gap;
//            const textWrapperHeight = wrapper.querySelector('.post-text-wrapper')?.offsetHeight || 60;
//            const featureImgHeight = availableHeight - textWrapperHeight;
//            
//            const aspectRatio = 245 / 138;
//            var postWidth = featureImgHeight * aspectRatio;

//            if (postWidth > window.innerWidth - 15) {
//                postWidth = (window.innerWidth - 30) / 1.3;
//            }
//            
//            const slides = swiper.querySelectorAll('.swiper-slide .post');
//            slides.forEach(slide => {
//                slide.style.width = `${postWidth}px`;
//            });
//        });

//        // (removed) enforce equal heights across cards
//    }

//    function adjustDesktopDiscoverSwiperWidth() {
//        const isMobile = window.innerWidth <= 768;
//        if (isMobile) return;
//        
//        const discoverPost = document.querySelector('#discover .discover-post');
//        if (!discoverPost) return;

//        const postWrappers = discoverPost.querySelectorAll('.post-wrapper');
//        
//        postWrappers.forEach(wrapper => {
//            const swiper = wrapper.querySelector('.swiper');
//            const title = wrapper.querySelector('.section-title');
//            
//            if (!swiper) return;

//            const discoverPostHeight = discoverPost.offsetHeight - 40 - 20;
//            const wrapperMaxHeight = discoverPostHeight * 0.5;
//            
//            const titleHeight = title.offsetHeight;
//            const gap = 20;
//            
//            const availableHeight = wrapperMaxHeight - titleHeight - gap;

//            const textWrapperHeight = wrapper.querySelector('.post-text-wrapper')?.offsetHeight || 60;

//            const featureImgHeight = availableHeight - textWrapperHeight;

//            const aspectRatio = 245 / 138;
//            const postWidth = featureImgHeight * aspectRatio;
            
//            const swiperWidth = (postWidth * 3) + (gap * 2);
            
//            if (swiperWidth > 900) return;
            
//            swiper.style.width = `${swiperWidth}px`;
//            swiper.style.maxWidth = '100%';
            
//            const slides = swiper.querySelectorAll('.swiper-slide .post');
//            slides.forEach(slide => {
//                slide.style.width = `${postWidth}px`;
//            });
//        });
//    }

//    function fightDiscoverMomentumScroll() {
//        let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
//        let momentumTimeout = null;
//        let isLocked = true;
//        let touchEndReceived = false;
        
//        const initialTouchCheck = setTimeout(() => {
//            if (!touchEndReceived) {
//                // Enable timeout-based release for momentum
//            }
//        }, 50);
        
//          const scrollLockHandler = () => {
//            window.scrollTo(0, lastScrollTop);
//            $('.discover-stage').css('position', 'fixed');
//            $('.discover-stage').css('bottom', '0');
//            $('.discover-stage').css('z-index', '9');
//            
//            if (!touchEndReceived) {
//                clearTimeout(momentumTimeout);
//                momentumTimeout = setTimeout(() => {
//                    if (isLocked) {
//                        releaseLock();
//                    }
//                }, 150);
//            }
//        };
        
//        const releaseLock = () => {
//            if (!isLocked) return;
//            isLocked = false;
            
//            clearTimeout(initialTouchCheck);
//            clearTimeout(momentumTimeout);
//            window.removeEventListener('scroll', scrollLockHandler);
//            document.removeEventListener('touchend', onTouchEnd);
//            document.removeEventListener('touchcancel', onTouchEnd);
            
//            $('.discover-stage').css('position', '');
//            $('.discover-stage').css('bottom', '');
//            $('.discover-stage').css('z-index', '');
//        };
        
//        const onTouchEnd = () => {
//            touchEndReceived = true;
//            clearTimeout(initialTouchCheck);
//            releaseLock();
//        };
        
//        window.addEventListener('scroll', scrollLockHandler);
//        document.addEventListener('touchend', onTouchEnd, { once: true });
//        document.addEventListener('touchcancel', onTouchEnd, { once: true });
//    }
    
//    window.discoverAnimationFunctions.setStartState = setDiscoverStartState;
//    window.discoverAnimationFunctions.buildTimeline = buildDiscoverTimeline;

    // If animation section is hidden, initialize discover animations directly
//    if (shouldInitializeDirectly) {
//        setDiscoverStartState();
//        buildDiscoverTimeline();
//    }

//});

// =============================================================================
// DISCOVER POSTS SWIPER (Mobile Only)
// =============================================================================

$(document).ready(function() {
    if (typeof Swiper === 'undefined') return;

    let discoverSwiper1 = null;
    let discoverSwiper2 = null;

    function adjustMobilePostSize() {
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

            const textWrapperHeight = swiper.querySelector('.post .post-text-wrapper')?.offsetHeight || 60;
            const featureImgHeight = availableHeight - textWrapperHeight;
            const aspectRatio = 245 / 138;
            var postWidth = featureImgHeight * aspectRatio;

            if (postWidth > window.innerWidth - 15) {
                postWidth = (window.innerWidth - 30) / 1.3;
            }

            const posts = swiper.querySelectorAll('.post');
            posts.forEach(post => {
                post.style.width = `${postWidth}px`;
            });

            //const featureImgs = swiper.querySelectorAll('.feature-img');
            //featureImgs.forEach(img => {
            //  img.style.height = `${featureImgHeight}px`;
            //});

            //const textWrappers = swiper.querySelectorAll('.post-text-wrapper'); 
            //textWrappers.forEach(wrapper => {
            //    wrapper.style.height = `${textWrapperHeight}px`;
            //});
        });
    }
    
    function initDiscoverSwipers() {
        const isMobile = window.innerWidth <= 768;
        
        if (discoverSwiper1) {
            discoverSwiper1.destroy(true, true);
            discoverSwiper1 = null;
        }
        if (discoverSwiper2) {
            discoverSwiper2.destroy(true, true);
            discoverSwiper2 = null;
        }
        
        if (isMobile) {
            adjustMobilePostSize();
            
            discoverSwiper1 = new Swiper('.discover-posts-swiper-1', {
                slidesPerView: 'auto',
                spaceBetween: 15,
                watchSlidesProgress: true,
                freeMode: true
            });
            
            discoverSwiper2 = new Swiper('.discover-posts-swiper-2', {
                slidesPerView: 'auto',
                spaceBetween: 15,
                watchSlidesProgress: true,
                freeMode: true
            });

            // (removed) equal heights after Swiper mounts
            
            if (window.hkjcSwipers) {
                window.hkjcSwipers.discoverPosts1 = discoverSwiper1;
                window.hkjcSwipers.discoverPosts2 = discoverSwiper2;
            }
        }
    }
    
    initDiscoverSwipers();
});

// =============================================================================
// GLOBAL RESIZE HANDLER
// =============================================================================

$(function() {
    
    window.addEventListener('resize', function() {
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
    
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
    
});

// =============================================================================
// MOBILE NAVIGATION TOGGLE
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const mobileNav = document.getElementById('mobileNav');
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    const closeIcon = document.querySelector('.close-icon');
    
    if (mobileNav && hamburgerIcon && closeIcon) {
        mobileNav.addEventListener('show.bs.collapse', function() {
            hamburgerIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        });
        
        mobileNav.addEventListener('hide.bs.collapse', function() {
            hamburgerIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        });
    }

    // Handler for links that should collapse mobile menu before reloading with hash
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[data-collapse-reload]');
        if (!link) return;

        const targetHref = link.getAttribute('data-collapse-reload') || link.getAttribute('href');
        if (!targetHref) return;

        e.preventDefault();

        const navigate = function() {
            window.location.href = targetHref;
        };

        if (mobileNav && mobileNav.classList.contains('show')) {
            let completed = false;
            const cleanup = function() {
                if (completed) return;
                completed = true;
                mobileNav.removeEventListener('hidden.bs.collapse', onHidden);
            };

            const onHidden = function() {
                cleanup();
                navigate();
            };

            mobileNav.addEventListener('hidden.bs.collapse', onHidden);

            if (window.bootstrap && window.bootstrap.Collapse) {
                const instance = window.bootstrap.Collapse.getOrCreateInstance(mobileNav);
                instance.hide();
            } else {
                mobileNav.classList.remove('show');
                mobileNav.classList.add('collapsing');
                setTimeout(function() {
                    mobileNav.classList.remove('collapsing');
                    mobileNav.classList.add('collapse');
                    onHidden();
                }, 300);
            }

            setTimeout(function() {
                if (!completed) {
                    cleanup();
                    navigate();
                }
            }, 400);
        } else {
            navigate();
        }
    });
});