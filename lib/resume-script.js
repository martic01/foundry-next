// Runs in the page <head> as a plain script (see app/layout.jsx).
export const RESUME_SCRIPT = `(function(){try{
window.addEventListener('pageshow',function(e){if(e.persisted){location.reload();}});
window.addEventListener('load',function(){setTimeout(function(){
try{
var empty=!document.body||document.body.innerText.replace(/\\s+/g,'').length===0;
if(!empty)return;
var k='foundry-blank-reload',last=Number(sessionStorage.getItem(k)||0);
if(Date.now()-last<120000)return;
sessionStorage.setItem(k,String(Date.now()));
location.reload();
}catch(_){}
},6000);});
}catch(_){}})();`;
