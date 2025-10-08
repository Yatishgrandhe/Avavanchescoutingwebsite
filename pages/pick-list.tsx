import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { PickList } from '@/components/picklist/PickList';
import { ScoutingEducation } from '@/components/picklist/ScoutingEducation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PickList as PickListType } from '@/lib/types';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { Plus, List, Trophy, Target, Users, GraduationCap, Shield, AlertCircle } from 'lucide-react';

export default function PickListPage() {
  const router = useRouter();
  const { supabase, user, session } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [pickLists, setPickLists] = useState<PickListType[]>([]);
  const [selectedPickList, setSelectedPickList] = useState<PickListType | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPickListName, setNewPickListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEducation, setShowEducation] = useState(false);

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
          event_key: '2025test',
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
  };

  const handleSavePickList = (savedPickList: PickListType) => {
    setPickLists(pickLists.map(pl => 
      pl.id === savedPickList.id ? savedPickList : pl
    ));
    setSelectedPickList(savedPickList);
  };

  const handleDeletePickList = async (pickListId: string) => {
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

  // Check if user is admin
  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need admin privileges to access pick lists.</p>
            <Button onClick={() => router.push('/')} className="bg-blue-500 hover:bg-blue-600">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading pick lists...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 overflow-x-auto">
          <div className="w-full min-w-[1200px] px-2 sm:px-4 lg:px-6 py-4">
            {/* Header Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">
                    Pick Lists
                  </h1>
                  <p className="text-xs text-neutral-400 dark:text-neutral-300">
                    Create and manage team pick lists for alliance selection.
                  </p>
                </div>
                <Button
                  onClick={() => setShowEducation(!showEducation)}
                  variant="outline"
                  className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-300 flex items-center space-x-1 text-xs"
                >
                  <GraduationCap className="h-3 w-3" />
                  <span>{showEducation ? 'Hide' : 'Show'} Education</span>
                </Button>
              </div>
            </div>

            {showEducation && (
              <div className="mb-4">
                <ScoutingEducation />
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Pick Lists Sidebar */}
              <div className="lg:col-span-1">
                <Card className="p-3 rounded-xl shadow-card dark:shadow-card-dark bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">My Pick Lists</h2>
                    <Button
                      size="sm"
                      onClick={() => setIsCreatingNew(true)}
                      className="px-2 py-1 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {isCreatingNew && (
                    <div className="mb-3 p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                      <Input
                        placeholder="Pick list name..."
                        value={newPickListName}
                        onChange={(e) => setNewPickListName(e.target.value)}
                        className="mb-2 bg-background border-border text-foreground text-xs"
                      />
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          onClick={handleCreateNew}
                          className="px-2 py-1 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300 text-xs"
                        >
                          Create
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreatingNew(false);
                            setNewPickListName('');
                          }}
                          className="px-2 py-1 rounded-full border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors duration-300 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {pickLists.length === 0 ? (
                      <div className="text-center py-4">
                        <List className="h-6 w-6 mx-auto mb-2 text-neutral-400" />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          No pick lists yet. Create your first one!
                        </p>
                      </div>
                    ) : (
                      pickLists.map((pickList) => (
                        <div
                          key={pickList.id}
                          className={`p-2 rounded-lg cursor-pointer transition-all duration-300 border ${
                            selectedPickList?.id === pickList.id
                              ? 'bg-primary/10 border-primary/30 shadow-md'
                              : 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 hover:shadow-sm'
                          }`}
                          onClick={() => handleSelectPickList(pickList)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1 text-sm">
                                {pickList.name}
                              </h3>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {pickList.teams.length} teams
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePickList(pickList.id);
                              }}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 h-4 w-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-300"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Educational Content */}
                <Card className="p-6 mt-6 rounded-2xl shadow-card dark:shadow-card-dark bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Pick List Tips</h3>
                  <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-start space-x-3">
                      <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Focus on Total Score</p>
                        <p>Teams with higher average scores are generally more reliable.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Consider Consistency</p>
                        <p>Look for teams with consistent performance across matches.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Balance Your Alliance</p>
                        <p>Mix high-scoring teams with reliable defensive partners.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {selectedPickList ? (
                  <PickList
                    pickListId={selectedPickList.id}
                    eventKey={selectedPickList.event_key}
                    onSave={handleSavePickList}
                    session={session}
                  />
                ) : (
                  <Card className="p-8 text-center rounded-2xl shadow-card dark:shadow-card-dark bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <List className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      Select a Pick List
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                      Choose an existing pick list from the sidebar or create a new one to get started.
                    </p>
                    <Button 
                      onClick={() => setIsCreatingNew(true)}
                      className="px-6 py-3 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300 flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Pick List</span>
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
