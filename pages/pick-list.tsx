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
        <div className="min-h-screen bg-background overflow-x-auto">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-1 sm:mb-2">
                    Pick Lists
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                    Create and manage team pick lists for alliance selection
                  </p>
                </div>
                <Button
                  onClick={() => setShowEducation(!showEducation)}
                  variant="outline"
                  className="flex items-center space-x-2 text-sm sm:text-base"
                >
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{showEducation ? 'Hide' : 'Show'} Education</span>
                </Button>
              </div>
            </div>

            {showEducation && (
              <div className="mb-6 sm:mb-8">
                <ScoutingEducation />
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Pick Lists Sidebar */}
              <div className="lg:col-span-1">
                <Card className="p-4 sm:p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">My Pick Lists</h2>
                    <Button
                      size="sm"
                      onClick={() => setIsCreatingNew(true)}
                      className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>New</span>
                    </Button>
                  </div>

                  {isCreatingNew && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-muted/50">
                      <Input
                        placeholder="Pick list name..."
                        value={newPickListName}
                        onChange={(e) => setNewPickListName(e.target.value)}
                        className="mb-2 sm:mb-3 text-sm sm:text-base"
                      />
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={handleCreateNew}
                          className="flex-1 text-xs sm:text-sm"
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
                          className="flex-1 text-xs sm:text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 sm:space-y-3">
                    {pickLists.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <List className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <p className="text-sm sm:text-base text-muted-foreground">
                          No pick lists yet. Create your first one!
                        </p>
                      </div>
                    ) : (
                      pickLists.map((pickList) => (
                        <div
                          key={pickList.id}
                          className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                            selectedPickList?.id === pickList.id
                              ? 'bg-primary/10 border-primary/30 shadow-md'
                              : 'bg-card border-border hover:bg-muted/50 hover:shadow-sm'
                          }`}
                          onClick={() => handleSelectPickList(pickList)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">
                                {pickList.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
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
                              className="text-destructive hover:text-destructive/80 p-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-destructive/10 transition-colors text-xs sm:text-sm"
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
                <Card className="p-4 sm:p-6 mt-4 sm:mt-6 rounded-lg shadow-sm border">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Pick List Tips</h3>
                  <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm sm:text-base">Focus on Total Score</p>
                        <p>Teams with higher average scores are generally more reliable.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm sm:text-base">Consider Consistency</p>
                        <p>Look for teams with consistent performance across matches.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm sm:text-base">Balance Your Alliance</p>
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
                  <Card className="p-8 sm:p-12 text-center rounded-lg shadow-sm border">
                    <List className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                      Select a Pick List
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                      Choose an existing pick list from the sidebar or create a new one to get started with team selection.
                    </p>
                    <Button 
                      onClick={() => setIsCreatingNew(true)}
                      className="flex items-center space-x-2 mx-auto text-sm sm:text-base"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
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
