※ めっっっちゃくちゃアイデア段階のもので，割と AI に書いてもらった．

ちまちま読んで考えて，修正・追記していく．

# Vue.js 言語仕様策定に関するアイデア

## 概要

Vue.js の非言語依存な言語仕様（Language Specification）を作成するにあたり、ECMAScript 仕様や Test262 を参考にした形式表現と配布方法のアイデアをまとめる。

---

## 0. モチベーション

### 0.1 背景と課題

現在の Vue.js エコシステムには以下の課題がある：

1. **実装依存の仕様**: Vue.js の「仕様」は実質的に `vuejs/core` の実装そのものであり、形式的な仕様書が存在しない
2. **代替実装の困難さ**: Vapor Mode や他言語実装（Rust、Go 等）を開発する際、正確な振る舞いの参照先がない

### 0.2 目的

本プロジェクトの目的は以下の通り：

#### 代替実装の互換性担保

- `vuejs/core` 以外の実装（Vapor Mode、他言語実装、軽量版など）が参照できる形式仕様を提供
- 実装間の互換性を客観的に検証可能なテストスイートを整備
- 「Vue.js 準拠」の明確な基準を確立

```
[Vue.js Language Specification]
        ↓ 参照
   ┌────┴────┐
   ↓         ↓
vuejs/core   代替実装
(参照実装)    ├── Vapor Mode
             ├── vue-mini (軽量版)
             ├── vue-rust (Rust 実装)
             └── その他
        ↓
[Conformance Test Suite]
        ↓
  互換性レポート
```

#### AI による仕様駆動実装の効率化

形式仕様が存在することで、AI を活用した開発が大幅に効率化される：

| シナリオ         | 従来                   | 仕様駆動               |
| ---------------- | ---------------------- | ---------------------- |
| 新機能実装       | 既存コードを読み解く   | 仕様から直接生成       |
| バグ修正         | 期待動作の推測が必要   | 仕様に基づく明確な判断 |
| コードレビュー   | レビュアーの知識に依存 | 仕様準拠の自動検証     |
| テスト生成       | 手動でケース作成       | 仕様からテスト自動生成 |
| ドキュメント作成 | 実装から逆起こし       | 仕様から直接生成       |

#### 最適化パスのナレッジ共有

Vue.js には多くの最適化技術が実装されているが、これらの知見は実装コードに埋もれている。
仕様として体系化することで、代替実装でも同等の最適化が可能になる：

#### ベンチマークでの最適化効果測定

#### エコシステムの健全な発展

- **学習リソース**: 新規参入者が Vue.js の動作を体系的に学習できる
- **ツール開発**: IDE 補完、Linter、型チェッカー等が仕様を参照して正確に動作
- **長期的な安定性**: 実装の詳細に依存しない、安定した API 契約の提供
- **最適化ナレッジ**: コンパイラ・ランタイム最適化の知見を体系的に共有

### 0.3 期待される効果

| 効果                 | 詳細                               |
| -------------------- | ---------------------------------- |
| **開発速度向上**     | AI + 仕様で実装時間を大幅短縮      |
| **品質向上**         | 仕様ベースのテストで網羅的な検証   |
| **エコシステム拡大** | 代替実装の参入障壁低下             |
| **コミュニティ成長** | 仕様議論を通じた技術的対話の活性化 |
| **長期保守性**       | 実装非依存の仕様で将来の変更に強い |

### 0.4 スコープ

本仕様がカバーする範囲：

- **In Scope**:

  - SFC 構文とその解釈 (setup や compiler macro，vapor など)
  - テンプレート構文（ディレクティブ、補間、イベント）
  - Reactivity API の振る舞い
  - コンポーネントシステム（props、emits、slots、lifecycle）
  - 組み込みコンポーネント（Transition、Teleport 等）
---

## 1. 仕様の構成要素

### 1.1 構文規則 (Syntax)

Vue.js の構文は以下の領域に分けられる：

- **SFC (Single File Component) 構文**: `<template>`, `<script>`, `<style>` ブロックの構造
- **バインディング**: BindingMeta の情報など
- **テンプレート構文**: ディレクティブ (`v-if`, `v-for`, `v-bind` 等)、Mustache 補間、イベントハンドリング
- **コンポーネント定義**: Options API / Composition API の構造

### 1.2 評価規則 (Semantics)

評価規則は **SFC（入力）+ インタラクション → HTML/DOM（出力）** の変換として定義する。

内部実装（リアクティビティシステムの詳細など）には依存せず、観測可能な振る舞いを規定する。\
(パフォーマンスベンチや最適化パスは欲しい．)

#### 評価モデル

```
[SFC Source] + [Initial Props/State] → [Initial HTML]
                    ↓
            [User Interaction / Event]
                    ↓
[SFC Source] + [Updated State] → [Updated HTML]
```

#### 規定すべき振る舞い

- **初期レンダリング**: SFC と初期状態から生成される HTML 構造
- **状態変更時の再レンダリング**: 状態変更後に生成される HTML の差分
- **イベントハンドリング**: ユーザーインタラクションによる状態遷移と結果の HTML
- **条件付きレンダリング**: `v-if`, `v-show` による DOM の出現/消失
- **リストレンダリング**: `v-for` による DOM 要素の生成規則
- **スロット解決**: 親から渡されたコンテンツの挿入位置と最終 HTML
- **ライフサイクル**: 各フェーズで期待される HTML 状態

---

## 2. 形式表現の選択肢

### 2.1 構文定義

| 形式                                 | 利点                         | 欠点                      |
| ------------------------------------ | ---------------------------- | ------------------------- |
| **EBNF (Extended BNF)**              | 標準的、ツールサポート豊富   | 文脈依存の表現が困難      |
| **PEG (Parsing Expression Grammar)** | 曖昧さがない、実装に直結     | 左再帰の扱いが特殊        |
| **ABNF (RFC 5234)**                  | インターネット標準との親和性 | ECMAScript 界隈では非主流 |

**推奨**: ECMAScript との一貫性を考慮し、**EBNF** をベースに、必要に応じて prose での補足を加える形式

### 2.2 意味論定義

| 形式                                      | 利点                           | 欠点                       |
| ----------------------------------------- | ------------------------------ | -------------------------- |
| **操作的意味論 (Operational Semantics)**  | 直感的、実装に近い             | 形式的証明が複雑になりがち |
| **表示的意味論 (Denotational Semantics)** | 数学的に厳密                   | 抽象度が高く理解が難しい   |
| **ECMAScript スタイルの擬似コード**       | 既存の JS 開発者に親しみやすい | 形式的厳密さに欠ける       |

**推奨**: **ECMAScript スタイルの擬似コード** + **小ステップ操作的意味論** のハイブリッド

```
// ECMAScript スタイルの例
1. Let _value_ be ? Get(_ref_, "value").
2. Perform ? Call(_effect_, undefined, « _value_ »).
3. Return NormalCompletion(undefined).
```

### 2.3 型定義

- TypeScript 風の型記法を仕様内で使用
- 形式的な型システムの記述には型推論規則を使用

---

## 3. 配布形式

### 3.1 仕様書本体

| 形式         | ツール              | 利点                           |
| ------------ | ------------------- | ------------------------------ |
| **Bikeshed** | W3C 標準            | Web 標準との親和性、自動リンク |
| **Ecmarkup** | ECMAScript 公式     | ECMAScript 仕様との一貫性      |
| **mdBook**   | Rust エコシステム   | Markdown ベース、シンプル      |
| **Sphinx**   | Python エコシステム | 拡張性、多形式出力             |

**推奨**: **Ecmarkup** または **Bikeshed**

- ECMAScript との親和性を重視するなら Ecmarkup
- Web 標準全般との連携を重視するなら Bikeshed

### 3.2 機械可読形式

仕様の一部を機械可読形式で提供することで、ツール連携を促進：

```yaml
# grammar.yaml
SFC:
  blocks:
    - name: template
      required: false
      attributes:
        lang: [html, pug, slotted]
    - name: script
      required: false
      attributes:
        lang: [js, ts]
        setup: boolean
    - name: style
      required: false
      attributes:
        scoped: boolean
        module: boolean
```

### 3.3 バージョニング

- セマンティックバージョニング (SemVer) に準拠
- Vue.js 本体のバージョンとの対応表を維持
- 仕様のスナップショットを Git タグで管理

---

## 4. テストスイート設計

### 4.1 Test262 スタイルの構造

```
tests/
├── harness/                     # テストハーネス（言語非依存）
│   ├── runner-schema.json       # テスト形式のスキーマ定義
│   ├── interaction-types.json   # インタラクション種別の定義
│   └── html-comparator.json     # HTML 比較ルール
├── rendering/                   # レンダリング結果のテスト
│   ├── conditional/             # v-if, v-show
│   │   ├── v-if-basic.test.yaml
│   │   ├── v-if-else.test.yaml
│   │   └── v-show.test.yaml
│   ├── list/                    # v-for
│   │   ├── array-basic.test.yaml
│   │   └── keyed-list.test.yaml
│   ├── binding/                 # v-bind, v-model
│   │   ├── class-binding.test.yaml
│   │   └── style-binding.test.yaml
│   └── events/                  # イベントハンドリング
│       ├── click.test.yaml
│       └── input.test.yaml
├── components/                  # コンポーネント関連
│   ├── props/
│   ├── slots/
│   └── emit/
├── lifecycle/                   # ライフサイクルごとの HTML 状態
│   ├── mount.test.yaml
│   └── unmount.test.yaml
└── metadata/
    └── features.yaml            # 機能一覧とテストのマッピング
```

### 4.2 テストケース形式

**SFC + インタラクション → HTML** の入出力形式でテストを記述：

```yaml
# tests/rendering/conditional/v-if-basic.test.yaml
meta:
  description: v-if conditionally renders element based on truthy value
  features: [conditional-rendering, v-if]
  spec_section: "3.2.1"

sfc: |
  <script setup>
  import { ref } from 'vue'
  const visible = ref(true)
  </script>
  <template>
    <div>
      <span v-if="visible" data-testid="target">Hello</span>
    </div>
  </template>

scenarios:
  - name: initial render with true
    initial_state:
      visible: true
    expected_html: |
      <div><span data-testid="target">Hello</span></div>

  - name: initial render with false
    initial_state:
      visible: false
    expected_html: |
      <div><!--v-if--></div>

  - name: toggle from true to false
    initial_state:
      visible: true
    interactions:
      - type: state_change
        target: visible
        value: false
    expected_html: |
      <div><!--v-if--></div>
```

```yaml
# tests/rendering/events/click-counter.test.yaml
meta:
  description: Click event updates state and re-renders
  features: [event-handling, reactivity]
  spec_section: "4.1.2"

sfc: |
  <script setup>
  import { ref } from 'vue'
  const count = ref(0)
  const increment = () => count.value++
  </script>
  <template>
    <button @click="increment" data-testid="btn">{{ count }}</button>
  </template>

scenarios:
  - name: initial render
    expected_html: |
      <button data-testid="btn">0</button>

  - name: after single click
    interactions:
      - type: click
        target: "[data-testid='btn']"
    expected_html: |
      <button data-testid="btn">1</button>

  - name: after multiple clicks
    interactions:
      - type: click
        target: "[data-testid='btn']"
        repeat: 3
    expected_html: |
      <button data-testid="btn">3</button>
```

### 4.3 言語非依存性の実現

テストは抽象的な操作として記述し、各言語実装用のランナーが解釈：

```
[抽象テスト定義 (YAML/JSON)]
        ↓
[テストランナー]
   ├── JavaScript Runner
   ├── Rust Runner (for Vapor mode / alternative impl)
   └── ... 他の実装用ランナー
```

### 4.4 パフォーマンスベンチマーク

適合性テストに加え、実装間のパフォーマンス比較を可能にするベンチマークスイートを提供。

#### ディレクトリ構造

```
benchmarks/
├── harness/
│   ├── bench-schema.json        # ベンチマーク形式のスキーマ
│   ├── metrics.json             # 計測メトリクス定義
│   └── environment.json         # 実行環境の標準化定義
├── rendering/
│   ├── large-list/              # 大規模リストレンダリング
│   │   ├── 1k-items.bench.yaml
│   │   ├── 10k-items.bench.yaml
│   │   └── keyed-reorder.bench.yaml
│   ├── deep-update/             # 深いネスト更新
│   │   └── nested-state.bench.yaml
│   └── conditional/             # 条件分岐の切り替え
│       └── toggle-heavy.bench.yaml
├── reactivity/
│   ├── dependency-tracking/     # 依存関係追跡のオーバーヘッド
│   ├── batch-updates/           # バッチ更新の効率
│   └── computed-chain/          # computed の連鎖
├── compilation/
│   ├── template-parse/          # テンプレートパース時間
│   └── code-generation/         # コード生成時間
└── memory/
    ├── component-instances/     # コンポーネントインスタンスのメモリ
    └── reactive-objects/        # リアクティブオブジェクトのメモリ
```

#### ベンチマーク形式

```yaml
# benchmarks/rendering/large-list/10k-items.bench.yaml
meta:
  description: Render and update a list with 10,000 items
  category: rendering
  tags: [list, v-for, large-scale]

sfc: |
  <script setup>
  import { ref } from 'vue'
  const items = ref(Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    label: `Item ${i}`
  })))
  const swap = () => {
    const tmp = items.value[1]
    items.value[1] = items.value[items.value.length - 2]
    items.value[items.value.length - 2] = tmp
  }
  </script>
  <template>
    <div>
      <div v-for="item in items" :key="item.id">{{ item.label }}</div>
    </div>
  </template>

scenarios:
  - name: initial_render
    measure: time_to_first_render
    iterations: 100
    warmup: 10

  - name: swap_two_items
    setup:
      - mount_component
    measure: time_to_update
    action:
      type: call_method
      target: swap
    iterations: 1000
    warmup: 100

  - name: replace_all_items
    setup:
      - mount_component
    measure: time_to_update
    action:
      type: state_change
      target: items
      value: "Array.from({ length: 10000 }, (_, i) => ({ id: i + 10000, label: `New ${i}` }))"
    iterations: 100
    warmup: 10

metrics:
  - type: time
    unit: ms
    percentiles: [p50, p75, p90, p99]
  - type: memory
    unit: MB
    measure: [heap_used, heap_total]
  - type: ops_per_second
```

#### 計測メトリクス

| メトリクス             | 説明                           | 単位  |
| ---------------------- | ------------------------------ | ----- |
| `time_to_first_render` | 初期レンダリング完了までの時間 | ms    |
| `time_to_update`       | 状態変更から DOM 更新完了まで  | ms    |
| `time_to_hydrate`      | SSR ハイドレーション完了まで   | ms    |
| `memory_baseline`      | アイドル時のメモリ使用量       | MB    |
| `memory_peak`          | ピーク時のメモリ使用量         | MB    |
| `ops_per_second`       | 1 秒あたりの操作回数           | ops/s |
| `gc_pause_time`        | GC による停止時間              | ms    |

#### 結果出力形式

```json
{
	"benchmark": "rendering/large-list/10k-items",
	"implementation": "vue@3.4.0",
	"environment": {
		"runtime": "node@20.10.0",
		"os": "linux-x64",
		"cpu": "AMD Ryzen 9 5900X",
		"memory": "32GB"
	},
	"results": {
		"initial_render": {
			"time": {
				"p50": 45.2,
				"p75": 48.1,
				"p90": 52.3,
				"p99": 61.8,
				"unit": "ms"
			},
			"memory": {
				"heap_used": 128.5,
				"heap_total": 256.0,
				"unit": "MB"
			}
		},
		"swap_two_items": {
			"time": {
				"p50": 0.8,
				"p75": 1.1,
				"p90": 1.4,
				"p99": 2.1,
				"unit": "ms"
			},
			"ops_per_second": 1250
		}
	},
	"timestamp": "2024-01-15T10:30:00Z"
}
```

#### ベンチマーク実行の標準化

実装間で公平な比較を可能にするため、以下を標準化：

1. **ウォームアップ**: JIT コンパイル等の影響を排除
2. **イテレーション数**: 統計的に有意な結果を得るための最小回数
3. **環境正規化**: CPU/メモリ使用率、バックグラウンドプロセスの制御
4. **GC 制御**: 計測前の強制 GC、計測中の GC 影響の記録
5. **結果の統計処理**: 外れ値除去、パーセンタイル算出

---

## 5. 配布方法

### 5.1 プライマリ配布

- **GitHub リポジトリ**: ソース of truth
- **GitHub Pages**: HTML 形式の仕様書
- **npm パッケージ**: `@vuejs/language-spec` として配布
  - 機械可読な仕様定義
  - テストスイート
  - 型定義

### 5.2 付随ツール

- **仕様ビューア**: インタラクティブな仕様閲覧 Web アプリ
- **テストランナー**: 実装の適合性検証ツール
- **Linter プラグイン**: 仕様準拠のコード検証

---

## 6. 参考にすべき既存仕様

| 仕様                 | 参考ポイント                           |
| -------------------- | -------------------------------------- |
| ECMAScript           | 全体構成、擬似コードスタイル、構文定義 |
| HTML Living Standard | 解析アルゴリズムの記述方法             |
| CSS Specifications   | カスケーディング規則の形式化           |
| WebAssembly          | 形式的意味論の記述                     |
| JSON Schema          | 機械可読な構造定義                     |

---

## 7. 実装ロードマップ案

### Phase 1: 基盤整備

- 仕様書フォーマットの決定と環境構築
- 構文定義 (SFC, テンプレート) の形式化
- 基本的なテストハーネスの設計

### Phase 2: コア仕様

- リアクティビティシステムの形式化
- テンプレートコンパイル規則
- ライフサイクルの状態遷移定義

### Phase 3: テストスイート

- テストケース形式の確定
- コアテストの作成
- ランナー実装（JavaScript 向け）

### Phase 4: エコシステム

- 仕様ビューア
- 適合性テストツール
- コミュニティフィードバックの反映
