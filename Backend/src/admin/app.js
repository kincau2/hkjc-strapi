export default {
  config: {
    locales: [],
  },
  bootstrap(app) {
    // 尝试通过 API 移除 Home 菜单项
    try {
      // 获取菜单 API
      const menuApi = app.getPlugin('admin')?.get('menu');
      if (menuApi) {
        // 移除 Home 菜单项
        menuApi.removeMenuItem('Home');
        console.log('已通过 API 移除 Home 菜单项');
      }
    } catch (error) {
      console.log('通过 API 移除菜单项失败，将使用 CSS 方式:', error);
    }
    
    // 隐藏 Home 菜单项（通过 CSS）
    const hideHomeMenu = () => {
      if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.id = 'hide-home-menu-style';
        style.textContent = `
          /* 隐藏 Home 菜单项 - 通过 href 匹配 */
          a[href="/admin"],
          a[href="/admin/"],
          /* 通过 aria-label 查找 */
          a[aria-label*="Home" i],
          a[aria-label*="首页" i],
          /* 通过 class 查找 Home 相关的菜单项 */
          [class*="NavLink"][href="/admin"],
          [class*="NavLink"][href="/admin/"],
          [class*="nav-link"][href="/admin"],
          [class*="nav-link"][href="/admin/"],
          /* 通过 data 属性查找 */
          [data-testid*="home" i],
          [data-testid*="Home"] {
            display: none !important;
          }
        `;
        
        // 如果样式已存在，先移除
        const existingStyle = document.getElementById('hide-home-menu-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        document.head.appendChild(style);
        
        // 通过 JavaScript 查找并隐藏 Home 菜单项
        const hideHomeItems = () => {
          // 方法1: 查找所有链接到 /admin 或 /admin/ 的菜单项
          const adminLinks = document.querySelectorAll('a[href="/admin"], a[href="/admin/"]');
          adminLinks.forEach(link => {
            // 检查链接文本是否包含 Home 或首页
            const text = link.textContent?.trim().toLowerCase();
            const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() || '';
            
            if (text === 'home' || text === '首页' || ariaLabel.includes('home') || ariaLabel.includes('首页')) {
              // 隐藏整个菜单项（通常是 li 元素或包含菜单项的容器）
              const menuItem = link.closest('li') || 
                               link.closest('[class*="NavItem"]') || 
                               link.closest('[class*="nav-item"]') ||
                               link.closest('[class*="MenuItem"]') ||
                               link.closest('[class*="menu-item"]') ||
                               link.parentElement;
              if (menuItem) {
                menuItem.style.display = 'none';
                menuItem.style.visibility = 'hidden';
                menuItem.style.height = '0';
                menuItem.style.overflow = 'hidden';
              } else {
                link.style.display = 'none';
              }
            }
          });
          
          // 方法2: 查找所有包含 "Home" 文本的菜单项
          const allLinks = document.querySelectorAll('nav a, aside a, [class*="Nav"] a, [class*="Menu"] a');
          allLinks.forEach(link => {
            const text = link.textContent?.trim();
            const href = link.getAttribute('href');
            
            // 如果文本是 Home 或首页，或者链接指向 /admin
            if ((text === 'Home' || text === '首页') && (href === '/admin' || href === '/admin/' || !href)) {
              const menuItem = link.closest('li') || 
                               link.closest('[class*="NavItem"]') || 
                               link.closest('[class*="nav-item"]') ||
                               link.closest('[class*="MenuItem"]') ||
                               link.closest('[class*="menu-item"]') ||
                               link.parentElement;
              if (menuItem) {
                menuItem.style.display = 'none';
                menuItem.style.visibility = 'hidden';
                menuItem.style.height = '0';
                menuItem.style.overflow = 'hidden';
              }
            }
          });
          
          // 方法3: 通过 data-testid 或其他属性查找
          const homeByTestId = document.querySelectorAll('[data-testid*="home" i], [data-testid*="Home"]');
          homeByTestId.forEach(element => {
            const menuItem = element.closest('li') || 
                             element.closest('[class*="NavItem"]') || 
                             element.closest('[class*="nav-item"]') ||
                             element.closest('[class*="MenuItem"]') ||
                             element.closest('[class*="menu-item"]');
            if (menuItem) {
              menuItem.style.display = 'none';
            } else {
              element.style.display = 'none';
            }
          });
        };
        
        // 立即执行一次
        hideHomeItems();
        
        console.log('已设置隐藏 Home 菜单项');
        
        // 返回函数以便后续调用
        return hideHomeItems;
      }
      return () => {};
    };
    
    // 尝试多种方式获取路由
    let history = null;
    

  
    
    // 方法2: 尝试从 window 对象获取（Strapi 可能会将路由挂载到 window）
    if (typeof window !== 'undefined') {
      // 立即隐藏 Home 菜单
      const hideHomeItems = hideHomeMenu();
      
      // 等待 DOM 加载后再次尝试（确保菜单已渲染）
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(hideHomeItems, 500);
        });
      } else {
        setTimeout(hideHomeItems, 500);
      }
      
      // 监听 DOM 变化，确保 Home 菜单项被隐藏（如果菜单是动态加载的）
      const menuObserver = new MutationObserver(() => {
        hideHomeItems();
      });
      
      if (document.body) {
        menuObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
      // 等待 React Router 初始化
      const setupRedirect = () => {
        try {
          // 检查 window 上是否有路由相关的对象
          if (window.__REACT_ROUTER_HISTORY__) {
            history = window.__REACT_ROUTER_HISTORY__;
            console.log('从 window.__REACT_ROUTER_HISTORY__ 获取路由');
          } else {
            // 尝试通过 DOM 查找 React Router 的 history 对象
            // 或者直接使用浏览器 API
            const checkAndRedirect = () => {
              const currentPath = window.location.pathname;
              // 如果当前路径是 /admin 或 /admin/，重定向
              if (currentPath === '/admin' || currentPath === '/admin/' || currentPath === '/') {
                const targetPath = '/admin/content-manager/collection-types/api::banner.banner';
                if (currentPath !== targetPath) {
                  console.log('检测到需要重定向，从', currentPath, '到', targetPath);
                  window.location.replace(targetPath);
                }
              }
            };
            
            // 立即检查一次
            checkAndRedirect();
            
            // 监听 popstate 事件（浏览器前进后退）
            window.addEventListener('popstate', checkAndRedirect);
            
            // 使用 MutationObserver 监听 DOM 变化（当路由变化时可能会更新 DOM）
            const observer = new MutationObserver(() => {
              checkAndRedirect();
            });
            
            // 观察 body 的变化
            if (document.body) {
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
            }
            
            // 定期检查路径变化（作为备用方案）
            setInterval(checkAndRedirect, 500);
            
            console.log('已设置路径监听和重定向');
          }
          
          // 如果找到了 history 对象，设置拦截
          if (history) {
            // 拦截 push 方法
            const originalPush = history.push.bind(history);
            history.push = function(pathname, state) {
              if (pathname === '/admin' || pathname === '/admin/' || pathname === '/') {
                return originalPush('/content-manager/collection-types/api::banner.banner', state);
              }
              return originalPush(pathname, state);
            };
            
            // 拦截 replace 方法
            const originalReplace = history.replace.bind(history);
            history.replace = function(pathname, state) {
              if (pathname === '/admin' || pathname === '/admin/' || pathname === '/') {
                return originalReplace('/content-manager/collection-types/api::banner.banner', state);
              }
              return originalReplace(pathname, state);
            };
            
            // 监听路由变化
            history.listen((location) => {
              if (location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/') {
                setTimeout(() => {
                  history.replace('/content-manager/collection-types/api::banner.banner');
                }, 0);
              }
            });
          }
        } catch (error) {
          console.error('设置重定向失败:', error);
        }
      };
      
      // 等待 DOM 加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupRedirect);
      } else {
        setTimeout(setupRedirect, 100);
      }
    }
  },
};

