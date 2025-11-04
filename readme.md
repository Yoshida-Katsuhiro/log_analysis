サーバーレスアクセス解析ダッシュボード (Serverless Access Dashboard)
本プロジェクトは、AWS Lambda、API Gateway、および React/TypeScript を用いて構築された、シンプルで高速なアクセス解析ダッシュボードアプリケーションです。

プロジェクト概要
このダッシュボードは、シミュレーションされた日次のアクセスイベントデータを視覚化し、以下の主要な指標とグラフを提供します。

総イベント数、日次平均イベント数、イベントタイプ数

日別イベントトレンド (棒グラフ)

イベントタイプ別内訳 (ドーナツグラフ)

アーキテクチャ
フロントエンド

技術: React (TypeScript), Tailwind CSS, Chart.js

役割: UIの構築、APIからのデータ取得と描画。

バックエンド

技術: AWS Lambda (Python)

役割: ダッシュボードデータ生成・集計処理。

API

技術: Amazon API Gateway

役割: フロントエンドからのリクエストを受け付け、Lambdaへルーティング。

データベース

(今回はシミュレーションデータを使用)

役割: 今後の拡張のためのデータ格納場所として想定。

環境構築と実行
1. バックエンド (AWS Lambda + API Gateway)
Lambda関数 (backend/) を作成し、Pythonコードをデプロイします。

API Gatewayで HTTP API または REST API を作成し、Lambda関数と統合します。

API GatewayのエンドポイントURLを控えます。

2. フロントエンド (React)
プロジェクトルート (frontend/) に移動し、依存関係をインストールします。

Bash

npm install
# または yarn install
src/App.tsx 内で、API GatewayのエンドポイントURLを適切に設定します。

アプリケーションを起動します。

Bash

npm run start
# または yarn start
開発過程における主要なトラブルシューティングの記録 (Chronicle)
本プロジェクトの開発において、特に重要だった技術的課題と、その解決策を記録します。

1. API通信とCORS問題の解決
課題: APIへのアクセスは成功しているにも関わらず、ブラウザ側でセキュリティエラー（CORSエラー）が発生し、データが利用できない状態でした。

原因: ReactアプリとAPI Gatewayのオリジンが異なるため、APIレスポンスに適切な Access-Control-Allow-Origin ヘッダーが含まれておらず、ブラウザのセキュリティ機能がブロックしていました。

解決策: API Gatewayの「統合レスポンス」設定ではなく、Lambda関数のPythonコード内で、HTTPレスポンスヘッダーにCORSを明示的に許可する設定 ('Access-Control-Allow-Origin': '*') を追加することで解決しました。

Python

# Lambda レスポンスヘッダーの設定例
response = {
    'statusCode': 200,
    'headers': {
        # ここが最も重要な設定
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json'
    },
    # ... 他の処理 ...
}
return response
2. Tailwind CSSの統合
課題: Tailwind CSSを利用するための複雑なビルド設定を避けたい。

解決策: ビルドプロセス不要な Tailwind CDN (Content Delivery Network) を採用しました。frontend/public/index.html に以下の <script> タグを追加するだけで、Reactコンポーネント内ですべての Tailwind クラスを利用できるようになりました。

HTML

<script src="https://cdn.tailwindcss.com"></script>
3. Chart.js と TypeScript のインポート問題
課題: Chart.jsをCDNで読み込んでいるため、importするとコンパイルエラー（TS2307）が発生し、import typeに切り替えると、実行時に値が使えないエラー（TS1361）が発生しました。

解決策: Chart.jsがindex.htmlでロードされ、グローバル変数として利用できる前提でコードを記述しました。Reactコンポーネント内での import をすべて削除し、window.Chart オブジェクトを直接利用することで、TypeScriptのモジュール解決の制約を回避しました。