import json
import random
from datetime import datetime, timedelta
import boto3

# --- 設定 ---
TABLE_NAME = 'SaaS_Analytics_Data' # AWSコンソールで作成したテーブル名と一致させる
REGION_NAME = 'ap-northeast-1'
NUM_USERS = 100 # 生成する架空のユーザー数
DAYS_TO_GENERATE = 30 # 過去30日間のデータを生成
EVENTS = ["PageView", "AddToCart", "Checkout", "Error"]
USER_TIERS = ["Free", "Premium", "Enterprise"]

# DynamoDBに接続（認証情報は環境変数やAWS CLI設定から自動で取得されます）
try:
    dynamodb = boto3.resource('dynamodb', region_name=REGION_NAME)
    table = dynamodb.Table(TABLE_NAME)
except Exception as e:
    print(f"DynamoDBの接続に失敗しました。AWS認証情報やリージョンを確認してください: {e}")
    exit()

def generate_and_put_data():
    """架空のイベントデータを生成し、DynamoDBにバッチ投入する"""
    print(f"--- {TABLE_NAME} テーブルへのデータ投入を開始 ---")
    
    user_ids = [f"USER#{1000 + i}" for i in range(NUM_USERS)]
    start_date = datetime.now() - timedelta(days=DAYS_TO_GENERATE)
    
    all_items = []
    
    for i in range(DAYS_TO_GENERATE):
        current_date = start_date + timedelta(days=i)
        num_events_today = random.randint(1000, 2000) # 1日あたりのイベント数

        for _ in range(num_events_today):
            user_id = random.choice(user_ids)
            event_type = random.choice(EVENTS)
            user_tier = random.choice(USER_TIERS)
            timestamp = current_date + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59), seconds=random.randint(0, 59))
            
            # DynamoDBのデータ構造（PK/SK設計）
            item = {
                'PK': user_id,  # Partition Key: ユーザーID
                'SK': f"EVENT#{timestamp.strftime('%Y%m%d%H%M%S')}", # Sort Key: 時系列イベント
                'EventType': event_type,
                'Timestamp': timestamp.isoformat(),
                'DateKey': current_date.strftime('%Y-%m-%d'),
                'UserTier': user_tier, # GSIなどで利用可能な属性
                'Value': random.randint(100, 5000) if event_type == 'Checkout' else 0, # 売上データ
            }
            all_items.append(item)
    
    print(f"合計 {len(all_items)} 件のデータを生成しました。DynamoDBへ投入中...")
    
    # バッチライターを使って効率的に投入
    with table.batch_writer() as batch:
        for item in all_items:
            batch.put_item(Item=item)

    print("--- 全データ投入完了 ---")

if __name__ == "__main__":
    generate_and_put_data()