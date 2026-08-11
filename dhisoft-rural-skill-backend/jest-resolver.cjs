const fs=require('node:fs');module.exports=(request,options)=>{if(fs.existsSync(request))return request;return options.defaultResolver(request,options)};
