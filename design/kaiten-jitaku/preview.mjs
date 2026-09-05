// ブラウザでそのまま開ける preview.html を作る。
//
//   node design/kaiten-jitaku/preview.mjs            → preview.html を書き出す
//   node design/kaiten-jitaku/preview.mjs --serve    → 書き出して http://localhost:8787 で配信
//
// kaiten-jitaku.html には <!doctype> も <head> も入っていない（公開時に付く）。
// ここで同じ骨組みを被せて、ローカルでも公開後と同じ見え方にする。
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "kaiten-jitaku.html");
const OUT = join(here, "preview.html");

// 公開時に付く <head>（Artifact のラッパと同じ内容）
const SHELL = (body) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:light dark}
body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
${body}
</body>
</html>
`;

function build() {
  const html = SHELL(readFileSync(SRC, "utf8"));
  writeFileSync(OUT, html);
  return html;
}

build();
console.log(`書き出しました: ${OUT}`);

if (process.argv.includes("--serve")) {
  const port = Number(process.env.PORT || 8787);
  createServer((req, res) => {
    // 保存するたび作り直すので、編集してリロードすればすぐ反映される
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(build());
  }).listen(port, () => console.log(`http://localhost:${port} で見られます（Ctrl+C で終了）`));
}
