import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PickList } from '@/components/picklist/PickList';
import { ScoutingEducation } from '@/components/picklist/ScoutingEducation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PickList as PickListType } from '@/lib/types';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { Plus, List, Trophy, Target, Users, GraduationCap, Shield, AlertCircle, Home, Menu } from 'lucide-react';

export default function PickListMobilePage() {
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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You need admin privileges to access pick lists.</p>
            <Button onClick={() => router.push('/')} className="bg-primary hover:bg-primary/90">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading pick lists...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="p-2"
            >
              <Home size={20} />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Pick Lists</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEducation(!showEducation)}
            className="p-2"
          >
            <GraduationCap size={20} />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Create and manage team pick lists for alliance selection.
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {showEducation && (
          <div className="mb-4">
            <ScoutingEducation />
          </div>
        )}

        {/* Pick Lists Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">My Pick Lists</h2>
              <Button
                size="sm"
                onClick={() => setIsCreatingNew(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isCreatingNew && (
              <div className="mb-4 p-4 border border-border rounded-lg bg-muted/50">
                <Input
                  placeholder="Pick list name..."
                  value={newPickListName}
                  onChange={(e) => setNewPickListName(e.target.value)}
                  className="mb-3"
                />
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={handleCreateNew}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {pickLists.length === 0 ? (
                <div className="text-center py-8">
                  <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No pick lists yet. Create your first one!
                  </p>
                  <Button 
                    onClick={() => setIsCreatingNew(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pick List
                  </Button>
                </div>
              ) : (
                pickLists.map((pickList) => (
                  <div
                    key={pickList.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 border ${
                      selectedPickList?.id === pickList.id
                        ? 'bg-primary/10 border-primary/30 shadow-md'
                        : 'bg-card border-border hover:bg-muted/50 hover:shadow-sm'
                    }`}
                    onClick={() => handleSelectPickList(pickList)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          {pickList.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
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
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-1 h-6 w-6 rounded-full"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Pick List */}
        {selectedPickList ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedPickList.name}</span>
                <Badge variant="secondary">
                  {selectedPickList.teams.length} teams
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PickList
                pickListId={selectedPickList.id}
                eventKey={selectedPickList.event_key}
                onSave={handleSavePickList}
                session={session}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select a Pick List
              </h3>
              <p className="text-muted-foreground mb-4">
                Choose an existing pick list from above or create a new one to get started.
              </p>
              <Button 
                onClick={() => setIsCreatingNew(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Pick List
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span>Pick List Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Focus on Total Score</p>
                <p className="text-sm text-muted-foreground">Teams with higher average scores are generally more reliable.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Trophy className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Consider Consistency</p>
                <p className="text-sm text-muted-foreground">Look for teams with consistent performance across matches.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Balance Your Alliance</p>
                <p className="text-sm text-muted-foreground">Mix high-scoring teams with reliable defensive partners.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
