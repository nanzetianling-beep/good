// Header scroll + transparent over hero
const header = document.getElementById('header');
const floatCta = document.getElementById('floatCta');
const heroEl = document.getElementById('top');
function updateHeader() {
  const y = window.scrollY;
  const heroH = heroEl ? heroEl.offsetHeight : window.innerHeight;
  header.classList.toggle('scrolled', y > 40);
  header.classList.toggle('is-top', y < heroH - 80);
  if (floatCta) floatCta.classList.toggle('show', y > window.innerHeight * 0.6);
}
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

// ヘッダーの余白部分をクリックでトップページへ戻る
if (header) {
  header.addEventListener('click', (e) => {
    // ロゴ・ナビ・ボタン・各種リンク上のクリックは本来の動作を優先
    if (e.target.closest('.logo, .mobile-nav-panel, .nav-toggle, a, button')) return;
    const p = location.pathname;
    const onIndex = p === '/' || p.endsWith('/') || /index\.html?$/i.test(p);
    if (onIndex) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      location.href = 'index.html#top';
    }
  });
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mobileNavPanel = document.getElementById('mobileNavPanel');
if (navToggle && mobileNavPanel) {
  function closeNav() {
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  navToggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mobileNavPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  document.addEventListener('click', e => {
    if (header.classList.contains('nav-open') && !header.contains(e.target)) closeNav();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 640) closeNav(); });
}


// Fade on scroll
const obs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const siblings = [...entry.target.parentElement.querySelectorAll('.fade:not(.in)')];
    const idx = siblings.indexOf(entry.target);
    setTimeout(() => entry.target.classList.add('in'), Math.min(idx, 5) * 110);
    obs.unobserve(entry.target);
  });
}, { threshold: 0.07, rootMargin: '0px 0px -28px 0px' });
document.querySelectorAll('.fade').forEach(el => obs.observe(el));

// Hero stagger
document.querySelectorAll('.fade-hero').forEach((el, i) => {
  setTimeout(() => el.classList.add('in'), 400 + i * 160);
});


// Hero carousel (節目カレンダー／今月のお知らせ)
(function () {
  const track = document.getElementById('heroTrack');
  const dotsWrap = document.getElementById('heroDots');
  if (!track || !dotsWrap) return;
  const slides = [...track.querySelectorAll('.hero-carousel__slide')];
  const dots = [...dotsWrap.querySelectorAll('.hero-carousel__dot')];
  let active = 0;

  function render() {
    const slideBox = slides[0].getBoundingClientRect();
    const trackStyle = getComputedStyle(track);
    const gap = parseFloat(trackStyle.gap) || 0;
    const padLeft = parseFloat(trackStyle.paddingLeft) || 0;
    const step = slideBox.width + gap;
    const viewportWidth = track.parentElement.getBoundingClientRect().width;
    const desiredLeft = (viewportWidth - slideBox.width) / 2;
    const naturalLeft = padLeft + active * step;
    track.style.transform = `translateX(${desiredLeft - naturalLeft}px)`;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === active));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
  }

  function goTo(i) {
    active = (i + slides.length) % slides.length;
    render();
  }

  slides.forEach((slide, i) => {
    slide.addEventListener('click', (e) => {
      if (i !== active) {
        e.preventDefault();
        goTo(i);
      }
    });
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  window.addEventListener('resize', render);
  render();

  let autoplay = setInterval(() => goTo(active + 1), 6000);
  track.closest('.hero-carousel').addEventListener('mouseenter', () => clearInterval(autoplay));
  track.closest('.hero-carousel').addEventListener('mouseleave', () => {
    autoplay = setInterval(() => goTo(active + 1), 6000);
  });
})();

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 68, behavior: 'smooth' });
  });
});

// ===== CALENDAR =====
(function () {
  const calDays = document.getElementById('calDays');
  if (!calDays) return;

  // 月ごとのイベント設計（顧客向けコピー）
  //   theme  … その月のフェアタイトル
  //   sub    … 節目の名称（新年・バレンタインなど）
  //   lead   … 短い導入コピー
  //   body   … 内容の説明
  //   perk   … 特典・仕掛け（無料サービスや催しなど）
  //   bridal … 指輪・ペアへの導線（任意）
  const CAL_THEMES = {
    1:  { theme: '「今年を変える一本」フェア',       sub: '新年・人生リスタート',
          lead: '<span class="np">新しい一年を、</span><span class="np">時計とともに始める。</span>',
          body: '<span class="np">今年の目標や</span><span class="np">これからの歩みを</span><span class="np">うかがいながら、</span><br><span class="np">節目にふさわしい</span><span class="np">一本をご提案します。</span>',
          perk: '<span class="np">未来年表シート作成</span><span class="np">（無料）</span>', bridal: '' },
    2:  { theme: '「チョコじゃなく、残るものを。」', sub: 'バレンタイン',
          lead: '<span class="np">甘いものより、</span><span class="np">ずっと残る贈り物を。</span>',
          body: '<span class="np">大切な男性へ贈る</span><span class="np">一本や、</span><br><span class="np">ふたりで重ねる</span><span class="np">ペアウォッチを</span><span class="np">ご用意しています。</span>',
          perk: '<span class="np">ペアウォッチ</span><span class="np">ご相談承ります</span>', bridal: '<span class="np">ご一緒のご来店で、</span><span class="np">指輪のご相談も。</span>' },
    3:  { theme: '「社会人になる君へ」フェア',       sub: '卒業・就職',
          lead: '<span class="np">巣立つ日に、</span><span class="np">はじめての本格時計を。</span>',
          body: '<span class="np">親から子へ贈る、</span><span class="np">一生ものの一本。</span><br><span class="np">新しい門出に</span><span class="np">そっと寄り添います。</span>',
          perk: '<span class="np">お名前などの</span><span class="np">メッセージ刻印</span><span class="np">（無料・要相談）</span>', bridal: '' },
    4:  { theme: '「新しい時間を刻む」フェア',       sub: '新生活',
          lead: '<span class="np">環境が変わる季節に、</span><span class="np">気持ちも新たに。</span>',
          body: '<span class="np">転職・引越し・</span><span class="np">新生活のはじまりに、</span><br><span class="np">心機一転の一本をどうぞ。</span>',
          perk: '<span class="np">新生活スタート</span><span class="np">応援特典</span>', bridal: '' },
    5:  { theme: '「ありがとうを、形に。」',         sub: '母の日・GW',
          lead: '<span class="np">いつもの感謝を、</span><span class="np">かたちにして伝える。</span>',
          body: '<span class="np">お母さまへ贈る時計を、</span><br><span class="np">ご家族そろって</span><span class="np">お選びいただけます。</span>',
          perk: '<span class="np">期間中、</span><span class="np">駐車場に</span><span class="np">キッチンカーが登場</span>', bridal: '' },
    6:  { theme: '「背中を見てきた時間に。」',       sub: '父の日',
          lead: '<span class="np">お父さんへ、</span><span class="np">感謝を込めた一本を。</span>',
          body: '<span class="np">日ごろは照れくさい</span><span class="np">「ありがとう」を、</span><br><span class="np">時計に託して。</span><span class="np">上質な一本も</span><span class="np">そろえています。</span>',
          perk: '<span class="np">抽選会開催</span><span class="np">（一等は</span><span class="np">高級ウイスキーなど）</span>', bridal: '' },
    7:  { theme: '「自分に、一本。」',               sub: 'ボーナス',
          lead: '<span class="np">がんばった自分への、</span><span class="np">ご褒美に。</span>',
          body: '<span class="np">仕事の節目に、</span><span class="np">長く付き合える一本を。</span><br><span class="np">選ぶ時間そのものも</span><span class="np">お楽しみください。</span>',
          perk: '<span class="np">夏のボーナスフェア</span>', bridal: '<span class="np">ふたりでそろえる</span><span class="np">ペアウォッチも人気です。</span>' },
    8:  { theme: '「家族で刻む時間」フェア',         sub: '帰省・家族',
          lead: '<span class="np">家族が集まる夏に、</span><span class="np">思い出をひとつ。</span>',
          body: '<span class="np">親子三世代で</span><span class="np">お選びいただける、</span><br><span class="np">世代を超えた</span><span class="np">一本をご提案します。</span>',
          perk: '<span class="np">ご家族写真プレゼント</span>', bridal: '' },
    9:  { theme: '「これまでの時間に、敬意を。」',   sub: '敬老の日',
          lead: '<span class="np">長い年月への感謝を、</span><span class="np">贈り物に。</span>',
          body: '<span class="np">祖父母へ贈る時計を、</span><br><span class="np">ご家族みなさまで</span><span class="np">お選びください。</span>',
          perk: '<span class="np">敬老の日ギフト</span><span class="np">承ります</span>', bridal: '' },
    10: { theme: '「その日のために。」',             sub: 'プロポーズ準備',
          lead: '<span class="np">大切な決意を、</span><span class="np">そっと形に。</span>',
          body: '<span class="np">プロポーズを控えた方へ。</span><br><span class="np">時計と指輪、</span><span class="np">両方のご相談を承ります。</span>',
          perk: '<span class="np">プロポーズ相談</span><span class="np">（無料）</span>', bridal: '<span class="np">指輪も一緒に</span><span class="np">ご覧いただけます。</span>' },
    11: { theme: '「ふたりの時間を、これからも。」', sub: 'いい夫婦の日',
          lead: '<span class="np">夫婦で重ねる時間に、</span><span class="np">おそろいの一本を。</span>',
          body: '<span class="np">一年でもっとも</span><span class="np">ペアウォッチが</span><span class="np">似合う季節。</span><br><span class="np">これからの毎日を、</span><span class="np">そろえて。</span>',
          perk: '<span class="np">ペアウォッチ特典あり</span>', bridal: '<span class="np">ご結婚指輪の</span><span class="np">ご相談も承ります。</span>' },
    12: { theme: '「その夜を、一生の記憶に。」',     sub: 'クリスマス',
          lead: '<span class="np">特別な夜に、</span><span class="np">ずっと残る贈り物を。</span>',
          body: '<span class="np">一年でいちばんの</span><span class="np">ギフトシーズン。</span><br><span class="np">プロポーズにも</span><span class="np">寄り添います。</span>',
          perk: '<span class="np">クリスマス限定</span><span class="np">パッケージ・</span><span class="np">即日対応</span>', bridal: '<span class="np">プロポーズリングの</span><span class="np">ご相談も。</span>' }
  };

  // fixed-date events: { m, d, tag, label, desc }
  const CAL_FIXED = [
    { m: 1,  d: 1,  tag: 'milestone', label: '元旦・お正月',           desc: '一年の始まりに、これからの時間を刻む一本を。' },
    { m: 2,  d: 14, tag: 'couple',    label: 'バレンタインデー',       desc: '甘いものより長く残る贈り物を大切な人へ。' },
    { m: 3,  d: 1,  tag: 'milestone', label: '卒業・就職祝いシーズン', desc: '巣立つ日に贈る、はじめての本格時計。' },
    { m: 3,  d: 14, tag: 'couple',    label: 'ホワイトデー',           desc: 'お返しには形に残るものを選んでみませんか。' },
    { m: 4,  d: 1,  tag: 'milestone', label: '入学・入社式シーズン',   desc: '新しい毎日を確かな時間とともに始める。' },
    { m: 5,  d: 5,  tag: 'family',    label: 'こどもの日',             desc: '成長の節目に家族の記念を残す一日。' },
    { m: 6,  d: 1,  tag: 'jewelry',   label: '真珠の日',               desc: '真珠の輝きを日常のよそおいに添えて。' },
    { m: 6,  d: 10, tag: 'watch',     label: '時計の日',               desc: '電池交換や点検は、この日を目安にどうぞ。' },
    { m: 6,  d: 15, tag: 'ring',      label: 'ジューンブライド',       desc: '六月の花嫁へ、時間を重ねる指輪と時計を。' },
    { m: 7,  d: 1,  tag: 'milestone', label: 'ボーナスシーズン',       desc: 'がんばった自分に長く使える一本を。' },
    { m: 7,  d: 7,  tag: 'couple',    label: '七夕',                   desc: '年に一度の夜にふたりの時間を贈り合う。' },
    { m: 8,  d: 11, tag: 'family',    label: '山の日',                 desc: '休みの日こそ家族そろって出かけたい。' },
    { m: 8,  d: 13, tag: 'family',    label: 'お盆・帰省シーズン',     desc: '久しぶりに会う家族へ感謝を形にして。' },
    { m: 9,  d: 15, tag: 'family',    label: '中秋の名月・十五夜',     desc: '月を見上げながらこれまでの時間を思う夜。' },
    { m: 9,  d: 23, tag: 'spouse',    label: '秋分の日・夫婦の日',     desc: 'ふたりで過ごしてきた年月を確かめる日。' },
    { m: 10, d: 1,  tag: 'ring',      label: 'プロポーズシーズン到来', desc: 'その一言を決めたら指輪と時計の相談へ。' },
    { m: 11, d: 15, tag: 'family',    label: '七五三',                 desc: '子どもの節目を写真と記念品に残す。' },
    { m: 11, d: 22, tag: 'spouse',    label: 'いい夫婦の日',           desc: 'ペアウォッチでこれからの時間もそろえて。' },
    { m: 12, d: 1,  tag: 'ring',      label: 'プロポーズ・婚約シーズン', desc: '年内に伝えたい想いは早めのご相談から。' },
    { m: 12, d: 22, tag: 'spouse',    label: '冬至・夫婦の日',         desc: '一年でいちばん長い夜をふたりで過ごす。' },
    { m: 12, d: 24, tag: 'couple',    label: 'クリスマス',             desc: '特別な夜にずっと残るものを贈る。' }
  ];

  // nth-weekday events: { m, weekday(0=Sun..6=Sat), nth, tag, label, desc }
  const CAL_NTH = [
    { m: 1,  weekday: 1, nth: 2, tag: 'milestone', label: '成人の日', desc: '大人としての一歩を腕元から始める日。' },
    { m: 5,  weekday: 0, nth: 2, tag: 'family',     label: '母の日',   desc: '花と一緒に母の時間へ寄り添う贈り物を。' },
    { m: 6,  weekday: 0, nth: 3, tag: 'family',     label: '父の日',   desc: '背中を見てきた時間に感謝を込めて。' },
    { m: 9,  weekday: 1, nth: 3, tag: 'family',     label: '敬老の日', desc: 'これまでの年月に敬意を込めた贈り物を。' },
    { m: 11, weekday: 0, nth: 3, tag: 'family',     label: '家族の日', desc: '家族そろって時間の大切さを話す日。' }
  ];

  const TAG_LABEL = {
    milestone: '節目', spouse: '夫婦', couple: 'カップル',
    family: '家族', jewelry: '宝石', watch: '時計', ring: '指輪'
  };

  const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'];

  function nthWeekdayDate(year, month, weekday, nth) {
    const first = new Date(year, month - 1, 1);
    const offset = (7 + weekday - first.getDay()) % 7;
    return 1 + offset + (nth - 1) * 7;
  }

  function getMonthEvents(year, month) {
    const events = {};
    function add(day, tag, label, desc) {
      if (!events[day]) events[day] = [];
      events[day].push({ tag, label, desc });
    }
    CAL_FIXED.filter(e => e.m === month).forEach(e => add(e.d, e.tag, e.label, e.desc));
    CAL_NTH.filter(e => e.m === month).forEach(e => {
      const day = nthWeekdayDate(year, month, e.weekday, e.nth);
      add(day, e.tag, e.label, e.desc);
    });
    if (!events[22]) add(22, 'spouse', '夫婦の日', '毎月22日はふたりの時間を見直す日に。');
    return events;
  }

  const calNav = document.getElementById('calNav');
  const calView = document.getElementById('calView');
  const calYear = document.getElementById('calYear');
  const calMonthNum = document.getElementById('calMonthNum');
  const calSub = document.getElementById('calSub');
  const calTheme = document.getElementById('calTheme');
  const calLead = document.getElementById('calLead');
  const calBody = document.getElementById('calBody');
  const calPerk = document.getElementById('calPerk');
  const calBridal = document.getElementById('calBridal');
  const calHeroImg = document.getElementById('calHeroImg');

  function renderMonth(month) {
    const now = new Date();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    const events = getMonthEvents(year, month);

    const isCurrentMonth = now.getMonth() + 1 === month;

    calDays.innerHTML = '';
    Object.keys(events)
      .map(Number)
      .filter(d => d <= daysInMonth)
      .sort((a, b) => a - b)
      .forEach(d => {
        const dow = new Date(year, month - 1, d).getDay();
        const cell = document.createElement('article');
        cell.className = 'cal-day' + (dow === 0 ? ' is-sun' : dow === 6 ? ' is-sat' : '') +
          (isCurrentMonth && d === now.getDate() ? ' is-today' : '');

        const head = document.createElement('div');
        head.className = 'cal-day__head';
        const num = document.createElement('span');
        num.className = 'cal-day__num';
        num.textContent = d;
        const dowEl = document.createElement('span');
        dowEl.className = 'cal-day__dow';
        dowEl.textContent = DOW_JP[dow];
        head.appendChild(num);
        head.appendChild(dowEl);
        cell.appendChild(head);

        const wrap = document.createElement('div');
        wrap.className = 'cal-day__events';
        events[d].forEach(ev => {
          const item = document.createElement('div');
          const tag = document.createElement('span');
          tag.className = 'cal-day__tag';
          tag.textContent = TAG_LABEL[ev.tag] || '';
          const title = document.createElement('h4');
          title.className = 'cal-day__title';
          title.textContent = ev.label;
          const desc = document.createElement('p');
          desc.className = 'cal-day__desc';
          desc.textContent = ev.desc || '';
          item.appendChild(tag);
          item.appendChild(title);
          item.appendChild(desc);
          wrap.appendChild(item);
        });
        cell.appendChild(wrap);

        calDays.appendChild(cell);
      });

    calYear.textContent = year;
    calMonthNum.textContent = String(month).padStart(2, '0');

    const t = CAL_THEMES[month];
    calSub.textContent = t.sub;
    calTheme.textContent = t.theme;
    calLead.innerHTML = t.lead;
    calBody.innerHTML = t.body;
    calPerk.innerHTML = t.perk;
    calBridal.innerHTML = t.bridal;
    calBridal.hidden = !t.bridal;
    if (calHeroImg) {
      calHeroImg.src = 'images/calendar/' + String(month).padStart(2, '0') + '.jpg';
      calHeroImg.alt = t.sub + '｜' + t.theme;
    }

    calNav.querySelectorAll('.cal-nav__btn').forEach(btn => {
      const active = Number(btn.dataset.month) === month;
      btn.classList.toggle('is-active', active);
      if (active) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  calNav.querySelectorAll('.cal-nav__btn').forEach(btn => {
    btn.addEventListener('click', () => renderMonth(Number(btn.dataset.month)));
  });

  renderMonth(new Date().getMonth() + 1);
})();

// ===== 商品データ・商品一覧・商品詳細 =====
/*
  ▼ このブロックが「新作時計のお知らせ（商品一覧）」と「商品詳細ページ」の元データです。
    watches.html は一覧、product.html?id=◯◯ は個別詳細を、下の PRODUCTS から自動生成します。

  ■ 商品を追加・変更するとき
    PRODUCTS 配列に商品を1件追加/編集するだけで、一覧・詳細の両方に反映されます。

  データは g-takeuchi.com/lp-watch の掲載商品（セイコー正規取扱ラインナップ）から引用しています。

  ■ 各項目の意味
    id     … 詳細ページのURLに使う文字列（product.html?id=これ）。重複しない値にする。
    brand  … ブランド名（プロスペックス／アストロン／プレザージュ／キングセイコー）
    badge  … 「新作」「限定」「７月発売」などの区分。無ければ ''
    ref    … 品番（型番）
    price  … 価格（税込・表示用）
    photo  … 商品写真のURL。g-takeuchi.com の画像を参照しています。
    lead   … 詳細ページに出るブランド共通の短い紹介文
    stores … 省略可。指定すると、その商品だけ取扱店舗を個別に上書きできる。
             通常は省略し、下の BRAND_STORES（ブランド単位の取扱店）から自動で決まる。

  ■ 取扱店舗の考え方
    店舗ごとに扱うブランドが異なるため、「そのブランドを扱う店＝その商品の取扱店」として
    下の STORE_BRANDS（店舗別の取扱ブランド）で一括管理する。商品を追加しても取扱店の指定は不要。
    ある品番だけ取扱店が違う場合のみ、その商品に stores: ['elpa', ...] を書いて上書きする。
*/

/* =========================================================
   店舗別の取扱ブランド（サイト共通の単一情報源 / source of truth）
   ---------------------------------------------------------
   各店の公式ページ（watch_info / watch-collection）の掲載ブランドに基づく。
   ここを直すと、以下の両方へ自動で反映される：
     (1) index.html #brands の店舗別ブランドタブ（絞り込み表示）
     (2) product.html の商品詳細「この商品の取り扱い店舗」
         ＝ 来店予約・お問い合わせの送信先店舗
   ラベル表記は index.html のロゴ画像の alt（またはセルの表示テキスト）と一致させること。
   ========================================================= */
const STORE_BRANDS = {
  kanazawa: ['PROSPEX', 'KING SEIKO', 'ASTRON', 'PRESAGE', 'LONGINES', 'TISSOT', 'RAYMOND WEIL', 'G-SHOCK', 'OCEANUS', 'ORIENT STAR'],
  kaihatsu: ['Grand Seiko', 'PROSPEX', 'KING SEIKO', 'ASTRON', 'PRESAGE', 'CAMPANOLA', 'CUERVO Y SOBRINOS', 'PEQUIGNET', 'ORIS', 'TOM FORD', 'TISSOT'],
  elpa:     ['Grand Seiko', 'KING SEIKO', 'ASTRON', 'PROSPEX', 'PRESAGE', 'SEIKO 5 SPORTS', 'SERIES 8', 'OCEANUS', 'DOLCE&EXCELINE', 'LUKIA', 'xC', 'wicca', 'EXCEED', 'ATTESA', 'CITIZEN L', 'ORIENT', 'ORIENT STAR', 'G-SHOCK', 'BABY-G', 'PROTREK', 'EDOX', 'TISSOT', 'Luminox'],
  bell:     ['PROSPEX', 'ASTRON', 'PRESAGE', 'SEIKO 5 SPORTS', 'LUKIA', 'xC', 'wicca', 'OCEANUS', 'G-SHOCK', 'BABY-G', 'PROTREK', 'EXCEED', 'ATTESA', 'ORIENT STAR', 'ORIENT', 'KENTEX', 'monologue'],
  toyama:   ['PROSPEX', 'KING SEIKO', 'ASTRON', 'PRESAGE', 'ORIENT STAR']
};

/* 商品の brand（日本語表記）→ STORE_BRANDS のラベルへの対応表。
   PRODUCTS に新しいブランドの商品を追加するときは、その日本語ブランド名をここに1行足すだけで、
   商品詳細の来店予約・お問い合わせが自動的に「その商品を扱う店舗」だけへ絞り込まれる。
   （対応が無いブランドは全店扱いとしてフォールバックする） */
const BRAND_ALIASES = {
  'プロスペックス':   'PROSPEX',
  'キングセイコー':   'KING SEIKO',
  'アストロン':       'ASTRON',
  'プレザージュ':     'PRESAGE',
  'グランドセイコー': 'Grand Seiko',
  'ロンジン':         'LONGINES',
  'ティソ':           'TISSOT',
  'レイモンドウェイル':'RAYMOND WEIL',
  'トムフォード':     'TOM FORD',
  'オリス':           'ORIS',
  'カンパノラ':       'CAMPANOLA',
  'オリエントスター': 'ORIENT STAR',
  'オリエント':       'ORIENT',
  'ルミノックス':     'Luminox',
  'ケンテックス':     'KENTEX',
  'モノローグ':       'monologue',
  'エドックス':       'EDOX',
  'オシアナス':       'OCEANUS',
  'エクシード':       'EXCEED',
  'アテッサ':         'ATTESA',
  'クロスシー':       'xC',
  'ウィッカ':         'wicca',
  'ルキア':           'LUKIA'
};

(function () {
  const STORES = {
    kanazawa: { name: '金沢・タテマチ店',        area: '石川県', tel: '076-256-0120', hours: '11:00〜19:30', closed: '不定休' },
    kaihatsu: { name: '福井・開発本店',          area: '福井県', tel: '0776-53-8355', hours: '11:00〜19:30', closed: '不定休' },
    elpa:     { name: '福井・エルパ店',          area: '福井県', tel: '0776-57-2605', hours: '10:00〜20:00', closed: '施設に準ずる' },
    bell:     { name: '福井・ベル店',            area: '福井県', tel: '0776-35-8882', hours: '10:00〜20:00', closed: '施設に準ずる' },
    toyama:   { name: '富山インター・二口町店',  area: '富山県', tel: '076-481-6776', hours: '11:00〜19:30', closed: '木曜日（祝日は営業）' }
  };
  const ALL = ['kanazawa', 'kaihatsu', 'elpa', 'bell', 'toyama'];

  /* ブランド→取扱店。上の STORE_BRANDS から自動生成する（単一情報源）。
     取扱店が変わったら STORE_BRANDS を直すだけでよい。
     生成結果（ラベル→取扱店）例：'PROSPEX'→全5店、'KING SEIKO'→ベル以外、
     'LONGINES'/'RAYMOND WEIL'→タテマチ、'Grand Seiko'→開発本店・エルパ など。 */
  const BRAND_STORES = {};
  ALL.forEach(store => (STORE_BRANDS[store] || []).forEach(label => {
    (BRAND_STORES[label] || (BRAND_STORES[label] = [])).push(store);
  }));

  const PRODUCTS = [
    { id: "prospex-sbej011", brand: "プロスペックス", badge: "", ref: "SBEJ011", price: "¥218,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ011.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbej009", brand: "プロスペックス", badge: "", ref: "SBEJ009", price: "¥218,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ009.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "astron-sbxc151", brand: "アストロン", badge: "", ref: "SBXC151", price: "¥308,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC151.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd013", brand: "アストロン", badge: "", ref: "SBXD013", price: "¥275,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD013.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "kingseiko-sdks017", brand: "キングセイコー", badge: "", ref: "SDKS017", price: "¥231,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKS017.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "prospex-sbej029", brand: "プロスペックス", badge: "新作", ref: "SBEJ029", price: "¥247,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ029.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbej027", brand: "プロスペックス", badge: "限定", ref: "SBEJ027", price: "¥247,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ027_1.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc213", brand: "プロスペックス", badge: "限定", ref: "SBDC213", price: "¥192,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC213_1.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "kingseiko-sdkv001", brand: "キングセイコー", badge: "７月発売", ref: "SDKV001", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKV001_1-1.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdkv003", brand: "キングセイコー", badge: "７月発売", ref: "SDKV003", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKV003-1.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdkv005", brand: "キングセイコー", badge: "７月発売", ref: "SDKV005", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKV005-1.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdkv007", brand: "キングセイコー", badge: "７月発売・限定", ref: "SDKV007", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKV007.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "astron-sbxc180", brand: "アストロン", badge: "限定", ref: "SBXC180", price: "¥374,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC180_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc175", brand: "アストロン", badge: "新作", ref: "SBXC175", price: "¥352,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC175_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc177", brand: "アストロン", badge: "新作", ref: "SBXC177", price: "¥352,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC177_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc179", brand: "アストロン", badge: "新作", ref: "SBXC179", price: "¥374,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC179_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc173", brand: "アストロン", badge: "限定", ref: "SBXC173", price: "¥363,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC173_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc181", brand: "アストロン", badge: "新作", ref: "SBXC181", price: "¥330,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC181_1.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy093", brand: "アストロン", badge: "限定", ref: "SBXY093", price: "¥181,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY093.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy095", brand: "アストロン", badge: "新作", ref: "SBXY095", price: "¥176,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY095.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy097", brand: "アストロン", badge: "新作", ref: "SBXY097", price: "¥176,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY097.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd031", brand: "アストロン", badge: "新作", ref: "SBXD031", price: "¥247,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD031.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd033", brand: "アストロン", badge: "新作", ref: "SBXD033", price: "¥247,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD033.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd035", brand: "アストロン", badge: "新作", ref: "SBXD035", price: "¥247,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD035.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "presage-sarx129", brand: "プレザージュ", badge: "新作", ref: "SARX129", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX129.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx131", brand: "プレザージュ", badge: "新作", ref: "SARX131", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX131.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx132", brand: "プレザージュ", badge: "新作", ref: "SARX132", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX132.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-srry049", brand: "プレザージュ", badge: "新作", ref: "SRRY049", price: "¥75,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SRRY049.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-srry051", brand: "プレザージュ", badge: "新作", ref: "SRRY051", price: "¥75,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SRRY051.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-srry052", brand: "プレザージュ", badge: "新作", ref: "SRRY052", price: "¥81,400", photo: "https://www.g-takeuchi.com/wp-content/uploads/SRRY052-1.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary265", brand: "プレザージュ", badge: "新作", ref: "SARY265", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY265.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary267", brand: "プレザージュ", badge: "新作", ref: "SARY267", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY267.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary269", brand: "プレザージュ", badge: "新作", ref: "SARY269", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY269.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "prospex-大谷翔平 2025限定モデル sbej023", brand: "プロスペックス", badge: "", ref: "大谷翔平 2025限定モデル SBEJ023", price: "¥330,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ023.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "presage-sary095", brand: "プレザージュ", badge: "", ref: "SARY095", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY095.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx125", brand: "プレザージュ", badge: "", ref: "SARX125", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX125.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx123", brand: "プレザージュ", badge: "", ref: "SARX123", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX123.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx121", brand: "プレザージュ", badge: "", ref: "SARX121", price: "¥132,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX121.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx107", brand: "プレザージュ", badge: "", ref: "SARX107", price: "¥221,100", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX107.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarx105", brand: "プレザージュ", badge: "", ref: "SARX105", price: "¥188,100", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARX105.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarw049", brand: "プレザージュ", badge: "", ref: "SARW049", price: "¥255,200", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARW049.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sart003", brand: "プレザージュ", badge: "", ref: "SART003", price: "¥259,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SART003.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarj009", brand: "プレザージュ", badge: "", ref: "SARJ009", price: "¥154,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARJ009.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarj007", brand: "プレザージュ", badge: "", ref: "SARJ007", price: "¥154,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARJ007.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sarh001", brand: "プレザージュ", badge: "", ref: "SARH001", price: "¥243,100", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARH001.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary247", brand: "プレザージュ", badge: "", ref: "SARY247", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY247.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary243", brand: "プレザージュ", badge: "", ref: "SARY243", price: "¥75,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY243.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary241", brand: "プレザージュ", badge: "", ref: "SARY241", price: "¥75,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY241.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary237", brand: "プレザージュ", badge: "", ref: "SARY237", price: "¥75,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY237.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary231", brand: "プレザージュ", badge: "", ref: "SARY231", price: "¥84,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY231.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary229", brand: "プレザージュ", badge: "", ref: "SARY229", price: "¥84,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY229.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary209", brand: "プレザージュ", badge: "", ref: "SARY209", price: "¥83,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY209.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary187", brand: "プレザージュ", badge: "", ref: "SARY187", price: "¥73,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY187.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary161", brand: "プレザージュ", badge: "", ref: "SARY161", price: "¥57,200", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY161.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary132", brand: "プレザージュ", badge: "", ref: "SARY132", price: "¥81,400", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY132.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "presage-sary123", brand: "プレザージュ", badge: "", ref: "SARY123", price: "¥57,200", photo: "https://www.g-takeuchi.com/wp-content/uploads/SARY123.jpg", lead: "日本の美意識と機械式の伝統が息づくプレザージュ。" },
    { id: "prospex-sben011", brand: "プロスペックス", badge: "", ref: "SBEN011", price: "¥429,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEN011.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sben009", brand: "プロスペックス", badge: "", ref: "SBEN009", price: "¥429,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEN009.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sben007", brand: "プロスペックス", badge: "", ref: "SBEN007", price: "¥429,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEN007.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbej005", brand: "プロスペックス", badge: "", ref: "SBEJ005", price: "¥149,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEJ005.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbef055", brand: "プロスペックス", badge: "", ref: "SBEF055", price: "¥15,950", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEF055.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbef047", brand: "プロスペックス", badge: "", ref: "SBEF047", price: "¥18,150", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEF047.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbed011", brand: "プロスペックス", badge: "", ref: "SBED011", price: "¥308,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBED011.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbed009", brand: "プロスペックス", badge: "", ref: "SBED009", price: "¥308,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBED009.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbec025", brand: "プロスペックス", badge: "", ref: "SBEC025", price: "¥352,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEC025.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbec009", brand: "プロスペックス", badge: "", ref: "SBEC009", price: "¥403,700", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEC009.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdy133", brand: "プロスペックス", badge: "", ref: "SBDY133", price: "¥79,200", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDY133.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdy131", brand: "プロスペックス", badge: "", ref: "SBDY131", price: "¥83,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDY131.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdy129", brand: "プロスペックス", badge: "", ref: "SBDY129", price: "¥83,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDY129.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdy125", brand: "プロスペックス", badge: "", ref: "SBDY125", price: "¥91,300", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDY125.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdy123", brand: "プロスペックス", badge: "", ref: "SBDY123", price: "¥86,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDY123.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdx065", brand: "プロスペックス", badge: "", ref: "SBDX065", price: "¥407,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDX065.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdx063", brand: "プロスペックス", badge: "", ref: "SBDX063", price: "¥407,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDX063.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl115", brand: "プロスペックス", badge: "", ref: "SBDL115", price: "¥101,200", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL115.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl113", brand: "プロスペックス", badge: "", ref: "SBDL113", price: "¥105,600", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL113.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl111", brand: "プロスペックス", badge: "", ref: "SBDL111", price: "¥103,400", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL111.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl109", brand: "プロスペックス", badge: "", ref: "SBDL109", price: "¥103,400", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL109.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl107", brand: "プロスペックス", badge: "", ref: "SBDL107", price: "¥99,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL107.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl095", brand: "プロスペックス", badge: "", ref: "SBDL095", price: "¥103,400", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL095.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl091", brand: "プロスペックス", badge: "", ref: "SBDL091", price: "¥99,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL091.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdl085", brand: "プロスペックス", badge: "", ref: "SBDL085", price: "¥99,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDL085-1.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc203", brand: "プロスペックス", badge: "", ref: "SBDC203", price: "¥176,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC203.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc201", brand: "プロスペックス", badge: "", ref: "SBDC201", price: "¥176,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC201.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc197", brand: "プロスペックス", badge: "", ref: "SBDC197", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC197.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc195", brand: "プロスペックス", badge: "", ref: "SBDC195", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC195.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc091", brand: "プロスペックス", badge: "", ref: "SBDC091", price: "¥97,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC091.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc087", brand: "プロスペックス", badge: "", ref: "SBDC087", price: "¥100,100", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC087-1.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc083", brand: "プロスペックス", badge: "", ref: "SBDC083", price: "¥108,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC083.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbdc081", brand: "プロスペックス", badge: "", ref: "SBDC081", price: "¥108,900", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBDC081.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbbn047", brand: "プロスペックス", badge: "", ref: "SBBN047", price: "¥390,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBBN047.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "prospex-sbec021", brand: "プロスペックス", badge: "", ref: "SBEC021", price: "¥352,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBEC021.jpg", lead: "フィールドからダイバーズまで、挑戦を支えるプロスペックス。" },
    { id: "astron-sbxy087", brand: "アストロン", badge: "", ref: "SBXY087", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY087.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy085", brand: "アストロン", badge: "", ref: "SBXY085", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY085.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy083", brand: "アストロン", badge: "", ref: "SBXY083", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY083.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy081", brand: "アストロン", badge: "", ref: "SBXY081", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY081.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy067", brand: "アストロン", badge: "", ref: "SBXY067", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY067.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy065", brand: "アストロン", badge: "", ref: "SBXY065", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY065.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy063", brand: "アストロン", badge: "", ref: "SBXY063", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY063.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy061", brand: "アストロン", badge: "", ref: "SBXY061", price: "¥165,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY061.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy053", brand: "アストロン", badge: "", ref: "SBXY053", price: "¥198,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY053.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy051", brand: "アストロン", badge: "", ref: "SBXY051", price: "¥198,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY051.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy049", brand: "アストロン", badge: "", ref: "SBXY049", price: "¥198,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY049.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy041", brand: "アストロン", badge: "", ref: "SBXY041", price: "¥231,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY041.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy039", brand: "アストロン", badge: "", ref: "SBXY039", price: "¥231,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY039.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy037", brand: "アストロン", badge: "", ref: "SBXY037", price: "¥231,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY037.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy034", brand: "アストロン", badge: "", ref: "SBXY034", price: "¥137,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY034.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy033", brand: "アストロン", badge: "", ref: "SBXY033", price: "¥137,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY033.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy031", brand: "アストロン", badge: "", ref: "SBXY031", price: "¥137,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY031.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxy029", brand: "アストロン", badge: "", ref: "SBXY029", price: "¥137,500", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXY029.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd026", brand: "アストロン", badge: "", ref: "SBXD026", price: "¥275,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD026.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd025", brand: "アストロン", badge: "", ref: "SBXD025", price: "¥275,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD025.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd023", brand: "アストロン", badge: "", ref: "SBXD023", price: "¥275,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD023.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxd014", brand: "アストロン", badge: "", ref: "SBXD014", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXD014.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc163", brand: "アストロン", badge: "", ref: "SBXC163", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC163.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc161", brand: "アストロン", badge: "", ref: "SBXC161", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC161.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc159", brand: "アストロン", badge: "", ref: "SBXC159", price: "¥286,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC159.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc155", brand: "アストロン", badge: "", ref: "SBXC155", price: "¥330,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC155.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "astron-sbxc153", brand: "アストロン", badge: "", ref: "SBXC153", price: "¥308,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SBXC153.jpg", lead: "GPSソーラーで世界の時刻を正確に刻むアストロン。" },
    { id: "kingseiko-sdka021", brand: "キングセイコー", badge: "", ref: "SDKA021", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA021.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdka019", brand: "キングセイコー", badge: "", ref: "SDKA019", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA019.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdka017", brand: "キングセイコー", badge: "", ref: "SDKA017", price: "¥396,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA017.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdka015", brand: "キングセイコー", badge: "", ref: "SDKA015", price: "¥418,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA015.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdka013", brand: "キングセイコー", badge: "", ref: "SDKA013", price: "¥418,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA013.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdka011", brand: "キングセイコー", badge: "", ref: "SDKA011", price: "¥418,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKA011.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdks021", brand: "キングセイコー", badge: "", ref: "SDKS021", price: "¥253,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKS021.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdks023", brand: "キングセイコー", badge: "", ref: "SDKS023", price: "¥253,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKS023.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
    { id: "kingseiko-sdks025", brand: "キングセイコー", badge: "", ref: "SDKS025", price: "¥253,000", photo: "https://www.g-takeuchi.com/wp-content/uploads/SDKS025.jpg", lead: "端正な意匠に品格が宿る、キングセイコー。" },
  ];

  const byId = id => PRODUCTS.find(p => p.id === id);
  // 取扱店舗：商品個別の指定(stores)を最優先。無ければ brand を STORE_BRANDS のラベルへ
  // 変換して、そのブランドを扱う店舗を使う。対応が無ければ全店にフォールバック。
  const storesOf = p => p.stores || BRAND_STORES[BRAND_ALIASES[p.brand] || p.brand] || ALL;
  // 表示用の商品名（例：プロスペックス【新作】SBEJ029）
  const titleOf = p => p.brand + (p.badge ? '【' + p.badge + '】' : ' ') + p.ref;
  // 予約フォームへ引き継ぐURL（商品名・目的・任意で店舗）
  function resUrl(prod, purpose, storeKey) {
    const params = new URLSearchParams();
    params.set('item', titleOf(prod) + '（' + prod.price + '）');
    if (purpose) params.set('purpose', purpose);
    if (storeKey) params.set('store', STORES[storeKey].name);
    return 'reservation.html?' + params.toString();
  }
  // お問い合わせフォームへ引き継ぐURL（ブランド・品番・任意で店舗）
  function ctcUrl(prod, storeKey) {
    const params = new URLSearchParams();
    params.set('purpose', '商品について');
    params.set('brand', prod.brand);
    params.set('item', prod.ref);
    if (storeKey) params.set('store', STORES[storeKey].name);
    return 'contact.html?' + params.toString();
  }

  // --- 新作・限定コレクション（watches.html #watches） ---
  const newCollectionGrid = document.getElementById('newCollectionGrid');
  if (newCollectionGrid) {
    const NEW_ITEMS = PRODUCTS.filter(p => p.badge && (p.badge.includes('新作') || p.badge.includes('限定') || p.badge.includes('発売')));
    const collectionTabBtns = document.querySelectorAll('#collectionTabs .watch-tab');

    function buildCollectionCard(p) {
      const a = document.createElement('a');
      a.className = 'watch-card';
      a.href = 'product.html?id=' + encodeURIComponent(p.id);
      a.innerHTML =
        '<div class="watch-card__photo">' +
          (p.badge ? '<span class="watch-card__badge">' + p.badge + '</span>' : '') +
          '<img src="' + p.photo + '" alt="' + p.brand + ' ' + p.ref + '" loading="lazy"></div>' +
        '<div class="watch-card__body">' +
          '<p class="watch-card__brand">' + p.brand + '</p>' +
          '<p class="watch-card__name">' + p.ref + '</p>' +
          '<p class="watch-card__price">' + p.price + '</p>' +
          '<span class="watch-card__cta">詳細・来店予約 &rsaquo;</span>' +
        '</div>';
      return a;
    }

    function renderCollection(brandFilter) {
      newCollectionGrid.innerHTML = '';
      const list = brandFilter ? NEW_ITEMS.filter(p => p.brand === brandFilter) : NEW_ITEMS;
      list.forEach(p => newCollectionGrid.appendChild(buildCollectionCard(p)));
    }

    renderCollection('');

    collectionTabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        collectionTabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCollection(tab.dataset.brand);
      });
    });
  }

  // --- 商品一覧（watches.html） ---
  const grid = document.getElementById('watchGrid');
  const watchTabBtns = document.querySelectorAll('.watch-tab');
  if (grid) {
    function buildCard(p) {
      const a = document.createElement('a');
      a.className = 'watch-card';
      a.href = 'product.html?id=' + encodeURIComponent(p.id);
      a.innerHTML =
        '<div class="watch-card__photo">' +
          (p.badge ? '<span class="watch-card__badge">' + p.badge + '</span>' : '') +
          '<img src="' + p.photo + '" alt="' + p.brand + ' ' + p.ref + '" loading="lazy"></div>' +
        '<div class="watch-card__body">' +
          '<p class="watch-card__brand">' + p.brand + '</p>' +
          '<p class="watch-card__name">' + p.ref + '</p>' +
          '<p class="watch-card__price">' + p.price + '</p>' +
          '<span class="watch-card__cta">詳細・来店予約 &rsaquo;</span>' +
        '</div>';
      return a;
    }

    function isNew(p) { return p.badge && (p.badge.includes('新作') || p.badge.includes('限定') || p.badge.includes('発売')); }

    function renderGrid(brandFilter) {
      grid.innerHTML = '';
      const base = PRODUCTS.filter(p => !isNew(p));
      const list = brandFilter ? base.filter(p => p.brand === brandFilter) : base;
      list.forEach(p => grid.appendChild(buildCard(p)));
    }

    renderGrid('');

    watchTabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        watchTabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderGrid(tab.dataset.brand);
      });
    });
  }

  // --- トップページ新着時計グリッド（index.html） ---
  const newArrivalsGrid = document.getElementById('newArrivalsGrid');
  if (newArrivalsGrid) {
    const NEW_ARRIVALS = [
      { brand: 'プロスペックス', badge: '新作',     ref: 'SBEJ029', price: '¥247,500', id: 'prospex-sbej029',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBEJ029.jpg' },
      { brand: 'キングセイコー', badge: '７月発売', ref: 'SDKV001', price: '¥396,000', id: 'kingseiko-sdkv001', photo: 'https://www.g-takeuchi.com/wp-content/uploads/SDKV001_1-1.jpg' },
      { brand: 'アストロン',     badge: '新作',     ref: 'SBXC175', price: '¥352,000', id: 'astron-sbxc175',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBXC175_1.jpg' },
    ];
    NEW_ARRIVALS.forEach(p => {
      const a = document.createElement('a');
      a.className = 'watch-card';
      a.href = 'product.html?id=' + encodeURIComponent(p.id);
      a.innerHTML =
        '<div class="watch-card__photo">' +
          (p.badge ? '<span class="watch-card__badge">' + p.badge + '</span>' : '') +
          '<img src="' + p.photo + '" alt="' + p.brand + ' ' + p.ref + '" loading="lazy"></div>' +
        '<div class="watch-card__body">' +
          '<p class="watch-card__brand">' + p.brand + '</p>' +
          '<p class="watch-card__name">' + p.ref + '</p>' +
          '<p class="watch-card__price">' + p.price + '</p>' +
          '<span class="watch-card__cta">詳細・来店予約 &rsaquo;</span>' +
        '</div>';
      newArrivalsGrid.appendChild(a);
    });
  }

  // --- トップページ注目商品グリッド（index.html） ---
  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    const FEATURED = [
      { brand: 'プロスペックス', badge: '新作',           ref: 'SBEJ029', price: '¥247,500', id: 'prospex-sbej029',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBEJ029.jpg' },
      { brand: 'プロスペックス', badge: '限定',           ref: 'SBEJ027', price: '¥247,500', id: 'prospex-sbej027',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBEJ027_1.jpg' },
      { brand: 'キングセイコー', badge: '７月発売',       ref: 'SDKV001', price: '¥396,000', id: 'kingseiko-sdkv001', photo: 'https://www.g-takeuchi.com/wp-content/uploads/SDKV001_1-1.jpg' },
      { brand: 'キングセイコー', badge: '７月発売・限定', ref: 'SDKV007', price: '¥396,000', id: 'kingseiko-sdkv007', photo: 'https://www.g-takeuchi.com/wp-content/uploads/SDKV007.jpg' },
      { brand: 'アストロン',     badge: '新作',           ref: 'SBXC175', price: '¥352,000', id: 'astron-sbxc175',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBXC175_1.jpg' },
      { brand: 'アストロン',     badge: '限定',           ref: 'SBXC180', price: '¥374,000', id: 'astron-sbxc180',   photo: 'https://www.g-takeuchi.com/wp-content/uploads/SBXC180_1.jpg' },
      { brand: 'プレザージュ',   badge: '新作',           ref: 'SARX129', price: '¥132,000', id: 'presage-sarx129',  photo: 'https://www.g-takeuchi.com/wp-content/uploads/SARX129.jpg' },
      { brand: 'プレザージュ',   badge: '新作',           ref: 'SRRY049', price: '¥75,900',  id: 'presage-srry049',  photo: 'https://www.g-takeuchi.com/wp-content/uploads/SRRY049.jpg' },
    ];
    FEATURED.forEach(p => {
      const a = document.createElement('a');
      a.className = 'watch-card';
      a.href = 'product.html?id=' + encodeURIComponent(p.id);
      a.innerHTML =
        '<div class="watch-card__photo">' +
          (p.badge ? '<span class="watch-card__badge">' + p.badge + '</span>' : '') +
          '<img src="' + p.photo + '" alt="' + p.brand + ' ' + p.ref + '" loading="lazy"></div>' +
        '<div class="watch-card__body">' +
          '<p class="watch-card__brand">' + p.brand + '</p>' +
          '<p class="watch-card__name">' + p.ref + '</p>' +
          '<p class="watch-card__price">' + p.price + '</p>' +
          '<span class="watch-card__cta">詳細・来店予約 &rsaquo;</span>' +
        '</div>';
      featuredGrid.appendChild(a);
    });
  }

  // --- 商品詳細（product.html?id=◯◯） ---
  const detail = document.getElementById('productDetail');
  if (detail) {
    const id = new URLSearchParams(location.search).get('id');
    const p = id && byId(id);
    if (!p) {
      detail.innerHTML = '<div class="product-missing"><p>お探しの商品が見つかりませんでした。</p>' +
        '<a class="product-missing__link" href="watches.html">新作時計のお知らせへ戻る &rsaquo;</a></div>';
    } else {
      document.title = titleOf(p) + ' | TAKEUCHI BRIDAL';
      const keys = storesOf(p);
      const storeCards = keys.map(key => {
        const s = STORES[key];
        return '<div class="product-store">' +
          '<p class="product-store__area">' + s.area + '</p>' +
          '<h4 class="product-store__name">' + s.name + '</h4>' +
          '<dl class="product-store__info">' +
            '<div><dt>TEL</dt><dd><a href="tel:' + s.tel + '">' + s.tel + '</a></dd></div>' +
            '<div><dt>営業時間</dt><dd>' + s.hours + '（定休日：' + s.closed + '）</dd></div>' +
          '</dl>' +
          '<div class="product-store__btns">' +
            '<a class="product-store__btn" href="' + resUrl(p, '商品のご相談', key) + '">この店舗で来店予約 &rsaquo;</a>' +
            '<a class="product-store__btn product-store__btn--ghost" href="' + ctcUrl(p, key) + '">この店舗に問い合わせ &rsaquo;</a>' +
          '</div>' +
          '</div>';
      }).join('');

      // 取扱店が1店だけならボタンからその店へ直行、複数なら店舗選択へ誘導する
      const only = keys.length === 1 ? keys[0] : null;
      const resHref = only ? resUrl(p, '商品のご相談', only) : '#productStores';
      const ctcHref = only ? ctcUrl(p, only) : '#productStores';
      const ctaNote = only
        ? 'この商品のお取り扱いは' + STORES[only].name + 'のみです。'
        : 'この商品は' + keys.length + '店舗でお取り扱いしています。ご希望の店舗をお選びください。';

      detail.innerHTML =
        '<nav class="product-crumb"><a href="watches.html">新作時計のお知らせ</a><span>&rsaquo;</span>' + p.brand + '</nav>' +
        '<div class="product-main">' +
          '<div class="product-gallery">' + (p.badge ? '<span class="product-gallery__badge">' + p.badge + '</span>' : '') + '<img src="' + p.photo + '" alt="' + p.brand + ' ' + p.ref + '"></div>' +
          '<div class="product-info">' +
            '<p class="product-info__brand">' + p.brand + (p.badge ? '<span class="product-info__badge">' + p.badge + '</span>' : '') + '</p>' +
            '<h1 class="product-info__name">' + p.ref + '</h1>' +
            '<p class="product-info__price-main">' + p.price + '<span>（税込）</span></p>' +
            '<p class="product-info__lead">' + p.lead + '</p>' +
            '<dl class="product-info__specs">' +
              '<dt>ブランド</dt><dd>' + p.brand + '</dd>' +
              '<dt>品番</dt><dd>' + p.ref + '</dd>' +
              (p.badge ? '<dt>区分</dt><dd>' + p.badge + '</dd>' : '') +
              '<dt>価格</dt><dd>' + p.price + '（税込）</dd>' +
            '</dl>' +
            '<p class="product-info__price">ネット販売は行っておりません。店頭でのご案内となります。<br>在庫状況は店舗により異なります。まずはお気軽に来店予約・お問い合わせください。</p>' +
            '<div class="product-cta">' +
              '<a class="product-cta__btn product-cta__btn--fill" href="' + resHref + '">来店試着を予約する</a>' +
              '<a class="product-cta__btn" href="' + ctcHref + '">購入についてお問い合わせ</a>' +
            '</div>' +
            '<p class="product-cta__note">' + ctaNote + '</p>' +
          '</div>' +
        '</div>' +
        '<section class="product-stores" id="productStores">' +
          '<div class="product-stores__hd"><h2 class="sec__en">shop info</h2><p class="sec__jp">この商品の取り扱い店舗</p>' +
          '<p class="product-stores__note">ご希望の店舗をお選びのうえ、来店予約・お問い合わせへお進みください。<br>在庫状況は店舗により異なります。まずはお気軽にご連絡ください。</p></div>' +
          '<div class="product-stores__grid">' + storeCards + '</div>' +
        '</section>';
    }
  }
})();

/* =========================================================
   取扱ブランドの店舗別フィルタ（index.html #brands）
   ---------------------------------------------------------
   店舗ごとに扱うブランドが異なるため、タブで絞り込めるようにする。
   ブランド名は各セルの alt（ロゴ画像）または表示テキストと突き合わせるので、
   ファイル上部の共通 STORE_BRANDS の表記は index.html のセルの表記と一致させること。
   各店の公式ページ（watch_info / watch-collection）の掲載ブランドに基づく。
   ========================================================= */
(function () {
  const grid = document.getElementById('brandGrid');
  const tabs = document.getElementById('brandStoreTabs');
  if (!grid || !tabs) return;

  // 店舗別の取扱ブランドは、ファイル上部の共通 STORE_BRANDS を単一情報源として参照する
  // （商品詳細の取扱店ルーティングと同じデータ）。

  // セルの表示名を取り出す（ロゴ画像なら alt、文字だけのセルならその文字）
  const labelOf = cell => {
    const logo = cell.querySelector('.brand-cell__logo');
    if (logo) return logo.getAttribute('alt') || '';
    const en = cell.querySelector('.brand-cell__en');
    return en ? en.textContent.trim() : '';
  };

  const cells = [...grid.querySelectorAll('.brand-cell')];
  const note = document.getElementById('brandGridNote');

  function filter(storeKey) {
    const list = STORE_BRANDS[storeKey];
    cells.forEach(cell => {
      cell.hidden = !!list && !list.includes(labelOf(cell));
    });
    if (note) {
      const shown = cells.filter(c => !c.hidden).length;
      note.hidden = !storeKey;
      note.textContent = storeKey ? 'この店舗の取扱ブランド：' + shown + '件' : '';
    }
  }

  tabs.querySelectorAll('.watch-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.watch-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter(btn.dataset.store);
    });
  });
})();

// ===== 予約フォーム =====
// action が未設定のあいだは送信させず、電話・LINEへ誘導する。
// action にエンドポイントURLを入れれば、このガードは自動的に無効になる。
(function () {
  // お問い合わせ・来店予約フォーム共通：action 未設定のあいだは送信させず案内表示
  document.querySelectorAll('form.res-form').forEach(form => {
    const notice = form.querySelector('.res-form__notice');
    form.addEventListener('submit', e => {
      if (form.getAttribute('action')) return;
      e.preventDefault();
      if (notice) { notice.hidden = false; notice.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  });

  // 商品ページから「item / store / purpose」を引き継ぐ。
  // 来店予約（reservation.html?item=...&store=...）と
  // お問い合わせ（contact.html?item=...&store=...）の両方で動く。
  const params = new URLSearchParams(location.search);
  const item = params.get('item');
  if (item) {
    // 来店予約：「ご相談の商品」パネルに表示して hidden で送る
    const box = document.getElementById('resItem');
    const label = document.getElementById('resItemName');
    const hidden = document.getElementById('resItemInput');
    if (box && label && hidden) { box.hidden = false; label.textContent = item; hidden.value = item; }
    // お問い合わせ：商品名の入力欄へ流し込む
    const conItem = document.getElementById('con-item');
    if (conItem) conItem.value = item;
    const conBrand = document.getElementById('con-brand');
    if (conBrand) conBrand.value = params.get('brand') || '';
  }
  const setSelect = (id, val) => {
    if (!val) return;
    const el = document.getElementById(id);
    if (el && [...el.options].some(o => o.value === val)) el.value = val;
  };
  setSelect('res-store', params.get('store'));
  setSelect('res-purpose', params.get('purpose'));
  setSelect('con-store', params.get('store'));
  setSelect('con-purpose', params.get('purpose'));
})();
