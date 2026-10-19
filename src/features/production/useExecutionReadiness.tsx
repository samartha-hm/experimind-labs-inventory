import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../utils/api';

interface Readiness { execution_enabled: boolean; blocker: string | null }
export function useExecutionReadiness(area: 'packing' | 'production-planning') {
  const { currentUser } = useAuth();
  const identity = `${currentUser?.organization_id}:${currentUser?.id}:${area}`;
  const [state, setState] = useState<{identity:string; readiness:Readiness}>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true; setState(undefined);
    void apiFetch(`/api/v1/${area}/execution-readiness`).then((readiness: Readiness) => {
      if (live) setState({identity,readiness});
    }).catch(() => { if (live) setState({identity,readiness:{execution_enabled:false,blocker:'Execution readiness unavailable. Retry before continuing.'}}); });
    return () => { live = false; };
  }, [identity, attempt, area]);
  const readiness = state?.identity === identity ? state.readiness : undefined;
  return { enabled: readiness?.execution_enabled === true, notice: <div role="status" className="rounded-xl border border-slate-300 p-3 text-sm">
    {readiness ? readiness.blocker ?? 'Standalone workflow: this schema does not provide integrated commitment accounting.' : 'Checking execution readiness…'}
    {!readiness?.execution_enabled && <button type="button" className="ml-3 min-h-11 underline" onClick={() => setAttempt(n => n+1)}>Retry readiness</button>}
  </div> };
}
