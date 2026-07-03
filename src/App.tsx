import { useState, useCallback } from 'react';
import type { Plan } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getPlan } from './data/store';
import Login from './components/Login';
import PlanList from './components/PlanList';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';

type Page = 'plans' | 'dashboard' | 'insights';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('plans');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const refresh = useCallback(() => {}, []);

  const handleSelectPlan = useCallback((planId: string) => {
    const p = getPlan(planId);
    if (p) {
      setActivePlan(p);
      setActivePlanId(planId);
      setPage('dashboard');
    }
  }, []);

  const handleBackToPlans = useCallback(() => {
    setPage('plans');
    setActivePlanId(null);
    refresh();
  }, [refresh]);

  const handleViewInsights = useCallback(() => {
    if (activePlanId) {
      const p = getPlan(activePlanId);
      if (p) setActivePlan(p);
    }
    setPage('insights');
  }, [activePlanId]);

  if (loading) {
    return (
      <div className="onboarding generating">
        <div className="generating-content">
          <div className="spinner" />
          <h2>正在加载...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (page === 'insights' && activePlan) {
    return <Insights plan={activePlan} onBack={() => {
      const refreshed = activePlanId ? getPlan(activePlanId) : null;
      if (refreshed) setActivePlan(refreshed);
      setPage('dashboard');
    }} />;
  }

  if (page === 'dashboard' && activePlan) {
    return (
      <Dashboard
        planId={activePlanId!}
        plan={activePlan}
        onBack={handleBackToPlans}
        onViewInsights={handleViewInsights}
      />
    );
  }

  return <PlanList onSelectPlan={handleSelectPlan} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
