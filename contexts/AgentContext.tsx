
// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from './UserContext';
import { PocketItem } from '../types';
import { runCuratorAgent, runSentinelAgent, AgentConfig } from '../services/geminiAgents';
import { fetchPocketItems } from '../services/firebase';
import { Sparkles, ShieldAlert, Activity, Terminal } from 'lucide-react';

interface AgentLog {
    id: string;
    timestamp: number;
    agent: 'curator' | 'sentinel';
    message: string;
    data?: any;
}

interface AgentContextType {
  activeAgents: string[];
  agentConfig: AgentConfig;
  setAgentConfig: (config: AgentConfig) => void;
  lastAlert: { message: string, type: 'info' | 'warning' } | null;
  agentLogs: AgentLog[];
  triggerManualSentinel: () => Promise<void>;
  triggerManualCurator: (item: PocketItem) => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgents must be used within AgentProvider");
  return context;
};

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useUser();
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [lastAlert, setLastAlert] = useState<{ message: string, type: 'info' | 'warning' } | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(() => {
      try {
          const stored = localStorage.getItem('mimi_agent_config');
          const defaultBudget = 2048;
          if (stored) {
              const parsed = JSON.parse(stored);
              // Migrate old config if needed
              if (parsed.thinkingBudget !== undefined) {
                  return {
                      curatorEnabled: parsed.curatorEnabled ?? true,
                      sentinelEnabled: parsed.sentinelEnabled ?? true,
                      curatorThinkingBudget: parsed.thinkingBudget,
                      sentinelThinkingBudget: parsed.thinkingBudget
                  };
              }
              return parsed;
          }
          return { curatorEnabled: true, sentinelEnabled: true, curatorThinkingBudget: defaultBudget, sentinelThinkingBudget: defaultBudget };
      } catch {
          return { curatorEnabled: true, sentinelEnabled: true, curatorThinkingBudget: 2048, sentinelThinkingBudget: 2048 };
      }
  });

  const updateConfig = (newConfig: AgentConfig) => {
      setAgentConfig(newConfig);
      localStorage.setItem('mimi_agent_config', JSON.stringify(newConfig));
  };

  const addLog = (agent: 'curator' | 'sentinel', message: string, data?: any) => {
      setAgentLogs(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          agent,
          message,
          data
      }, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const executeCurator = async (item: PocketItem) => {
        if (!item || !user || !agentConfig.curatorEnabled) return;

        setActiveAgents(prev => [...prev, 'curator']);
        addLog('curator', `Observing new shard: ${item.type}...`);
        
        try {
            const result = await runCuratorAgent(item, profile, agentConfig);
            if (result) {
                const era = result.detectedEra ? ` | Era: ${result.detectedEra}` : '';
                const ref = result.culturalReference ? ` | Ref: ${result.culturalReference}` : '';
                
                addLog('curator', `Analysis complete: ${result.visualSemiotics}`, result);

                window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                    detail: { 
                        message: `Curator Filed: ${result.visualSemiotics?.slice(0, 30)}...${era}${ref}`, 
                        icon: <Sparkles size={14} className="text-indigo-400" /> 
                    } 
                }));
            } else {
                addLog('curator', 'Observation yielded no specific enrichment.');
            }
        } catch (e: any) {
            console.error(e);
            addLog('curator', `Error: ${e.message}`);
            window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                detail: { message: e.message || "Curator Agent Failed", type: 'error' } 
            }));
        } finally {
            setActiveAgents(prev => prev.filter(a => a !== 'curator'));
        }
  };

  // Listen for Shard Added Events (Curator Trigger)
  useEffect(() => {
    const handleShardAdded = (e: any) => {
        executeCurator(e.detail as PocketItem);
    };
    window.addEventListener('mimi:shard_added', handleShardAdded);
    return () => window.removeEventListener('mimi:shard_added', handleShardAdded);
  }, [user, profile, agentConfig]);

  const executeSentinel = async () => {
      if (!profile || !user || !agentConfig.sentinelEnabled) return;
      
      setActiveAgents(prev => [...prev, 'sentinel']);
      addLog('sentinel', 'Initiating audit of recent debris...');
      
      try {
          const recent = await fetchPocketItems(user.uid);
          const audit = await runSentinelAgent(recent.slice(0, 10), profile, agentConfig);
          
          if (audit) {
              localStorage.setItem('mimi_sentinel_last_run', Date.now().toString());
              addLog('sentinel', `Audit Complete. Drift Score: ${audit.driftScore}%`, audit);
              
              if (audit.driftScore > 70 || audit.isUrgent) {
                  window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                      detail: { 
                          message: `SENTINEL ALERT: ${audit.observation} Drift: ${audit.driftScore}%. Recalibrate in Tailor.`, 
                          icon: <ShieldAlert size={14} className="text-red-500 animate-pulse" />,
                          type: 'warning'
                      } 
                  }));
              }
          }
      } catch (e: any) {
          console.error("Sentinel Error", e);
          addLog('sentinel', `Error: ${e.message}`);
      } finally {
          setActiveAgents(prev => prev.filter(a => a !== 'sentinel'));
      }
  };

  // Periodic Sentinel Audit
  useEffect(() => {
      const lastRun = localStorage.getItem('mimi_sentinel_last_run');
      const now = Date.now();
      if (lastRun && (now - parseInt(lastRun) < 86400000)) return; // 24h cooldown

      const timer = setTimeout(executeSentinel, 5000); // 5s delay on boot
      return () => clearTimeout(timer);
  }, [profile?.id, user?.uid, agentConfig]);

  return (
    <AgentContext.Provider value={{ 
        activeAgents, 
        agentConfig, 
        setAgentConfig: updateConfig, 
        lastAlert,
        agentLogs,
        triggerManualSentinel: executeSentinel,
        triggerManualCurator: executeCurator
    }}>
      {children}
    </AgentContext.Provider>
  );
};
