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
import { Plus, List, Trophy, Target, Users, GraduationCap } from 'lucide-react';

export default function PickListPage() {
  const router = useRouter();
  const { supabase, user, session } = useSupabase();
  const [pickLists, setPickLists] = useState<PickListType[]>([]);
  const [selectedPickList, setSelectedPickList] = useState<PickListType | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPickListName, setNewPickListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showEducation, setShowEducation] = useState(false);

  useEffect(() => {
    if (session) {
      loadPickLists();
    }
  }, [session]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pick Lists</h1>
              <p className="text-gray-600">
                Create and manage team pick lists for alliance selection. Drag and drop teams to reorder your preferences.
              </p>
            </div>
            <Button
              onClick={() => setShowEducation(!showEducation)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <GraduationCap className="h-4 w-4" />
              <span>{showEducation ? 'Hide' : 'Show'} Education</span>
            </Button>
          </div>
        </div>

        {showEducation && (
          <div className="mb-8">
            <ScoutingEducation />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Pick Lists</h2>
                <Button
                  size="sm"
                  onClick={() => setIsCreatingNew(true)}
                  className="p-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {isCreatingNew && (
                <div className="mb-4 p-3 border border-gray-200 rounded-md">
                  <Input
                    placeholder="Pick list name..."
                    value={newPickListName}
                    onChange={(e) => setNewPickListName(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleCreateNew}>
                      Create
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewPickListName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {pickLists.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No pick lists yet. Create your first one!
                  </p>
                ) : (
                  pickLists.map((pickList) => (
                    <div
                      key={pickList.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedPickList?.id === pickList.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleSelectPickList(pickList)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{pickList.name}</h3>
                          <p className="text-sm text-gray-500">
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
                          className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
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
            <Card className="p-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pick List Tips</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Focus on Total Score</p>
                    <p>Teams with higher average scores are generally more reliable.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Trophy className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Consider Consistency</p>
                    <p>Look for teams with consistent performance across matches.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Users className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Balance Your Alliance</p>
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
              <Card className="p-8 text-center">
                <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Pick List
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose an existing pick list from the sidebar or create a new one to get started.
                </p>
                <Button onClick={() => setIsCreatingNew(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Pick List
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
}
