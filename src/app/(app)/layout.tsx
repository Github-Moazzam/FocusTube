import Link from 'next/link';
import { SyncStatus } from '@/components/SyncStatus';
import { Settings, Library } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">F</div>
            FocusTube
          </Link>
          
          <div className="flex items-center gap-4">
            <SyncStatus />
            <nav className="flex items-center gap-1">
              <Link 
                href="/" 
                className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Library"
              >
                <Library className="w-5 h-5" />
              </Link>
              <Link 
                href="/settings" 
                className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

