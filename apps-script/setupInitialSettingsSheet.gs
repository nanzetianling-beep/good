/**
 * ============================================================
 * 初期設定一覧シート 自動セットアップスクリプト
 * ============================================================
 *
 * 【使い方】
 *   1. 対象のスプレッドシートを開く
 *   2. 拡張機能 → Apps Script を開く
 *   3. このファイルの内容をすべて貼り付けて保存
 *   4. 関数一覧から setupInitialSettingsSheet を選んで「実行」
 *   5. 初回のみ権限の承認ダイアログが出るので許可する
 *
 * 【安全設計】
 *   - 既存シートは絶対に削除しません（deleteSheet は使いません）
 *   - clear() / clearContents() も使いません
 *   - 既定ではサンプルデータを入れず、ヘッダーと書式だけを用意します
 *     （サンプルが必要なときは INSERT_SAMPLE_DATA を true にする）
 *
 * 色・列幅・行数などの設定値は、すべて下の「設定エリア」に
 * まとめてあります。変更したいときはここだけ書き換えてください。
 */

// ============================================================
// 設定エリア（ここだけ変えれば見た目を調整できます）
// ============================================================

/** 対象スプレッドシートのID。空文字なら「今開いているファイル」を対象にする */
var TARGET_SPREADSHEET_ID = '';

/** 作成・使用するシート名 */
var SHEET_NAME = '初期設定一覧';

/** 書式を事前に用意しておく最終行（後から行を足しても書式が効くようにするため） */
var MAX_ROWS = 500;

/** 列番号（1始まり）。列を増やすときはここを起点に調整する */
var COL = {
  NO: 1,        // A列：No.
  CATEGORY: 2,  // B列：大項目
  ITEM: 3,      // C列：小項目
  CONTENT: 4,   // D列：内容・設定
  REASON: 5,    // E列：理由
  MEMO: 6,      // F列：メモ
  STATUS: 7     // G列：状態
};

/** 最終列（G列 = 7） */
var LAST_COL = COL.STATUS;

/** ヘッダー行に表示する文字 */
var HEADERS = ['No.', '大項目', '小項目', '内容・設定', '理由', 'メモ', '状態'];

/** 配色（すべてここで一元管理） */
var COLORS = {
  HEADER_BG: '#1F3557',      // ヘッダー背景：濃い紺
  HEADER_FONT: '#FFFFFF',    // ヘッダー文字：白
  CATEGORY_BG: '#EAF0F8',    // 大項目背景：薄い紺
  CATEGORY_FONT: '#1F3557',  // 大項目文字：濃い紺
  ITEM_FONT: '#333333',      // 小項目文字：濃いグレー
  WHITE: '#FFFFFF',          // 通常の背景：白
  REASON_BG: '#F5F5F5',      // 理由：薄いグレー
  MEMO_BG: '#FFF8E1',        // メモ：薄い黄色
  BODY_FONT: '#333333',      // 本文の文字色
  BORDER: '#DADCE0'          // 罫線：薄いグレー
};

/** 列幅（px） */
var COLUMN_WIDTHS = {};
COLUMN_WIDTHS[COL.NO] = 50;
COLUMN_WIDTHS[COL.CATEGORY] = 150;
COLUMN_WIDTHS[COL.ITEM] = 180;
COLUMN_WIDTHS[COL.CONTENT] = 250;
COLUMN_WIDTHS[COL.REASON] = 300;
COLUMN_WIDTHS[COL.MEMO] = 250;
COLUMN_WIDTHS[COL.STATUS] = 110;

/** 行の高さ（px） */
var ROW_HEIGHT = {
  HEADER: 45,  // ヘッダー行
  MIN_BODY: 40 // データ行の最低の高さ
};

/**
 * 状態（G列）の選択肢と色。
 * 選択肢を増やしたいときは、この配列に1件足すだけでOK。
 * （プルダウンの選択肢と色付けの両方に自動で反映されます）
 */
var STATUS_OPTIONS = [
  { label: '完了',   background: '#E6F4EA', fontColor: '#137333' },
  { label: '確認中', background: '#FEF3E2', fontColor: '#B06000' },
  { label: '未対応', background: '#FCE8E6', fontColor: '#C5221F' },
  { label: '不要',   background: '#EEEEEE', fontColor: '#666666' }
];

/**
 * サンプルデータを入れるかどうか。
 * false = ヘッダーと書式だけ用意する（中身は自分で書く場合はこちら）
 * true  = 下の SAMPLE_DATA を、シートが空のときだけ入力する
 */
var INSERT_SAMPLE_DATA = false;

/** サンプルデータ（INSERT_SAMPLE_DATA が true のときだけ使われる） */
var SAMPLE_DATA = [
  [1, '店舗基本設定', '店舗名',   '店舗名を登録する',                     'レシートや帳票に店舗名を表示するため',    '後から変更可能',                 '完了'],
  [2, '店舗基本設定', '営業時間', '開店時間・閉店時間を設定する',         '売上集計の日付を正しく管理するため',      '深夜営業の場合は営業日の扱いに注意', '確認中'],
  [3, '会計設定',     '消費税',   '適用する税率を設定する',               '会計金額を自動計算するため',              '軽減税率対象商品の確認が必要',     '未対応'],
  [4, '会計設定',     '支払方法', '現金・カード・QR決済などを登録する',   '会計時に支払方法を選択できるようにするため', 'QR決済追加予定',               '未対応'],
  [5, '商品設定',     'カテゴリ', 'ドリンク・フードなどの商品カテゴリを登録する', '商品を探しやすくするため',          '並び順変更可能',                 '完了'],
  [6, 'スタッフ設定', '権限',     '店長・スタッフなどの操作権限を設定する', '操作できる機能を役職ごとに分けるため',   '削除権限は店長のみ',             '確認中']
];

// ============================================================
// メイン関数（この関数を1回実行すればすべて完成します）
// ============================================================

/**
 * 初期設定一覧シートを作成し、書式・プルダウン・フィルターまで一括で整える。
 */
function setupInitialSettingsSheet() {
  var spreadsheet = getTargetSpreadsheet_();
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAME);

  // 500行・7列ぶんの入れ物を先に確保しておく
  ensureSheetSize_(sheet);

  writeHeader_(sheet);            // 1. ヘッダーの文字を入れる
  writeSampleDataIfEmpty_(sheet); // 2. サンプルを使う設定のときだけ入力

  var lastDataRow = getLastDataRow_(sheet); // 実際にデータが入っている最終行

  applyHeaderStyle_(sheet);     // 3. ヘッダーのデザイン
  applyColumnStyles_(sheet);    // 4. 列ごとの背景色・文字設定・折り返し
  applyColumnWidths_(sheet);    // 5. 列幅
  applyRowHeights_(sheet, lastDataRow); // 6. 行の高さ（内容に応じて自動調整）
  applyStatusValidation_(sheet);  // 7. 状態のプルダウン
  applyStatusColors_(sheet);      // 8. 状態ごとの色（条件付き書式）
  freezeHeaderRow_(sheet);        // 9. 1行目を固定
  applyFilter_(sheet);            // 10. フィルター
  applyBorders_(sheet);           // 11. 罫線
  applyCategorySeparators_(sheet, lastDataRow); // 12. 大項目の区切り線

  // 画面の表示位置をA1に戻して見やすくする
  sheet.setActiveSelection('A1');
  SpreadsheetApp.flush();
}

// ============================================================
// 各処理（メイン関数から順番に呼ばれる部品）
// ============================================================

/**
 * 対象のスプレッドシートを取得する。
 * TARGET_SPREADSHEET_ID が空なら、今開いているファイルを使う。
 */
function getTargetSpreadsheet_() {
  if (TARGET_SPREADSHEET_ID) {
    return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      'スプレッドシートが見つかりません。' +
      'このスクリプトを対象ファイルに紐づけるか、TARGET_SPREADSHEET_ID にIDを設定してください。'
    );
  }
  return active;
}

/**
 * 指定名のシートを取得する。無ければ新規作成する。
 * ※ 同名シートがあっても削除・作り直しは絶対にしない（既存データを守るため）
 */
function getOrCreateSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) {
    return sheet;
  }
  return spreadsheet.insertSheet(sheetName);
}

/**
 * 書式を入れるための行数・列数を確保する。
 * 足りない場合だけ追加し、多い場合に削ることはしない（既存データを守るため）。
 */
function ensureSheetSize_(sheet) {
  if (sheet.getMaxRows() < MAX_ROWS) {
    sheet.insertRowsAfter(sheet.getMaxRows(), MAX_ROWS - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < LAST_COL) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), LAST_COL - sheet.getMaxColumns());
  }
}

/** ヘッダー（1行目）の文字を書き込む */
function writeHeader_(sheet) {
  sheet.getRange(1, 1, 1, LAST_COL).setValues([HEADERS]);
}

/**
 * サンプルデータを入力する。
 * ただし次の場合は何もしない。
 *   - INSERT_SAMPLE_DATA が false のとき（既定。中身は手入力する想定）
 *   - 2行目以降にすでに何か入力されているとき（入力内容を上書きしないため）
 */
function writeSampleDataIfEmpty_(sheet) {
  if (!INSERT_SAMPLE_DATA || !isDataAreaEmpty_(sheet)) {
    return;
  }
  sheet.getRange(2, 1, SAMPLE_DATA.length, LAST_COL).setValues(SAMPLE_DATA);
}

/** 2行目以降（A〜G列）が完全に空かどうかを判定する */
function isDataAreaEmpty_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return true;
  }
  var values = sheet.getRange(2, 1, lastRow - 1, LAST_COL).getValues();
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).trim() !== '') {
        return false;
      }
    }
  }
  return true;
}

/** データが入っている最終行を返す（最低でも2行目扱い） */
function getLastDataRow_(sheet) {
  return Math.max(sheet.getLastRow(), 2);
}

/** ヘッダーのデザイン：濃紺背景＋白文字＋太字＋中央揃え */
function applyHeaderStyle_(sheet) {
  sheet.getRange(1, 1, 1, LAST_COL)
    .setBackground(COLORS.HEADER_BG)
    .setFontColor(COLORS.HEADER_FONT)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, ROW_HEIGHT.HEADER);
}

/**
 * 列ごとのデザインを2行目〜MAX_ROWS行目まで一括で適用する。
 * 事前に500行まで書式を入れておくことで、
 * 後から行を追加してもデザインが崩れないようにしている。
 */
function applyColumnStyles_(sheet) {
  var numRows = MAX_ROWS - 1; // 2行目〜MAX_ROWS行目

  // まず全体の共通設定（白背景・折り返し・上下中央）
  sheet.getRange(2, 1, numRows, LAST_COL)
    .setBackground(COLORS.WHITE)
    .setFontColor(COLORS.BODY_FONT)
    .setFontWeight('normal')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left')
    .setWrap(true);

  // A列：No. → 中央揃え・白背景
  sheet.getRange(2, COL.NO, numRows, 1)
    .setHorizontalAlignment('center');

  // B列：大項目 → 薄紺背景・濃紺文字・太字
  sheet.getRange(2, COL.CATEGORY, numRows, 1)
    .setBackground(COLORS.CATEGORY_BG)
    .setFontColor(COLORS.CATEGORY_FONT)
    .setFontWeight('bold');

  // C列：小項目 → 白背景・太字・濃いグレー
  sheet.getRange(2, COL.ITEM, numRows, 1)
    .setFontWeight('bold')
    .setFontColor(COLORS.ITEM_FONT);

  // D列：内容・設定 → 白背景・通常文字・左揃え（共通設定のまま）

  // E列：理由 → 薄いグレー背景
  sheet.getRange(2, COL.REASON, numRows, 1)
    .setBackground(COLORS.REASON_BG);

  // F列：メモ → 薄い黄色背景
  sheet.getRange(2, COL.MEMO, numRows, 1)
    .setBackground(COLORS.MEMO_BG);

  // G列：状態 → 中央揃え（背景色は条件付き書式で自動的に付く）
  sheet.getRange(2, COL.STATUS, numRows, 1)
    .setHorizontalAlignment('center');
}

/** 列幅を設定する */
function applyColumnWidths_(sheet) {
  for (var column in COLUMN_WIDTHS) {
    sheet.setColumnWidth(Number(column), COLUMN_WIDTHS[column]);
  }
}

/**
 * 行の高さを整える。
 * 1) まず全行を最低の高さ（40px）にそろえる
 * 2) データがある行は内容に合わせて自動調整する
 * 3) 自動調整で40pxより低くなった行は40pxに戻す
 */
function applyRowHeights_(sheet, lastDataRow) {
  sheet.setRowHeights(2, MAX_ROWS - 1, ROW_HEIGHT.MIN_BODY);

  if (lastDataRow < 2) {
    return;
  }
  sheet.autoResizeRows(2, lastDataRow - 1);

  for (var row = 2; row <= lastDataRow; row++) {
    if (sheet.getRowHeight(row) < ROW_HEIGHT.MIN_BODY) {
      sheet.setRowHeight(row, ROW_HEIGHT.MIN_BODY);
    }
  }
}

/** G列（状態）にプルダウンを設定する */
function applyStatusValidation_(sheet) {
  var labels = STATUS_OPTIONS.map(function (option) {
    return option.label;
  });

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(labels, true) // true = プルダウンの矢印を表示
    .setAllowInvalid(false)           // 選択肢以外は入力できないようにする
    .setHelpText('状態は ' + labels.join(' / ') + ' から選択してください。')
    .build();

  sheet.getRange(2, COL.STATUS, MAX_ROWS - 1, 1).setDataValidation(rule);
}

/**
 * 状態ごとの色を「条件付き書式」で設定する。
 * 条件付き書式なので、後から行を追加して状態を選んでも自動で色が付く。
 */
function applyStatusColors_(sheet) {
  var statusRange = sheet.getRange(2, COL.STATUS, MAX_ROWS - 1, 1);
  var statusA1 = statusRange.getA1Notation();

  // このシートの既存ルールのうち、状態列以外のものは残す
  var keptRules = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (range) {
      return range.getA1Notation() === statusA1;
    });
  });

  // 状態ごとのルールを作り直す
  STATUS_OPTIONS.forEach(function (option) {
    var rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(option.label)
      .setBackground(option.background)
      .setFontColor(option.fontColor)
      .setRanges([statusRange])
      .build();
    keptRules.push(rule);
  });

  sheet.setConditionalFormatRules(keptRules);
}

/** 1行目（ヘッダー）を固定してスクロールしても見えるようにする */
function freezeHeaderRow_(sheet) {
  sheet.setFrozenRows(1);
}

/**
 * 表全体にフィルターを設定する。
 * すでにフィルターがある場合は、範囲を作り直すために一度外してから付け直す
 * （フィルターの付け外しはセルの中身には影響しない）。
 */
function applyFilter_(sheet) {
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  sheet.getRange(1, 1, MAX_ROWS, LAST_COL).createFilter();
}

/**
 * 罫線を引く。
 * 表全体は薄いグレーの細線、ヘッダーの下だけ少し強めの線にする。
 */
function applyBorders_(sheet) {
  var borderColor = COLORS.BORDER;

  // 表全体（ヘッダー＋500行）に薄い格子線
  sheet.getRange(1, 1, MAX_ROWS, LAST_COL).setBorder(
    true, true, true, true, true, true,
    borderColor, SpreadsheetApp.BorderStyle.SOLID
  );

  // ヘッダーの下だけ少し太い線にして、表の始まりを分かりやすくする
  sheet.getRange(1, 1, 1, LAST_COL).setBorder(
    null, null, true, null, null, null,
    COLORS.HEADER_BG, SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );
}

/**
 * 大項目（B列）が切り替わる行の上に、少し太めの罫線を引く。
 * カテゴリーの区切りが一目で分かるようにするため。
 */
function applyCategorySeparators_(sheet, lastDataRow) {
  if (lastDataRow < 3) {
    return; // データが1行しかなければ区切りは不要
  }

  var categories = sheet
    .getRange(2, COL.CATEGORY, lastDataRow - 1, 1)
    .getValues();

  for (var i = 1; i < categories.length; i++) {
    var current = String(categories[i][0]).trim();
    var previous = String(categories[i - 1][0]).trim();

    // 空欄は区切り扱いにしない
    if (current === '' || current === previous) {
      continue;
    }

    var row = i + 2; // 配列の位置 → 実際の行番号
    sheet.getRange(row, 1, 1, LAST_COL).setBorder(
      true, null, null, null, null, null,
      COLORS.HEADER_BG, SpreadsheetApp.BorderStyle.SOLID_MEDIUM
    );
  }
}
