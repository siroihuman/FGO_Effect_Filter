# FGO Effect Filter

@wiki「siroi_human」向けの、FGOサーヴァントのスキル・宝具効果検索ツールです。

- 対象Wiki: https://w.atwiki.jp/siroi_human/
- Author: argyi
- Version: 1.0.0

## @wikiへの設置

検索ページを「管理者のみ編集可能」に設定し、本文へ次の1行を記述してください。

```text
#include_js(https://cdn.jsdelivr.net/gh/siroihuman/FGO_Effect_Filter@main/Ra_FGOEffectFilter.js)
```

初回は画面上の「データ読込」を押してください。個別サーヴァントページから保有スキル・宝具・クラススキルを読み取り、ブラウザへ24時間キャッシュします。

詳細は `ATWIKI_INSTALL.txt` を参照してください。

## 主な検索条件

- スキル・宝具効果
- AND / OR
- 対象（自身、味方単体、味方全体、敵単体、敵全体）
- クラス
- レアリティ
- 保有スキル / 宝具 / クラススキル
- サーヴァント名

## 更新履歴

### v1.0.0

- 初版
- 個別ページ自動読取
- 強化後優先判定
- 効果検索
- AND / OR検索
- 対象検索
- クラス・レアリティ検索
- 検索範囲切替
- 24時間ローカルキャッシュ
- 読込進捗表示
- スマートフォン向けレイアウト対応
