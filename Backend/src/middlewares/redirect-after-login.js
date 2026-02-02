module.exports = () => {
    return async (ctx, next) => {
    //     console.log('进入重定向中间件1',ctx.request.url,ctx.state);
    //   // 如果是 admin 的根路径，并且用户已经登录
    //   if (ctx.request.url === '/admin') {
    //     console.log('进入重定向中间件2',ctx.state);
    //     // 重定向到自定义页面
    //     // return ctx.redirect('/admin/content-manager/collection-types/api::banner.banner');
    //   }
      await next();
    };
  };