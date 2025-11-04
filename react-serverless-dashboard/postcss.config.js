import tailwindcss from '@tailwindcss/postcss'; // ★★★ 修正: 新しいパッケージをインポート ★★★
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
  ],
}