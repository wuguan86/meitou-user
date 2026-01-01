import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0', // 监听所有网络接口，允许外部访问
        allowedHosts: [
          'medical.example.com', // 医美类域名
          'ecommerce.example.com', // 电商类域名
          'life.example.com', // 生活服务类域名
          'toutouyimei.com'
        ],
        // 配置代理，解决开发环境跨域问题
        proxy: {
          '/api/app': {
            target: 'http://localhost:8085',
            changeOrigin: true,
            secure: false,
            timeout: 300000,
            proxyTimeout: 300000,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                const originalHost = req.headers.host;
                if (originalHost) {
                  proxyReq.setHeader('X-Forwarded-Host', originalHost);
                }
              });
            },
          },
          '/api/admin': {
            target: 'http://localhost:8085',
            changeOrigin: true,
            secure: false,
            timeout: 300000,
            proxyTimeout: 300000,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                const originalHost = req.headers.host;
                if (originalHost) {
                  proxyReq.setHeader('X-Forwarded-Host', originalHost);
                }
              });
            },
          }
        },
        // 允许通过这三个域名访问（需要在hosts文件中配置域名映射）
        // 在 Windows: C:\Windows\System32\drivers\etc\hosts
        // 在 Linux/Mac: /etc/hosts
        // 添加以下映射：
        // 127.0.0.1 medical.example.com
        // 127.0.0.1 ecommerce.example.com
        // 127.0.0.1 life.example.com
      },
      plugins: [
        react(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
