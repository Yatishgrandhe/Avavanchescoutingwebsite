import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { PickList } from '@/components/picklist/PickList';
import { ScoutingEducation } from '@/components/picklist/ScoutingEducation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PickList as PickListType } from '@/lib/types';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { cn } from '@/lib/utils';
import {
  Plus,
  List,
  Trophy,
  Target,
  Users,
  GraduationCap,
  Shield,
  AlertCircle,
  LayoutGrid,
  ChevronRight,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function PickListPage() {
  const router = useRouter();
  const { session } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [pickLists, setPickLists] = useState<PickListType[]>([]);
  const [selectedPickList, setSelectedPickList] = useState<PickListType | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPickListName, setNewPickListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEducation, setShowEducation] = useState(false);
  const [isListsCollapsed, setIsListsCollapsed] = useState(false);

  useEffect(() => {
    if (session && isAdmin) {
      loadPickLists();
    }
  }, [session, isAdmin]);

  const loadPickLists = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/pick-lists', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPickLists(data.pickLists || []);
    } catch (error) {
      console.error('Error loading pick lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newPickListName.trim() || !session) return;

    try {
      const response = await fetch('/api/pick-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newPickListName,
          event_key: '2026test',
          teams: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPickLists([data, ...pickLists]);
      setSelectedPickList(data);
      setIsCreatingNew(false);
      setNewPickListName('');
    } catch (error) {
      console.error('Error creating pick list:', error);
      alert('Failed to create pick list. Please try again.');
    }
  };

  const handleSelectPickList = (pickList: PickListType) => {
    setSelectedPickList(pickList);
    setIsCreatingNew(false);
    // On mobile, scroll to content
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById('picklist-content')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSavePickList = (savedPickList: PickListType) => {
    setPickLists(pickLists.map(pl =>
      pl.id === savedPickList.id ? savedPickList : pl
    ));
    setSelectedPickList(savedPickList);
  };

  const handleDeletePickList = async (pickListId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this pick list?') || !session) return;

    try {
      const response = await fetch(`/api/pick-lists?id=${pickListId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setPickLists(pickLists.filter(pl => pl.id !== pickListId));
      if (selectedPickList?.id === pickListId) {
        setSelectedPickList(null);
      }
    } catch (error) {
      console.error('Error deleting pick list:', error);
      alert('Failed to delete pick list. Please try again.');
    }
  };

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="bg-red-500/10 p-4 rounded-full mb-4">
            <Shield className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 break-words px-4">Access Restricted</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Pick list management is restricted to alliance captains and administrators.
          </p>
          <Button onClick={() => router.push('/')} variant="outline" className="border-white/10 hover:bg-white/5">
            Return to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 break-words">
                Alliance Selection
              </h1>
              <p className="text-muted-foreground mt-1">
                Strategic pick list management and analysis
              </p>
            </div>
            <Button
              onClick={() => setShowEducation(!showEducation)}
              variant="outline"
              className="glass border-white/10 hover:bg-white/10 gap-2"
            >
              <GraduationCap size={16} />
              <span>{showEducation ? 'Hide Guide' : 'Strategy Guide'}</span>
            </Button>
          </div>

          <AnimatePresence>
            {showEducation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-6 rounded-xl border border-white/5 mb-6">
                  <ScoutingEducation />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-card rounded-xl overflow-hidden border border-white/5 flex flex-col h-[600px]">
                <button
                  onClick={() => setIsListsCollapsed(!isListsCollapsed)}
                  className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold flex items-center gap-2">
                    <List size={16} className="text-primary" /> My Lists
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreatingNew(true);
                        setSelectedPickList(null);
                      }}
                      className="h-8 w-8 p-0 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                    >
                      <Plus size={16} />
                    </Button>
                    {isListsCollapsed ? (
                      <ChevronDown size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronUp size={16} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {!isListsCollapsed && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  <AnimatePresence>
                    {isCreatingNew && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-2"
                      >
                        <p className="text-xs font-medium text-primary mb-2">New List Name</p>
                        <Input
                          autoFocus
                          placeholder="e.g. Einstein Division"
                          value={newPickListName}
                          onChange={(e) => setNewPickListName(e.target.value)}
                          className="h-8 text-sm bg-background/50 border-white/10 mb-2"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleCreateNew} size="sm" className="h-7 text-xs flex-1">Create</Button>
                          <Button onClick={() => setIsCreatingNew(false)} variant="ghost" size="sm" className="h-7 text-xs flex-1 text-muted-foreground">Cancel</Button>
                        </div>
                      </motion.div>
                    )}

                    {pickLists.length === 0 && !isCreatingNew ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <List size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No lists created yet</p>
                      </div>
                    ) : (
                      pickLists.map((list) => (
                        <motion.button
                          key={list.id}
                          onClick={() => handleSelectPickList(list)}
                          layout
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all group relative",
                            selectedPickList?.id === list.id
                              ? "bg-primary/10 border-primary/40 shadow-inner"
                              : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                          )}
                        >
                          <div className="pr-6">
                            <p className={cn("font-medium text-sm truncate", selectedPickList?.id === list.id ? "text-primary" : "text-foreground")}>
                              {list.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {list.teams.length} teams • {new Date(list.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </p>
                          </div>

                          <div
                            onClick={(e) => handleDeletePickList(list.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded-md transition-all"
                            title="Delete list"
                          >
                            <Trash2 size={14} />
                          </div>
                        </motion.button>
                      ))
                    )}
                  </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Tips Card */}
              <div className="glass-card p-4 rounded-xl border border-white/5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hidden lg:block">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Target size={14} className="text-primary" /> Pro Tips
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 bg-white/20 rounded-full mt-1.5 flex-shrink-0" />
                    <p>Prioritize compatibility with your auto paths</p>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 bg-white/20 rounded-full mt-1.5 flex-shrink-0" />
                    <p>Check "DNP" status before finalizing selection</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3" id="picklist-content">
              {selectedPickList ? (
                <div className="glass-card rounded-xl border border-white/5 min-h-[600px] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <LayoutGrid size={18} className="text-primary" />
                      {selectedPickList.name}
                    </h2>
                    <div className="text-xs text-muted-foreground bg-black/20 px-2 py-1 rounded">
                      {selectedPickList.teams.length} Teams
                    </div>
                  </div>
                  <div className="flex-1 p-4 bg-background/20">
                    <PickList
                      pickListId={selectedPickList.id}
                      eventKey={selectedPickList.event_key}
                      onSave={handleSavePickList}
                      session={session}
                    />
                  </div>
                </div>
              ) : (
                <div className="glass-card h-[600px] rounded-xl border border-white/5 flex flex-col items-center justify-center text-center p-8 border-dashed">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <LayoutGrid size={40} className="text-muted-foreground/50" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">No List Selected</h2>
                  <p className="text-muted-foreground max-w-sm mb-8">
                    Select a pick list from the sidebar to view details, or create a new one to start your alliance strategy.
                  </p>
                  <Button
                    onClick={() => setIsCreatingNew(true)}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <Plus size={18} /> Create New List
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
