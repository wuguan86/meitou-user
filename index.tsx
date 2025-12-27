
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDomainValidation } from './utils/domainValidator';

// 初始化域名验证（允许三个业务域名访问）
initDomainValidation();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
