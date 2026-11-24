// Servidor local, só para olhar os protótipos que estão no PC (ainda não publicados).
// Escuta apenas em localhost (ninguém de fora da sua máquina acessa) e só entrega as pastas de sites listadas abaixo.
// Para ligar: node servidor/servidor-local.js (no Windows, um .bat com essa linha serve). Para desligar: feche a janela.

const http = require("http");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const PORTA = 5170;
const RAIZ = path.resolve(__dirname, ".."); // raiz do repositório
const PERMITIDAS = ["prototipos"]; // só estas pastas são entregues; coloque aqui os protótipos que ainda não foram publicados
const BLOQUEADAS = /\.(env|vars|toml|log|sql|bak|zip|mp4|mov|pem|key)$/i;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

function responde(res, codigo, texto) {
  res.writeHead(codigo, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(texto);
}

http.createServer(function (req, res) {
  const host = (req.headers.host || "").split(":")[0];
  if (host !== "localhost" && host !== "127.0.0.1") return responde(res, 403, "Só localhost.");
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname); } catch (e) { return responde(res, 400, "Endereço inválido."); }
  const partes = rel.split("/").filter(Boolean);
  if (partes.some(function (p) { return p.startsWith(".") || p === "node_modules" || p === ".."; })) return responde(res, 403, "Bloqueado.");
  // vídeos de demonstração para o WhatsApp (videos/whatsapp/<nome>.mp4)
  if ((partes[0] === "ver-video" || partes[0] === "abrir-pasta") && partes.length === 2) {
    const nome = partes[1];
    const arq = path.join(RAIZ, "videos", "whatsapp", nome + ".mp4");
    if (!/^[a-z0-9-]+$/.test(nome) || !fs.existsSync(arq)) return responde(res, 404, "Não achei esse vídeo em videos/whatsapp.");
    if (partes[0] === "ver-video") {
      res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": fs.statSync(arq).size, "Cache-Control": "no-store" });
      return fs.createReadStream(arq).pipe(res);
    }
    // abre o Explorador de Arquivos já com o vídeo selecionado: é só Ctrl+C e Ctrl+V no WhatsApp
    if (partes[0] === "abrir-pasta") {
      cp.spawn("explorer.exe", ["/select,\"" + arq + "\""], { windowsVerbatimArguments: true, detached: true, stdio: "ignore" }).unref();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end("<!doctype html><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Explorer aberto</title><body style=\"font:22px system-ui;display:grid;place-items:center;height:90vh;text-align:center\"><div><b>Explorer aberto com o vídeo selecionado.</b><br>Aperte Ctrl+C lá, feche esta aba e cole (Ctrl+V) no WhatsApp.</div><script>setTimeout(function(){window.close();},400);</script>");
    }
    return responde(res, 404, "Rota desconhecida.");
  }
  const relNorm = partes.join("/");
  if (!PERMITIDAS.some(function (p) { return relNorm === p || relNorm.startsWith(p + "/"); })) return responde(res, 404, "Pasta não liberada.");
  let alvo = path.resolve(RAIZ, relNorm);
  if (!alvo.startsWith(RAIZ + path.sep)) return responde(res, 403, "Bloqueado.");
  fs.stat(alvo, function (erro, st) {
    if (!erro && st.isDirectory()) { alvo = path.join(alvo, "index.html"); }
    if (BLOQUEADAS.test(alvo)) return responde(res, 403, "Tipo de arquivo bloqueado.");
    fs.readFile(alvo, function (e2, dados) {
      if (e2) return responde(res, 404, "Não achei esse arquivo.");
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
      res.end(dados);
    });
  });
}).listen(PORTA, "127.0.0.1", function () {
  console.log("Sites do PC ligados em http://localhost:" + PORTA + "/prototipos/");
  console.log("Deixe esta janela aberta. Para desligar, feche-a.");
});
