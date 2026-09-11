const fs=require('fs'),path=require('path');
const root=__dirname,src=path.join(root,'src');
let html=fs.readFileSync(path.join(src,'shell.html'),'utf8');
for(const [marker,file]of Object.entries({BOOTSTRAP:'bootstrap.js',THREE:'three.r160.min.js',CORE:'core.js',ARCHITECTURE:'architecture.js',MACHINERY:'machinery.js',WORKERS:'workers.js',CONTROLS:'controls.js',MAIN:'main.js'})){
 const js=fs.readFileSync(path.join(src,file),'utf8').replace(/<\/script/gi,'<\\/script');
 if(!html.includes(`<!--${marker}-->`))throw new Error(`Missing ${marker} build marker`);
 html=html.replace(`<!--${marker}-->`,()=>`<script>\n${js}\n</script>`);
}
fs.writeFileSync(path.join(root,'筑造之间-体素工地沙盘.html'),html,'utf8');
fs.writeFileSync(path.join(root,'index.html'),html,'utf8');
console.log('Built standalone HTML:',Buffer.byteLength(html),'bytes');
