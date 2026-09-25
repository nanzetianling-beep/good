# ポッキリ.Night 初期設定キット

導入時に店舗情報を集める3つの成果物(①導入アンケート・②記入テンプレート・③対面レクチャー資料)を、
1つの項目定義 `spec/items.yaml` から生成します。要件は [docs/requirements.md](docs/requirements.md) を参照してください。

```sh
pip install -r requirements.txt
make all && python3 -m pytest -q
```

現在はフェーズ1(項目定義の作成)まで完了しています。
