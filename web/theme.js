// Runs before stylesheets to apply the stored/browser preference before paint.
(()=>{
 'use strict';
 const key='gleiswerk.theme.v1',choices=['system','light','dark'];
 const media=window.matchMedia('(prefers-color-scheme: dark)');
 let preference='system';
 try{const value=localStorage.getItem(key);if(choices.includes(value))preference=value;}catch{}
 function apply(){
  const theme=preference==='system'?(media.matches?'dark':'light'):preference;
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.themePreference=preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#17271f':'#164c43');
  const select=document.getElementById('theme-select');if(select)select.value=preference;
 }
 apply();
 const onSystemChange=()=>{if(preference==='system')apply();};
 if(media.addEventListener)media.addEventListener('change',onSystemChange);else media.addListener?.(onSystemChange);
 window.addEventListener('storage',event=>{
  if(event.key===key||event.key===null){preference=choices.includes(event.newValue)?event.newValue:'system';apply();}
 });
 function setup(){
  const select=document.getElementById('theme-select');if(!select)return;
  select.value=preference;
  select.addEventListener('change',()=>{
   preference=choices.includes(select.value)?select.value:'system';
   try{localStorage.setItem(key,preference);}catch{}
   apply();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
