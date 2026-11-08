import {search} from './engine.mjs';
self.onmessage=async({data})=>{try{const result=await search(data.inventory,data.options,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',...result});}catch(error){self.postMessage({type:'error',message:error.message||'Die Suche ist fehlgeschlagen.'});}};
