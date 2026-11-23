// Gera um vídeo curto (cerca de 20 s) de um site rolando, para mandar ao negócio pelo WhatsApp.
// Uso: node _apoio/gera-video.js <url ou arquivo index.html> <saida.mp4> [desktop|celular] [segundos] [mouse]
// Sem o 5º argumento o vídeo sai só com a rolagem do site, sem seta de mouse (passe "mouse" para a seta voltar).
// Exemplo: node video/gera-video.js "https://exemplo.invalid/site/" "videos/whatsapp/papelaria.mp4" desktop 18
// Precisa do Chrome e do ffmpeg. Controla o Chrome pelo protocolo CDP (WebSocket do Node), sem instalar nada.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG || 'ffmpeg'; // precisa estar no PATH, ou aponte com a variável FFMPEG
const [, , alvo, saida, modo = 'desktop', segArg = '20', comMouse = ''] = process.argv;
const MOUSE = comMouse === 'mouse'; // padrão desde 23/11/2026: SEM seta de mouse, só a rolagem suave. Passe 'mouse' como 5º argumento para a seta voltar.
if (!alvo || !saida) { console.error('uso: node gera-video.js <url|index.html> <saida.mp4> [desktop|celular] [segundos]'); process.exit(1); }
const url = /^https?:|^file:/.test(alvo) ? alvo : 'file:///' + path.resolve(alvo).replace(/\\/g, '/');
const celular = modo === 'celular';
const W = celular ? 390 : 1280, H = celular ? 844 : 720, FPS = 30, TOTAL = Number(segArg) || 20;
const porta = 9300 + Math.floor(Math.random() * 500);
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'video-chrome-'));
const quadros = fs.mkdtempSync(path.join(os.tmpdir(), 'video-quadros-'));
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = cp.spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + porta, '--user-data-dir=' + perfil, '--window-size=' + W + ',' + H, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pend = new Map();
  try {
    let info;
    for (let i = 0; i < 50; i++) { try { info = await (await fetch('http://127.0.0.1:' + porta + '/json')).json(); if (info.length) break; } catch (e) {} await espera(200); }
    const pagina = info.find(t => t.type === 'page');
    ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { ok, no } = pend.get(m.id); pend.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result); } };
    const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; pend.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result.value; };

    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.setBypassCSP', { enabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: celular });
    if (celular) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await send('Page.navigate', { url });
    await espera(3500); // carrega e termina as animações de entrada

    // seta de mouse e efeito de clique, desenhados na própria página
    await ev(`(function(){
      var st=document.createElement('style'); st.textContent='html{scroll-behavior:auto!important}#__seta{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:30px;height:34px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}#__onda{position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid rgba(255,255,255,.95);background:rgba(80,160,255,.35);opacity:0}'+(${process.env.SEM_MOUSE?1:0}?'#__seta,#__onda{display:none!important}':''); document.head.appendChild(st);
      var o=document.createElement('div'); o.id='__onda'; document.body.appendChild(o);
      var s=document.createElement('div'); s.id='__seta'; s.innerHTML='<svg viewBox="0 0 24 28" width="30" height="34"><path d="M3 2l17 12.5-7.6 1.3 4.4 8.2-3.6 1.9-4.4-8.3L3 22z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'; document.body.appendChild(s);
    })()`);

    // esconde faixa de protótipo, botão "Voltar ao portfólio" e a frase de negócio fictício do rodapé (o vídeo vai para o cliente)
    await ev(`(function(){var st=document.createElement('style');st.textContent='.faixa-prototipo,.voltar-pf,.rodape-fim{display:none!important}header{top:0!important}';document.head.appendChild(st)})()`);
    if (!MOUSE) await ev("document.getElementById('__seta').style.display='none';document.getElementById('__onda').style.display='none'");
    // animações infinitas (faixa que corre, pulso do botão) seguem o relógio do VÍDEO, não o do computador; sem isso a captura lenta as deixa várias vezes mais rápidas
    await ev(`window.__inf=document.getAnimations().filter(function(x){try{return x.effect.getComputedTiming().iterations===Infinity}catch(e){return false}});window.__inf.forEach(function(x){x.pause()});window.__inf.length`);
    // aquece: rola tudo uma vez para disparar as animações de entrada baseadas em observador
    const maxScroll = await ev('document.documentElement.scrollHeight - innerHeight');
    for (let y = 0; y <= maxScroll; y += Math.max(200, H / 2)) { await ev('window.scrollTo(0,' + y + ')'); await espera(120); }
    await ev('window.scrollTo(0,0)'); await espera(500);

    // plano: seções, posição de rolagem e alvo do cursor em cada uma
    const plano = await ev(`(function(){
      var topo=document.querySelector('header'); var alt=topo?topo.getBoundingClientRect().height:0;
      var faixa=document.querySelector('.faixa-prototipo'); if(faixa&&getComputedStyle(faixa).position==='sticky') alt+=faixa.getBoundingClientRect().height;
      var max=document.documentElement.scrollHeight-innerHeight;
      var secs=Array.from(document.querySelectorAll('main > section, footer')).filter(function(s){return s.getBoundingClientRect().height>60;});
      return secs.map(function(s,i){
        var y=Math.max(0,Math.min(max,s.getBoundingClientRect().top+scrollY-alt-8));
        var alvo=s.querySelector('a.botao, a.link-forte, .botao, a[href^="http"], button, li, h2');
        var r=alvo?alvo.getBoundingClientRect():null;
        var ty=r?r.top+scrollY:null;
        return {y:y, id:s.id||('s'+i), tx:r?r.left+Math.min(r.width/2,90):innerWidth*0.65, ty:ty, botao:!!(alvo&&/botao|link-forte/.test(alvo.className))};
      });
    })()`);
    // monta os quadros-chave
    const n = plano.length;
    const dur = { intro: 2.4, mov: Number(process.env.MOV) || 1.5, fim: 2.0 }; // MOV=1.0 deixa o vídeo mais curto (ex.: 15 s com 8 seções)
    const resto = TOTAL - dur.intro - dur.fim - (n - 1) * dur.mov;
    const dwell = Math.max(0.5, resto / Math.max(1, n - 1));
    const kf = []; let t = 0;
    const vy = (p) => p.ty == null ? H * 0.55 : Math.max(60, Math.min(H - 80, p.ty - p.y));
    kf.push({ t: 0, y: 0, x: W * 0.8, cy: H * 0.85 });
    const p0 = plano[0]; const primeiroBotao = await ev(`(function(){var b=document.querySelector('.hero a.botao, .hero .botao, main a.botao');if(!b)return null;var r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    const hx = primeiroBotao ? primeiroBotao.x : W * 0.3, hy = primeiroBotao ? primeiroBotao.y : H * 0.6;
    kf.push({ t: 1.5, y: 0, x: hx, cy: hy });
    kf.push({ t: dur.intro, y: 0, x: hx, cy: hy, clique: true });
    t = dur.intro;
    for (let i = 1; i < n; i++) {
      const p = plano[i];
      t += 0.15; kf.push({ t, y: plano[i - 1].y, x: kf[kf.length - 1].x, cy: kf[kf.length - 1].cy });
      t += dur.mov; kf.push({ t, y: p.y, x: Math.min(W - 40, Math.max(40, p.tx)), cy: vy(p), ultimo: i === n - 1 });
      t += dwell; kf.push({ t, y: p.y, x: Math.min(W - 40, Math.max(40, p.tx)) + 14, cy: vy(p) + 10, clique: p.botao && i === n - 1 });
    }
    kf.push({ t: t + 0.4, y: kf[kf.length - 1].y, x: kf[kf.length - 1].x, cy: kf[kf.length - 1].cy });
    const fim = kf[kf.length - 1].t;
    const ease = x => x * x * x * (x * (x * 6 - 15) + 10); // arranca e freia devagar (suave de verdade)
    const easeSeta = x => 1 - Math.pow(1 - x, 2.4) * (1 - 0.0) ; // seta: sai rápido e assenta devagar, como a mão
    const estado = (tt) => {
      let a = kf[0], b = kf[kf.length - 1];
      for (let i = 0; i < kf.length - 1; i++) if (tt >= kf[i].t && tt <= kf[i + 1].t) { a = kf[i]; b = kf[i + 1]; break; }
      const k = b.t === a.t ? 1 : ease(Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t))));
      const u = b.t === a.t ? 1 : Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t)));
      const ks = easeSeta(u) * 0.6 + k * 0.4;
      const dx = b.x - a.x, dy = b.cy - a.cy, dist = Math.hypot(dx, dy);
      // trajeto curvo: o ponto de controle foge um pouco da reta, e o lado alterna a cada trecho
      const lado = (kf.indexOf(a) % 2 ? -1 : 1) * Math.min(dist * 0.18, 90);
      const cx = (a.x + b.x) / 2 - dy / (dist || 1) * lado, cyy = (a.cy + b.cy) / 2 + dx / (dist || 1) * lado;
      const qx = (1 - ks) * (1 - ks) * a.x + 2 * (1 - ks) * ks * cx + ks * ks * b.x;
      const qy = (1 - ks) * (1 - ks) * a.cy + 2 * (1 - ks) * ks * cyy + ks * ks * b.cy;
      // tremor leve de mão (some quando a seta está parada, aparece em movimento)
      const mov = dist > 2 ? Math.sin(Math.PI * u) : 0.3;
      const tx = (Math.sin(tt * 7.3) + Math.sin(tt * 12.1 + 1)) * 0.9 * mov, ty = (Math.sin(tt * 8.7 + 2) + Math.sin(tt * 11.3)) * 0.9 * mov;
      return { y: a.y + (b.y - a.y) * k, x: qx + tx, cy: qy + ty };
    };
    const cliques = kf.filter(k => k.clique).map(k => k.t);
    const total = Math.ceil(fim * FPS);
    console.log('seções:', n, '| duração:', fim.toFixed(1) + 's', '| quadros:', total);
    for (let f = 0; f < total; f++) {
      const tt = f / FPS, s = estado(tt);
      let onda = 0, escala = 0.4;
      for (const c of cliques) { const d = tt - c; if (d >= 0 && d <= 0.55) { onda = 1 - d / 0.55; escala = 0.4 + 1.1 * (d / 0.55); } }
      const aperta = cliques.some(c => tt - c >= 0 && tt - c < 0.12) ? 0.88 : 1;
      await ev(`(window.__inf||[]).forEach(function(x){x.currentTime=${(tt*1000).toFixed(0)}});window.scrollTo(0,${s.y.toFixed(1)});var a=document.getElementById('__seta'),o=document.getElementById('__onda');a.style.transform='translate(${s.x.toFixed(1)}px,${s.cy.toFixed(1)}px) scale(${aperta})';o.style.transform='translate(${s.x.toFixed(1)}px,${s.cy.toFixed(1)}px) scale(${escala})';o.style.opacity='${onda.toFixed(2)}'`);
      await espera(25);
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      fs.writeFileSync(path.join(quadros, 'q' + String(f).padStart(5, '0') + '.jpg'), Buffer.from(r.data, 'base64'));
    }
    fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
    const r = cp.spawnSync(FFMPEG, ['-v', 'error', '-framerate', String(FPS), '-i', path.join(quadros, 'q%05d.jpg'), '-vf', 'scale=' + W + ':' + H + ':flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-movflags', '+faststart', '-y', path.resolve(saida)]);
    if (r.status !== 0) console.error(String(r.stderr));
    console.log('vídeo:', path.resolve(saida));
  } finally {
    try { ws && ws.close(); } catch (e) {}
    chrome.kill();
    setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); fs.rmSync(quadros, { recursive: true, force: true }); } catch (e) {} process.exit(0); }, 1500);
  }
})().catch(e => { console.error('erro:', e.message); process.exit(1); });
