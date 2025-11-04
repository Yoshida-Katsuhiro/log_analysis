import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, TrendingUp, AlertTriangle, Loader } from 'lucide-react';

// --- Chart.jsの型定義と実行時クラスをグローバルから取得・定義 ---
// 外部CDNでロードされたChart.jsをTypeScriptが安全に利用するための準備です。
// すべてを 'any' として扱い、ビルド時のモジュール解決エラーを完全に回避します。
declare global {
    interface Window {
        Chart: any;
        // Chart.js v4.x の CDN (chart.umd.min.js) では、
        // 以下のコンポーネントがグローバルスコープに出ない可能性があるため、
        // 実行時の登録は、Chartインスタンス自体が行うものと信頼します。
        // もし動かない場合は、Chart.register(...)を削除し、
        // Chart.jsを CDN で読み込む際に "bundle" 版を使うか、
        // コンポーネントを明示的にグローバルに出すCDNを探す必要があります。
    }
}

// 実行時にグローバルスコープからChartクラスを取得 (存在しない場合は undefined)
const ChartClass = window.Chart;

// Chart.jsのインスタンスの型をanyとして定義し、型エラーを回避
type ChartInstance = any;
type ChartConfiguration = any;
type ChartData = any;
type ChartOptions = any;

// === 以前のコードからChart.registerを削除 ===
// Chart.js v4以降では、chart.umd.min.js が基本的な要素を自動登録していることが多いため、
// 強制的なコンポーネント登録コードを削除し、エラーの原因を減らします。
// if (ChartClass) { ChartClass.register(...) } のブロックは削除しました。


// お客様が指定されたAPI GatewayのURL
const API_ENDPOINT = "https://3hlsml0vtl.execute-api.ap-northeast-1.amazonaws.com/default/analytics-aggregator-api"; 
const CHART_COLORS: string[] = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

// --- データ型定義 ---
interface ChartDataItem { [key: string]: any; }
interface DailyTrendItem extends ChartDataItem { date: string; accesses: number; }
interface TypeBreakdownItem extends ChartDataItem { name: string; value: number; percentage?: string; }
interface AnalyticsData { 
    dailyTrend: DailyTrendItem[]; 
    typeBreakdown: TypeBreakdownItem[]; 
    totalEvents: number; 
    lastUpdated: string; 
}
interface ApiResponse { 
    status: 'success' | 'error'; 
    data?: AnalyticsData; 
    message?: string; 
}

// --- ヘルパー関数 ---

/** * ISO文字列を日本語の日時フォーマットに変換するヘルパー関数
 */
const formatDate = (isoDate: string): string => {
    try {
        const date = new Date(isoDate);
        return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP')}`;
    } catch (e) {
        return "N/A";
    }
};

// --- UIコンポーネント ---

/**
 * データサマリーカードコンポーネント
 */
interface DataCardProps { 
    title: string; 
    value: string | number | null | undefined; 
    icon: React.ReactElement; 
    color: 'indigo' | 'green' | 'red'; 
}
const DataCard: React.FC<DataCardProps> = ({ title, value, icon, color }) => {
    const colorMap = {
        indigo: { borderColor: 'border-indigo-500', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
        green: { borderColor: 'border-green-500', iconBg: 'bg-green-100', iconText: 'text-green-600' },
        red: { borderColor: 'border-red-500', iconBg: 'bg-red-100', iconText: 'text-red-600' },
    };

    const { borderColor, iconBg, iconText } = colorMap[color];
    const displayValue = value !== null && value !== undefined ? value.toLocaleString() : '-';
    
    return (
        // max-w-xsでカード自体の最大幅を制限し、シャドウとアニメーションを追加
        <div className={`bg-white shadow-xl rounded-xl p-6 flex items-center transition-all duration-300 transform hover:scale-[1.02] border-b-4 ${borderColor} max-w-xs w-full`}>
            <div className={`p-3 rounded-full ${iconBg} ${iconText} mr-4`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-extrabold text-gray-900">{displayValue}</p>
            </div>
        </div>
    );
};

// --- メインコンポーネント ---
const App: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null); 
    
    // Chart.js用のRef
    const dailyChartRef = useRef<HTMLCanvasElement>(null);
    const pieChartRef = useRef<HTMLCanvasElement>(null);
    // ChartInstance型を使用 (any)
    const dailyChartInstance = useRef<ChartInstance | null>(null);
    const pieChartInstance = useRef<ChartInstance | null>(null);

    // Chart.jsで日別トレンドグラフを描画
    const drawDailyTrendChart = (dailyTrend: DailyTrendItem[]) => {
        if (!dailyChartRef.current) return;
        
        if (!ChartClass) {
            console.error("Chart.jsクラスが利用できないため、日別トレンドグラフを描画できません。");
            return;
        }

        // 既存のインスタンスがあれば破棄
        if (dailyChartInstance.current) {
            dailyChartInstance.current.destroy();
        }

        const ctx = dailyChartRef.current.getContext('2d');
        if (!ctx) return;

        const chartData: ChartData = { // any型
            labels: dailyTrend.map(d => d.date),
            datasets: [{
                label: 'イベント数',
                data: dailyTrend.map(d => d.accesses),
                backgroundColor: CHART_COLORS[0], // 濃い青
                borderRadius: 4,
            }]
        };

        const chartOptions: ChartOptions = { // any型
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        // contextの型をanyに変更
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== undefined) {
                                label += context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                },
            },
            scales: {
                x: {
                    type: 'category', 
                    title: { display: false },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear', 
                    beginAtZero: true,
                    title: { display: true, text: 'イベント数' },
                    ticks: {
                        callback: function(value: any) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        };

        const config: ChartConfiguration = { type: 'bar', data: chartData, options: chartOptions }; // any型
        dailyChartInstance.current = new ChartClass(ctx, config);
    };

    // Chart.jsでイベントタイプ別内訳グラフを描画
    const drawTypeBreakdownChart = (typeBreakdown: TypeBreakdownItem[], total: number) => {
        if (!pieChartRef.current) return;
        
        if (!ChartClass) {
            console.error("Chart.jsクラスが利用できないため、タイプ別内訳グラフを描画できません。");
            return;
        }

        // 既存のインスタンスがあれば破棄
        if (pieChartInstance.current) {
            pieChartInstance.current.destroy();
        }
        
        // パーセンテージ計算
        const dataWithPercentage = typeBreakdown.map((item, index) => ({
            ...item,
            percentage: ((item.value / total) * 100).toFixed(1),
            color: CHART_COLORS[index % CHART_COLORS.length]
        })).filter(item => item.value > 0); // 値が0のものは除外

        const ctx = pieChartRef.current.getContext('2d');
        if (!ctx) return;

        const chartData: ChartData = { // any型
            labels: dataWithPercentage.map(d => d.name),
            datasets: [{
                data: dataWithPercentage.map(d => d.value),
                backgroundColor: dataWithPercentage.map(d => d.color),
                hoverBackgroundColor: dataWithPercentage.map(d => d.color),
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        };
        
        const chartOptions: ChartOptions = { // any型
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // ドーナツの穴のサイズ (内側の円の割合)
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        // contextの型をanyに変更
                        label: function(context: any) {
                            const index = context.dataIndex;
                            const item = dataWithPercentage[index];
                            return `${item.name}: ${item.value.toLocaleString()} (${item.percentage}%)`;
                        }
                    }
                },
            }
        };

        const config: ChartConfiguration = { type: 'doughnut', data: chartData, options: chartOptions }; // any型
        pieChartInstance.current = new ChartClass(ctx, config);
    };

    // データフェッチングロジック
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // 指数バックオフの実装（再試行ロジック）
                const maxRetries = 3;
                let lastError = null;
                
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        const response = await fetch(API_ENDPOINT); 
                        if (!response.ok) {
                            throw new Error(`HTTPエラー (${response.status})。API GatewayまたはLambdaの応答を確認してください。`);
                        }
                        const text = await response.text();
                        let jsonResponse: ApiResponse;
                        
                        // API Gatewayの二重エスケープを考慮
                        try {
                            jsonResponse = JSON.parse(text) as ApiResponse;
                        } catch (e) {
                            try {
                                // 二重にエスケープされている可能性を考慮して再度パースを試みる
                                jsonResponse = JSON.parse(JSON.parse(text)) as ApiResponse;
                            } catch (e2) {
                                throw new Error("APIレスポンスの形式が無効です。Lambdaの返り値を確認してください。");
                            }
                        }
                        
                        if (jsonResponse.status === 'success' && jsonResponse.data) {
                            setData(jsonResponse.data);
                            return; // 成功したらループを抜ける
                        } else {
                            throw new Error(jsonResponse.message || "データ取得に失敗しました (status: success以外)。");
                        }
                    } catch (err) {
                        lastError = err;
                        if (attempt < maxRetries - 1) {
                            // 指数関数的な待機
                            const delay = Math.pow(2, attempt) * 1000;
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                // 最大試行回数を超えて失敗した場合
                if (lastError instanceof Error) {
                    throw lastError;
                }
                
            } catch (err) {
                let errorMessage: string;
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else {
                    errorMessage = "原因不明のデータ取得エラーが発生しました。";
                }
                
                // CORSエラーに関する具体的なガイダンス
                if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
                    errorMessage = "接続エラー: CORSポリシーによりブラウザでブロックされました。Lambda関数の応答ヘッダーに 'Access-Control-Allow-Origin: *' が含まれているか確認してください。";
                }
                
                console.error("Fetch Error:", errorMessage);
                setError(errorMessage);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        
        // コンポーネントのアンマウント時にChart.jsのインスタンスを破棄
        return () => {
            if (dailyChartInstance.current) dailyChartInstance.current.destroy();
            if (pieChartInstance.current) pieChartInstance.current.destroy();
        };

    }, []); 
    
    // データがロードされたらグラフを描画
    useEffect(() => {
        if (data) {
            if (!ChartClass) {
                // Chart.jsがロードされていない場合はエラーメッセージを表示
                setError("グラフ描画ライブラリ (Chart.js) がロードされていないため、ダッシュボードを表示できません。");
                return;
            }
            drawDailyTrendChart(data.dailyTrend);
            drawTypeBreakdownChart(data.typeBreakdown, data.totalEvents);
        }
    }, [data]);


    // --- ローディング/エラー/データなし状態の表示 ---
    
    if (loading) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center text-indigo-600">
                <Loader className="animate-spin w-8 h-8 mx-auto mb-3 text-indigo-500" />
                データ取得中...
            </div>
        </div>
    );
    
    if (error || !data) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center border-l-4 border-red-500 max-w-lg">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-red-700 mb-2">ダッシュボード表示エラー</h2>
                <p className="text-sm text-gray-600 break-words">{error}</p>
            </div>
        </div>
    );
    
    if (data.totalEvents === 0) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center border-l-4 border-yellow-500">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-yellow-700 mb-2">データが見つかりません</h2>
                <p className="text-sm text-gray-600">DynamoDBにアクセスログデータが記録されているか確認してください。</p>
            </div>
        </div>
    );

    // --- データ処理 (レンダリング前) ---
    
    const total: number = data.totalEvents;
    const days: number = data.dailyTrend.length || 1; 

    const totalEvents = data.totalEvents;
    const avgEvents = totalEvents > 0 ? Math.round(totalEvents / days) : 0;
    
    // --- メインダッシュボードレイアウト ---
    return (
        // 中央寄せと最大幅制限のためのコンテナ
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">サーバーレス アクセス解析ダッシュボード</h1>
                    <p className="text-md text-gray-500 mt-2">最終更新: {formatDate(data.lastUpdated)}</p>
                </header>

                {/* サマリーカード */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 justify-items-center md:justify-items-stretch">
                    <DataCard title="総イベント数" value={total} icon={<Activity className="w-6 h-6" />} color="indigo"/>
                    <DataCard 
                        title="平均イベント数 (日)" 
                        value={avgEvents} 
                        icon={<TrendingUp className="w-6 h-6" />} 
                        color="green"
                    />
                    <DataCard title="イベントタイプ数" value={data.typeBreakdown.length} icon={<Zap className="w-6 h-6" />} color="red"/>
                </div>

                {/* グラフエリア */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 日別トレンドグラフ (BarChart) */}
                    <div className="lg:col-span-2 bg-white shadow-xl rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">日別イベントトレンド</h2>
                        {/* Chart.js用のコンテナ。高さを持たせるCSSを適用 */}
                        <div className="relative h-[400px] w-full"> 
                            <canvas ref={dailyChartRef} id="dailyTrendChart"></canvas>
                        </div>
                    </div>
                    
                    {/* イベントタイプ別内訳グラフ (PieChart) */}
                    <div className="lg:col-span-1 bg-white shadow-xl rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">イベントタイプ別内訳</h2>
                        {/* Chart.js用のコンテナ。高さを持たせるCSSを適用 */}
                        <div className="relative h-[400px] w-full flex items-center justify-center">
                            <canvas ref={pieChartRef} id="typeBreakdownChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
