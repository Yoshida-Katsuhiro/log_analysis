import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // メインのAppコンポーネントをインポート
import './index.css'; // グローバルCSSをインポート

// 'root' IDを持つDOM要素を取得
const container = document.getElementById('root');

if (container) {
    // React 18のルートを作成
    const root = ReactDOM.createRoot(container);
    
    // StrictModeでAppコンポーネメントをレンダリング
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    // root要素が見つからない場合のエラーログ
    console.error('Root element with ID "root" not found in the document.');
}
