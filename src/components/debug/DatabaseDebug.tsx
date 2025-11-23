import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DatabaseIntegrityCheck } from '@/services/notes';

interface DatabaseStats {
  sessions_count: number;
  documents_count: number;
  notes_count: number;
}

export const DatabaseDebug: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [integrity, setIntegrity] = useState<DatabaseIntegrityCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [vacuumMessage, setVacuumMessage] = useState<string | null>(null);

  const checkIntegrity = async () => {
    setLoading(true);
    try {
      const result = await invoke<DatabaseIntegrityCheck>('check_database_integrity');
      setIntegrity(result);
      console.log('[DatabaseDebug] Integrity check:', result);
    } catch (err) {
      console.error('[DatabaseDebug] Failed to check integrity:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStats = async () => {
    setLoading(true);
    try {
      const result = await invoke<DatabaseStats>('get_database_stats');
      setStats(result);
      console.log('[DatabaseDebug] Stats:', result);
    } catch (err) {
      console.error('[DatabaseDebug] Failed to get stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const vacuumDatabase = async () => {
    if (!confirm('VACUUM will rebuild the database and may take a while. Continue?')) {
      return;
    }

    setLoading(true);
    setVacuumMessage(null);
    try {
      const result = await invoke<string>('vacuum_database');
      setVacuumMessage(result);
      console.log('[DatabaseDebug] Vacuum result:', result);
      // Refresh stats after vacuum
      await getStats();
    } catch (err) {
      console.error('[DatabaseDebug] Failed to vacuum:', err);
      setVacuumMessage(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)' }}>
          Check database statistics and run integrity checks. Logs will appear in the console.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={getStats}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--fg-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Get Stats
        </button>
        <button
          onClick={checkIntegrity}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--fg-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Check Integrity
        </button>
        <button
          onClick={vacuumDatabase}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid var(--warning)',
            background: 'var(--warning)',
            color: 'white',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          🔧 VACUUM
        </button>
      </div>

      {vacuumMessage && (
        <div style={{
          padding: '8px',
          background: vacuumMessage.includes('Error') ? '#f8d7da' : '#d4edda',
          border: `1px solid ${vacuumMessage.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '12px',
        }}>
          {vacuumMessage}
        </div>
      )}

      {stats && (
        <div style={{
          padding: '8px',
          background: 'var(--bg-tertiary)',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '8px',
        }}>
          <div><strong>Sessions:</strong> {stats.sessions_count}</div>
          <div><strong>Documents:</strong> {stats.documents_count}</div>
          <div><strong>Notes:</strong> {stats.notes_count}</div>
        </div>
      )}

      {integrity && (
        <div style={{
          padding: '8px',
          background: integrity.is_ok ? '#d4edda' : '#f8d7da',
          border: `1px solid ${integrity.is_ok ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {integrity.is_ok ? '✅ Database OK' : '❌ Database Has Issues'}
          </div>

          {integrity.errors.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Errors:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {integrity.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {integrity.warnings.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Warnings:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {integrity.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseDebug;
