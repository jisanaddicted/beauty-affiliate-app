import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ProductLanding from './ProductLanding.jsx';
import AdminPanel from './AdminPanel.jsx'; // 👈 Import the admin screen
import './index.css';

function Router() {
  const path = window.location.pathname;

  if (path.startsWith('/product/')) {
    return <ProductLanding />;
  }

  if (path === '/admin') {
    return <AdminPanel />; // 👈 Intercept admin console traffic
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);