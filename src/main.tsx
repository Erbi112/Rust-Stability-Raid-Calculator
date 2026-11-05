import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.tsx';
import './ui/theme.css';
const root=document.getElementById('root');
if(!root)throw new Error('Mount element missing');
createRoot(root).render(<React.StrictMode><App/></React.StrictMode>);
