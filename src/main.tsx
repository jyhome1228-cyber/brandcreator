import { Component, StrictMode, type ReactNode, type ErrorInfo } from 'react';
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
import './industry-step.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BRAMER rendering error', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" style={{ maxWidth: 560, margin: '15vh auto', padding: 24, fontFamily: 'Pretendard, sans-serif', color: '#111', background: '#fff' }}>
        <h1 style={{ fontSize: 24 }}>화면을 불러오지 못했습니다.</h1>
        <p>저장된 프로젝트는 삭제하지 않았습니다. 저장되지 않은 변경사항은 복구되지 않을 수 있습니다.</p>
        <p>다시 불러오거나 홈으로 이동해 내 프로젝트를 확인해 주세요.</p>
        <button className="button primary" onClick={() => window.location.reload()}>다시 불러오기</button>{' '}
        <button className="button secondary" onClick={() => { window.location.hash = ''; window.location.reload(); }}>홈으로 이동</button>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
);

import './dashboard.css';
import './site-navigation.css';
import './create-dashboard.css';

import './select.css';

import './editor-refresh.css';

import './industry-rationale-layout.css';

import './brand-alignment.css';

import './wordmark.css';

import './svg-upload-help.css';

import './audience.css';

import './beta-experience.css';

import './direct-create.css';

import './beta-launch-v2.css';

import './hero-full-rotation.css';

import './project-library.css';

import './bramer-v2.css';

import './workspace-unified.css';

import './print-qa.css';

import './help-docs.css';

import './workspace-width.css';

import './landing-editorial-polish.css';

import './bramer-bilingual-sample.css';

import './onboarding.css';

import './bramer-editorial-ui.css';

import './beta-auth-refinement.css';

import './technical-manifesto.css';

import './bramer-mobile-optimization.css';

import './admin-dashboard.css';
