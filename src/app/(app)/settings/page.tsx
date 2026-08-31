'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/storage/db';
import { clearAllLocalData } from '@/lib/storage/crud';
import { scheduleSync, initialPull } from '@/lib/storage/sync';
import { Download, Upload, Trash2, LogOut, RefreshCw, HardDrive, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastKeepAlive, setLastKeepAlive] = useState<string | null>(null);

  useEffect(() => {
    // Fetch last keep alive from our local DB, wait, heartbeat is not synced to local DB
    // We should fetch it from an API endpoint, or just skip it if it's too much work.
    // Let's create a quick API fetch for heartbeat
    fetch('/api/sync?health=1')
      .then(res => res.json())
      .then(data => {
        if (data.last_ping) {
          setLastKeepAlive(new Date(data.last_ping).toLocaleString());
        }
      })
      .catch(() => {});
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const playlists = await db.playlists.toArray();
      const videos = await db.videos.toArray();
      const progress = await db.progress.toArray();
      
      const backup = {
        version: 1,
        date: new Date().toISOString(),
        data: { playlists, videos, progress }
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focustube-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backup = JSON.parse(content);
        
        if (!backup.data || !backup.data.playlists) {
          alert('Invalid backup file');
          return;
        }
        
        await db.transaction('rw', db.playlists, db.videos, db.progress, async () => {
          await db.playlists.bulkPut(backup.data.playlists);
          await db.videos.bulkPut(backup.data.videos);
          await db.progress.bulkPut(backup.data.progress);
        });
        
        scheduleSync(true);
        alert('Backup imported successfully');
        e.target.value = '';
      } catch (err) {
        console.error(err);
        alert('Failed to import backup');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (confirm('WARNING: This will clear all local data. Your cloud backup on Supabase will remain intact, and will be restored on next sync unless you delete it there. Proceed?')) {
      setIsClearing(true);
      try {
        await clearAllLocalData();
        alert('Local data cleared.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await initialPull();
      scheduleSync(true);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Settings</h1>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-zinc-400" />
            Data & Sync
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-200">Force Sync</h3>
              <p className="text-sm text-zinc-500 mt-1">Push local changes and pull from cloud</p>
            </div>
            <button 
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              Sync Now
            </button>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-200">Export Backup</h3>
              <p className="text-sm text-zinc-500 mt-1">Download a JSON file of your entire library</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-200">Import Backup</h3>
              <p className="text-sm text-zinc-500 mt-1">Restore from a previous export</p>
            </div>
            <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import JSON
              <input 
                type="file" 
                accept="application/json" 
                className="hidden" 
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-zinc-400" />
            System Status
          </h2>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-zinc-200">Database Keep-Alive</h3>
              <p className="text-sm text-zinc-500 mt-1">Prevents Supabase from pausing the free tier</p>
            </div>
            <div className="text-sm font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              {lastKeepAlive || 'Unknown'}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-900 border border-red-900/30 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-red-500/5">
          <h2 className="font-semibold text-red-400 flex items-center gap-2">
            Danger Zone
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-200">Clear Local Data</h3>
              <p className="text-sm text-zinc-500 mt-1">Delete all downloaded library data on this device</p>
            </div>
            <button 
              onClick={handleClearData}
              disabled={isClearing}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-200">Sign Out</h3>
              <p className="text-sm text-zinc-500 mt-1">End your session on this device</p>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
