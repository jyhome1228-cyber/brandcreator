import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './refinements.css';
import './bramer.css';
import './workspace-v2.css';
import './nineworks-layout.css';
import './typography-qa.css';
import './landing.css';
import './landing-integration.css';
import './landing-motion.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
