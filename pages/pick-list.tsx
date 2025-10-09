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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Pick Lists
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Create and manage team pick lists for alliance selection
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowEducation(!showEducation)}
                    variant="outline"
                    className="px-4 py-2 rounded-lg border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>{showEducation ? 'Hide' : 'Show'} Tips</span>
                  </Button>
                  <Button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Pick List</span>
                  </Button>
                </div>
              </div>
            </div>

            {showEducation && (
              <div className="mb-6">
                <ScoutingEducation />
              </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Pick Lists Sidebar */}
              <div className="xl:col-span-1">
                <Card className="p-6 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My Pick Lists</h2>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {pickLists.length} total
                    </div>
                  </div>

                  {isCreatingNew && (
                    <div className="mb-6 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700">
                      <Input
                        placeholder="Enter pick list name..."
                        value={newPickListName}
                        onChange={(e) => setNewPickListName(e.target.value)}
                        className="mb-3 bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={handleCreateNew}
                          className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
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
                          className="px-3 py-1 rounded-md border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {pickLists.length === 0 ? (
                      <div className="text-center py-8">
                        <List className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                          No pick lists yet
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Create your first pick list to get started
                        </p>
                      </div>
                    ) : (
                      pickLists.map((pickList) => (
                        <div
                          key={pickList.id}
                          className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                            selectedPickList?.id === pickList.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-md'
                              : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm'
                          }`}
                          onClick={() => handleSelectPickList(pickList)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                                {pickList.name}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                                <span>{pickList.teams.length} teams</span>
                                <span>•</span>
                                <span>{new Date(pickList.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePickList(pickList.id);
                              }}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 h-6 w-6 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Quick Tips */}
                <Card className="p-6 mt-6 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Tips</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Focus on Total Score</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Teams with higher average scores are generally more reliable.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Trophy className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Consider Consistency</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Look for teams with consistent performance across matches.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Balance Your Alliance</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Mix high-scoring teams with reliable defensive partners.</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Content */}
              <div className="xl:col-span-3">
                {selectedPickList ? (
                  <div className="space-y-6">
                    <Card className="p-6 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {selectedPickList.name}
                        </h2>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Last updated: {new Date(selectedPickList.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Card>
                    <PickList
                      pickListId={selectedPickList.id}
                      eventKey={selectedPickList.event_key}
                      onSave={handleSavePickList}
                      session={session}
                    />
                  </div>
                ) : (
                  <Card className="p-12 text-center rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <List className="h-16 w-16 text-slate-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      Select a Pick List
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                      Choose an existing pick list from the sidebar or create a new one to get started with team selection.
                    </p>
                    <Button 
                      onClick={() => setIsCreatingNew(true)}
                      className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="h-5 w-5" />
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
