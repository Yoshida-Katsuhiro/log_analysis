// 必要なモジュールのインポート
// DocumentClientを削除し、標準クライアントとScanCommandのみを使用
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
// DynamoDBデータをJavaScriptオブジェクトに変換するヘルパー関数
import { unmarshall } from "@aws-sdk/util-dynamodb"; 

// 環境変数からテーブル名を取得 (お客様の環境に合わせて TABLE_NAME を使用)
const DYNAMO_TABLE_NAME = process.env.TABLE_NAME;

// DynamoDBクライアントの初期化 (ハンドラ外で一度だけ実行)
const client = new DynamoDBClient({
    // リージョンを明示的に指定
    region: process.env.AWS_REGION || "ap-northeast-1", 
});


/**
 * DynamoDBから全件スキャンを行い、集計データを返すLambdaハンドラ。
 */
export const handler = async (event) => {
    const now = new Date();

    if (!DYNAMO_TABLE_NAME) {
        console.error("Critical: TABLE_NAME environment variable is not set.");
        // 🚨 500エラー時もCORSヘッダーは必要 🚨
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: "error", message: "Lambda environment not configured (Missing TABLE_NAME)." }),
        };
    }
    
    // Scan操作のパラメータ設定 (ProjectionExpressionはSDK V3の標準形式を使用)
    const params = {
        TableName: DYNAMO_TABLE_NAME, 
        ProjectionExpression: "DateKey, EventType",
    };

    let allItemsRaw = []; 
    let exclusiveStartKey = undefined; 

    // 全件スキャン（Scan）を実行し、ページネーションを処理
    try {
        do {
            const command = new ScanCommand({
                ...params,
                ExclusiveStartKey: exclusiveStartKey,
            });

            const result = await client.send(command); 
            
            if (result.Items) {
                allItemsRaw = allItemsRaw.concat(result.Items);
            }
            exclusiveStartKey = result.LastEvaluatedKey;
            
        } while (exclusiveStartKey);
        
        // データをJavaScriptオブジェクトに変換
        const allItems = allItemsRaw.map(item => unmarshall(item));

        // --- データ集計ロジック (省略せず保持) ---
        const dailyTrendMap = new Map();
        const typeBreakdownMap = new Map();

        allItems.forEach(item => {
            const date = item.DateKey || "unknown";
            const type = item.EventType || "Other";

            dailyTrendMap.set(date, (dailyTrendMap.get(date) || 0) + 1);
            typeBreakdownMap.set(type, (typeBreakdownMap.get(type) || 0) + 1);
        });

        const totalEvents = allItems.length;

        const dailyTrend = Array.from(dailyTrendMap.entries())
            .map(([date, accesses]) => ({ date, accesses }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const typeBreakdown = Array.from(typeBreakdownMap.entries())
            .map(([name, value]) => ({
                name,
                value,
                // totalEventsが0の時を考慮
                percentage: totalEvents > 0 ? ((value / totalEvents) * 100).toFixed(1) : 0,
            }));

        // --- 最終レスポンスの作成 ---
        const responseBody = {
            status: "success",
            data: {
                dailyTrend,
                typeBreakdown,
                totalEvents,
                lastUpdated: now.toISOString(),
            }
        };

        // 🚨 成功時のレスポンスにCORSヘッダーを追加 🚨
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // 必須
                'Access-Control-Allow-Methods': 'OPTIONS,GET',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseBody),
        };

    } catch (error) {
        // DynamoDBからのデータ取得エラー
        console.error("CRITICAL DynamoDB Scan failed:", error);
        
        // 🚨 500エラー時もCORSヘッダーを追加 🚨
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                status: "error", 
                message: "Failed to fetch data from DynamoDB.", 
                error: error instanceof Error ? error.message : "Unknown database error" 
            }),
        };
    }
};
