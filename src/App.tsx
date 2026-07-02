import { useState, useEffect, useCallback } from 'react';
import type { Plan } from './types';
import { loadState } from './data/store';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';

type Page = 'onboarding' | 'dashboard' | 'insights';

export default function App() {
  const [page, setPage] = useState<Page>('onboarding');
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const state = loadState();
    if (state.plan) {
      setPlan(state.plan);
      setPage('dashboard');
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    const state = loadState();
    if (state.plan) {
      setPlan(state.plan);
      setPage('dashboard');
    }
  }, []);

  const handlePlanUpdate = useCallback((updatedPlan: Plan) => {
    setPlan(updatedPlan);
  }, []);

  if (page === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (page === 'insights' && plan) {
    return <Insights plan={plan} onBack={() => setPage('dashboard')} />;
  }

  if (plan) {
    return (
      <Dashboard
        plan={plan}
        onPlanUpdate={handlePlanUpdate}
        onViewInsights={() => setPage('insights')}
      />
    );
  }

  return <Onboarding onComplete={handleOnboardingComplete} />;
}
