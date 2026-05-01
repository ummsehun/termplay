import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SplashApp } from './SplashApp';

const params = new URLSearchParams(window.location.search);
const RootApp = params.get('view') === 'splash' ? SplashApp : App;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
