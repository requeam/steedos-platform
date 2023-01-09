/*
 * @Author: baozhoutao@steedos.com
 * @Date: 2022-03-31 11:10:59
 * @Description: 
 */

; (function () {

  const loadCss = (href)=>{
    try {
      // 加载Amis css
        let amisStyle = document.createElement("link");
        amisStyle.setAttribute("rel", "stylesheet");
        amisStyle.setAttribute("type", "text/css");
        amisStyle.setAttribute("href", href);
        document.getElementsByTagName("head")[0].appendChild(amisStyle);
    } catch (error) {
        console.error(error)
    };
  }
  // loadCss(Steedos.absoluteUrl("/unpkg.com/amis/sdk/sdk.css"))
  loadCss(Steedos.absoluteUrl("/unpkg.com/amis/sdk/helper.css"))
  loadCss(Steedos.absoluteUrl("/unpkg.com/amis/sdk/iconfont.css"))
  loadCss(Steedos.absoluteUrl("/amis/amis.css"))
    
    try {
        window['attrAccept'] = function (file, acceptedFiles) {
            if (file && acceptedFiles) {
              var acceptedFilesArray = Array.isArray(acceptedFiles) ? acceptedFiles : acceptedFiles.split(',');
              var fileName = file.name || '';
              var mimeType = (file.type || '').toLowerCase();
              var baseMimeType = mimeType.replace(/\/.*$/, '');
              return acceptedFilesArray.some(function (type) {
                var validType = type.trim().toLowerCase();
          
                if (validType.charAt(0) === '.') {
                  return fileName.toLowerCase().endsWith(validType);
                } else if (validType.endsWith('/*')) {
                  // This is something like a image/* mime type
                  return baseMimeType === validType.replace(/\/.*$/, '');
                }
          
                return mimeType === validType;
              });
            }
          
            return true;
          }

        // 加载Amis SDK: 如果直接放到body中会导致 meteor 编译后的 cordova.js 加载报错
        let amisSDKScript = document.createElement("script");
        amisSDKScript.setAttribute("src", Steedos.absoluteUrl('/unpkg.com/amis/sdk/sdk.js'));
        document.getElementsByTagName("head")[0].appendChild(amisSDKScript);
    } catch (error) {
        console.error(error)
    };

    const getAmisLng = ()=>{
        var locale = Creator.USER_CONTEXT ? Creator.USER_CONTEXT.user.language : null;
        if(locale){
            locale = locale.replace('_', '-');
            locale = locale === 'en' ? 'en-US' : locale;
            locale = locale === 'zh' ? 'zh-CN' : locale;
            locale = locale === 'cn' ? 'zh-CN' : locale;
            return locale
        }
        return 'zh-CN'
    }

    // 此处不能使用import, client js 编译时会将import 转为require, 导致加载失败
    // import('/unpkg.com/@steedos-ui/amis/dist/amis-sdk.umd.min.js').then(() => {
        Promise.all([
            waitForThing(window, 'assetsLoaded'),
            waitForThing(window, 'amis'),
        ]).then(()=>{
            window.React = window.__React;
            window.ReactDOM = window.__ReactDOM;
            const AmisRenderers = [];

            const amisComps = lodash.filter(Builder.registry['meta-components'], function(item){ return item.componentName && item.amis?.render});
            
            lodash.each(amisComps,(comp)=>{
                const Component = Builder.components.find(item => item.name === comp.componentName);
                if (Component && !AmisRenderers.includes(comp.amis?.render.type)){
                    try {
                        let AmisWrapper = Component.class
                        AmisRenderers.push(comp.amis?.render.type);
                        if(comp.componentType === 'amisSchema'){
                            let amisReact = amisRequire('react');
                            AmisWrapper = function(props){
                              const { body, render } = props
                              const [schema, setSchema] = amisReact.useState(null);
                              amisReact.useEffect(()=>{
                                const result = Component.class(props);
                                if(result.then && typeof result.then === 'function'){
                                  result.then((data)=>{
                                    setSchema(data);
                                  })
                                }else{
                                  setSchema(result)
                                }
                              }, [])
                              return amisReact.createElement(amisReact.Fragment, null, amisReact.createElement(amisReact.Fragment, null, schema && render ? render('body', schema) : ''), amisReact.createElement(amisReact.Fragment, null, render ? render('body', body) : ''));
                            }
                          }
                        amisRequire("amis").Renderer(
                            {
                                type: comp.amis?.render.type,
                                weight: comp.amis?.render.weight,
                                autoVar: true,
                            }
                        )(AmisWrapper);
                    } catch(e){console.error(e)}
                }
            });

            const normalizeLink = (to, location = window.location) => {
                to = to || '';
              
                if (to && to[0] === '#') {
                  to = location.pathname + location.search + to;
                } else if (to && to[0] === '?') {
                  to = location.pathname + to;
                }
              
                const idx = to.indexOf('?');
                const idx2 = to.indexOf('#');
                let pathname = ~idx
                  ? to.substring(0, idx)
                  : ~idx2
                  ? to.substring(0, idx2)
                  : to;
                let search = ~idx ? to.substring(idx, ~idx2 ? idx2 : undefined) : '';
                let hash = ~idx2 ? to.substring(idx2) : location.hash;
              
                if (!pathname) {
                  pathname = location.pathname;
                } else if (pathname[0] != '/' && !/^https?\:\/\//.test(pathname)) {
                  let relativeBase = location.pathname;
                  const paths = relativeBase.split('/');
                  paths.pop();
                  let m;
                  while ((m = /^\.\.?\//.exec(pathname))) {
                    if (m[0] === '../') {
                      paths.pop();
                    }
                    pathname = pathname.substring(m[0].length);
                  }
                  pathname = paths.concat(pathname).join('/');
                }
              
                return pathname + search + hash;
              };

            const AmisEnv = {
                // getModalContainer: (props)=>{
                //     let div = document.querySelector("#amisModalContainer");
                //     if(!div){
                //         div = document.createElement('div');
                //         div.className="amis-scope";
                //         div.style.height='0px';
                //         div.id="amisModalContainer";
                //         document.body.appendChild(div)
                //     }
                //     return div;
                // },
                jumpTo: (to, action) => {
                if (to === 'goBack') {
                    return window.history.back();
                }

                to = normalizeLink(to);

                if (action && action.actionType === 'url') {
                    action.blank === false ? (window.location.href = to) : window.open(to);
                    return;
                }

                // 主要是支持 nav 中的跳转
                if (action && to && action.target) {
                    window.open(to, action.target);
                    return;
                }

                if (/^https?:\/\//.test(to)) {
                    window.location.replace(to);
                } else {
                    FlowRouter.go(to);
                }
                },
                theme: 'antd',
            };

            const AmisRender = function (props) {
                let env = props.env;
                const schema = props.schema;
                const data = props.data;
                const name = props.name;
                if(props.pageType === 'form'){
                    env = Object.assign({
                        getModalContainer: ()=>{
                            return document.querySelector('.amis-scope');
                        }
                    }, env);
                }
                schema.scopeRef = (ref) => {
                    try {
                      if(!window.amisScopes){
                        window.amisScopes = {};
                      }
                      if(name){
                        window.amisScopes[name] = ref; 
                      }
                    } catch (error) {
                      console.error('error', error)
                    }
                    
                    return scoped = ref
                  }

                React.useEffect(()=>{
                    amisRequire('amis/embed').embed(`.steedos-amis-render-scope-${name}`,schema, {data, name, locale: getAmisLng()}, Object.assign({}, AmisEnv, env))
                  }, [])
                return React.createElement("div", {
                    className: "amis-scope"
                  }, React.createElement("div", {
                    className: `steedos-amis-render-scope-${name}`
                  }));
            };

            const initMonaco = ()=>{

                const { detect } = require('detect-browser');

                const browser = detect();

                // 低于86版的chrome 不支持code类型字段及功能
                if (browser && browser.name === 'chrome' && Number(browser.version.split(".")[0]) < 86) {
                    return Promise.resolve(true)
                }

                // 手机版暂不支持code类型字段.
                if(Meteor.isCordova){
                    return Promise.resolve(true)
                }else{
                    return Builder.initMonaco()
                }
            }
            //Amis SDK 中已清理了monaco, 所以这里需要提前注册,否则会导致amis code类型报错
            initMonaco().catch((err)=>{
                console.error(`Builder.initMonaco error: ${err}`);
            }).finally(()=>{
                const language = getAmisLng()
                axios.get(`/translations/amis/${language}.json`).then((res)=>{
                    amisRequire("amis").registerLocale(`${language}`, res.data)
                    Builder.registerComponent(AmisRender, {
                        name: 'Amis',
                        inputs: [
                            { name: 'schema', type: 'object' },
                            { name: 'data', type: 'object' },
                            { name: 'name', type: 'string' }
                        ]
                    });
                })
            });
        });
    // });

})();