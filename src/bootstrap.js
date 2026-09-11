// ES5 on purpose: report initialization errors even when a newer script cannot parse.
(function(){
 var started=false,timer;
 function showError(message,force){
  if(started&&!force)return;
  var panel=document.getElementById('error'),loading=document.getElementById('loading');
  if(!panel)return;loading.style.display='none';panel.style.display='block';panel.setAttribute('role','alert');panel.textContent='';
  var title=document.createElement('h2');title.textContent='暂时无法进入沙盘';panel.appendChild(title);
  var detail=document.createElement('p');detail.textContent=message||'请尝试流畅模式，或使用支持 WebGL 的浏览器重新打开。';panel.appendChild(detail);
  var retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=function(){location.reload();};panel.appendChild(retry);
  var eco=document.createElement('button');eco.textContent='尝试流畅模式';eco.onclick=function(){var next=location.href.split('#')[0];next=next.replace(/([?&])quality=[^&]*/g,'$1').replace(/[?&]$/,'');location.href=next+(next.indexOf('?')<0?'?':'&')+'quality=eco';};panel.appendChild(eco);
 }
 window.__boot={ready:function(){started=true;clearTimeout(timer);},fail:showError};
 window.addEventListener('error',function(e){if(!started)showError('浏览器未能启动三维画面。'+(e.message?'（'+e.message+'）':''));});
 timer=setTimeout(function(){showError('启动耗时较长。可以选择流畅模式重试；若仍无法进入，请在 Chrome 或 Safari 中打开。');},30000);
})();
