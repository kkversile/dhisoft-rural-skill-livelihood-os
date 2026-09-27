const fs=require('node:fs');module.exports=(request,options)=>{if(fs.existsSync(request)&&fs.statSync(request).isFile())return request;return options.defaultResolver(request,options)};
