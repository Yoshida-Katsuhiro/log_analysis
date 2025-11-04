サーバーレスアクセス解析ダッシュボード

プロジェクト概要
本プロジェクトは、AWS Lambda、Amazon API Gateway、および React/TypeScript を用いて構築された、シンプルなサーバーレスのアクセス解析ダッシュボードアプリケーションです。シミュレーションされた仮想のアクセスイベントデータを処理し、リアルタイムに近い形で結果を可視化することを目的としています。

主な機能
日別イベント数、イベントタイプ数、平均イベント数（日）のサマリー表示

日別イベントトレンドのグラフ表示

イベントタイプ別内訳のドーナツグラフ

プロジェクト構成（モノレポ構造）
このリポジトリは、複数のプロジェクトを一つのリポジトリで管理するモノレポ構造を採用しています。

コンポーネント別概要
1. aws-lambda/aggregation-api
技術スタック: Node.js (TypeScript)

役割: API Gateway経由のリクエストを受け付け、集計データを取得・返却するバックエンドLambda関数です。

2. logdata_gen
技術スタック: Python

役割: ログデータ生成シミュレーター。データ投入や定期的なデータ更新に使用します。

3. react-serverless-dashboard
技術スタック: React / TypeScript, Tailwind CSS, Chart.js

役割: ユーザーインターフェース。API Gatewayにリクエストを送り、取得したデータをグラフ表示するフロントエンドです。

環境構築と実行
1. AWSリソースのデプロイ
AWSコンソールまたは IaC（Infrastructure as Code）ツールを使用して、以下のリソースを構築してください。

DynamoDBテーブル: アクセスログデータを保存するためのテーブル。

Lambda関数: logdata_gen と aws-lambda/aggregation-api のコードをそれぞれ Lambda 関数としてデプロイします。

API Gateway: aggregation-api Lambdaに接続するREST APIを作成し、CORS設定を行います。

2. バックエンド（Lambda）の設定
各Lambdaプロジェクトのディレクトリで依存関係をインストールします。

Bash

# aggregation-api (Node.js) の依存関係インストール
cd aws-lambda/aggregation-api
npm install
Bash

# logdata_gen (Python) の依存関係インストール
cd logdata_gen
python -m venv myenv
source myenv/bin/activate  # Windows: .\myenv\Scripts\activate
pip install -r requirements.txt
3. フロントエンド（React）の設定
react-serverless-dashboard プロジェクトのルートで依存関係をインストールし、ローカルサーバーを起動します。

Bash

# 依存関係のインストール (npmを使用)
cd react-serverless-dashboard
npm install

# 開発サーバーの起動
npm run dev
ブラウザで表示されたURLにアクセスし、ダッシュボードが正しく表示されることを確認してください。

トラブルシューティング / 開発経緯の記録
1. 致命的な CORS (オリジン間リソース共有) の解決
問題: APIへのアクセスは成功しても、ブラウザ側でセキュリティエラーが発生し、データが利用できませんでした。

解決策: Lambda関数のレスポンスにCORSヘッダーを明示的に含めることで、ブラウザ側のブロックを解除しました。

JavaScript

// Lambda レスポンスヘッダーの設定（Node.jsの例）
{
    "statusCode": 200,
    "headers": {
        "Access-Control-Allow-Origin": "*", // 本番環境では特定のオリジンを指定
        "Access-Control-Allow-Headers": "Content-Type"
    },
    "body": "..."
}
2. Chart.js と TypeScript のインポート問題
問題: Chart.jsをCDNで読み込んでいるため、React側で import すると TypeScript のモジュール解決エラーが発生しました。

解決策: import を完全に削除し、public/index.htmlでChart.jsをロードした後、グローバルオブジェクトとしてアクセスすることで問題を回避しました。

JavaScript

// Reactコンポーネント内での対応
// importを避け、グローバルオブジェクトとしてアクセス
const ChartClass = window.Chart;
// ... ChartClass を使ってグラフインスタンスを作成 ...
3. Tailwind CSS の統合
解決策: 複雑なビルド設定を避けるため、public/index.html内でTailwind CDNを読み込む方法を採用し、即座にCSSフレームワークを利用できるようにしました。

HTML

<script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>