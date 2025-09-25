import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TeamStatsCard, QuickStats } from './TeamStatsCard';
import { TeamComparisonModal, QuickComparison } from './TeamComparisonModal';
import { AdvancedTeamAnalysis } from './AdvancedTeamAnalysis';
import { TeamStats, PickListTeam } from '@/lib/types';
import { GripVertical, Plus, Save, Trash2, Edit3, Brain, Target, BarChart3, Shield } from 'lucide-react';

interface SortableTeamItemProps {
  team: PickListTeam;
  onUpdateNotes: (teamNumber: number, notes: string) => void;
  onRemove: (teamNumber: number) => void;
}

function SortableTeamItem({ team, onUpdateNotes, onRemove }: SortableTeamItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.team_number.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(team.notes || '');

  const handleSaveNotes = () => {
    onUpdateNotes(team.team_number, notes);
    setIsEditingNotes(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Card className="p-6 mb-3 bg-neutral-100 dark:bg-neutral-800 border-l-4 border-l-primary rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-300"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  #{team.pick_order} - Team {team.team_number}
                </h3>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{team.team_name}</span>
              </div>
              
              {team.stats && (
                <QuickStats stats={team.stats} className="mb-2" />
              )}
              
              <div className="flex items-center space-x-3">
                {isEditingNotes ? (
                  <div className="flex items-center space-x-3 flex-1">
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes..."
                      className="flex-1 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleSaveNotes}
                      className="px-4 py-2 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300"
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setNotes(team.notes || '');
                        setIsEditingNotes(false);
                      }}
                      className="px-4 py-2 rounded-full border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors duration-300"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 italic">
                      {team.notes || 'No notes added'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingNotes(true)}
                      className="p-2 h-8 w-8 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-300"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(team.team_number)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface TeamSelectorProps {
  availableTeams: Array<{ team_number: number; team_name: string; stats?: TeamStats }>;
  onAddTeam: (team: PickListTeam) => void;
  selectedTeamNumbers: number[];
}

function TeamSelector({ availableTeams, onAddTeam, selectedTeamNumbers }: TeamSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'number'>('score');

  const filteredTeams = availableTeams
    .filter(team => 
      !selectedTeamNumbers.includes(team.team_number) &&
      (team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       team.team_number.toString().includes(searchTerm))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.stats?.avg_total_score || 0) - (a.stats?.avg_total_score || 0);
        case 'name':
          return a.team_name.localeCompare(b.team_name);
        case 'number':
          return a.team_number - b.team_number;
        default:
          return 0;
      }
    });

  return (
    <Card className="p-6 rounded-2xl shadow-card dark:shadow-card-dark bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">Available Teams</h3>
      
      <div className="flex items-center space-x-3 mb-6">
        <Input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'score' | 'name' | 'number')}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
        >
          <option value="score">Sort by Score</option>
          <option value="name">Sort by Name</option>
          <option value="number">Sort by Number</option>
        </select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTeams.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <Brain className="h-8 w-8 mx-auto mb-3 text-neutral-400" />
            <p className="text-sm">No teams available</p>
            <p className="text-xs text-neutral-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div key={team.team_number} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:shadow-sm transition-all duration-300">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">Team {team.team_number}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-32">{team.team_name}</span>
                </div>
                {team.stats ? (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{team.stats.avg_total_score.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="h-3 w-3 text-green-500" />
                      <span className="text-neutral-600 dark:text-neutral-300">{team.stats.total_matches}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="h-3 w-3 text-purple-500" />
                      <span className="text-neutral-600 dark:text-neutral-300">{team.stats.avg_defense_rating.toFixed(1)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400">No stats available</div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => onAddTeam({
                  team_number: team.team_number,
                  team_name: team.team_name,
                  pick_order: 0, // Will be updated when added to list
                  stats: team.stats,
                })}
                className="ml-4 px-4 py-2 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

interface PickListProps {
  pickListId?: string;
  eventKey?: string;
  onSave?: (pickList: any) => void;
  session?: any;
}

export function PickList({ pickListId, eventKey = '2025test', onSave, session }: PickListProps) {
  const [teams, setTeams] = useState<PickListTeam[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Array<{ team_number: number; team_name: string; stats?: TeamStats }>>([]);
  const [pickListName, setPickListName] = useState('My Pick List');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [pickListId, eventKey, session]);

  const loadData = async () => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      // Load available teams with stats
      const teamsResponse = await fetch('/api/teams');
      const teamsData = await teamsResponse.json();
      
      // Get team stats for all teams
      const teamsWithStats = await Promise.all(
        teamsData.teams.map(async (team: any) => {
          try {
            const statsResponse = await fetch(`/api/team-stats?team_number=${team.team_number}`);
            const statsData = await statsResponse.json();
            return {
              team_number: team.team_number,
              team_name: team.team_name,
              stats: statsData,
            };
          } catch (error) {
            return {
              team_number: team.team_number,
              team_name: team.team_name,
            };
          }
        })
      );

      setAvailableTeams(teamsWithStats);

      // Load existing pick list if ID provided
      if (pickListId) {
        const response = await fetch(`/api/pick-lists?id=${pickListId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.teams) {
          setTeams(data.teams);
          setPickListName(data.name);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTeams((items) => {
        const oldIndex = items.findIndex((item) => item.team_number.toString() === active.id);
        const newIndex = items.findIndex((item) => item.team_number.toString() === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update pick order
        return newItems.map((item, index) => ({
          ...item,
          pick_order: index + 1,
        }));
      });
    }
  };

  const handleAddTeam = (team: PickListTeam) => {
    const newTeam = {
      ...team,
      pick_order: teams.length + 1,
    };
    setTeams([...teams, newTeam]);
  };

  const handleRemoveTeam = (teamNumber: number) => {
    const newTeams = teams
      .filter(team => team.team_number !== teamNumber)
      .map((team, index) => ({
        ...team,
        pick_order: index + 1,
      }));
    setTeams(newTeams);
  };

  const handleUpdateNotes = (teamNumber: number, notes: string) => {
    setTeams(teams.map(team => 
      team.team_number === teamNumber 
        ? { ...team, notes }
        : team
    ));
  };

  const handleSave = async () => {
    if (!session) return;
    
    setIsSaving(true);
    try {
      const pickListData = {
        name: pickListName,
        event_key: eventKey,
        teams: teams,
      };

      const url = pickListId ? `/api/pick-lists?id=${pickListId}` : '/api/pick-lists';
      const method = pickListId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(pickListData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (onSave) {
        onSave(data);
      }
      
      // Show success message
      console.log('Pick list saved successfully');
    } catch (error) {
      console.error('Error saving pick list:', error);
      alert('Failed to save pick list. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading pick list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            value={pickListName}
            onChange={(e) => setPickListName(e.target.value)}
            className="text-xl font-semibold border-none bg-transparent p-0 text-neutral-900 dark:text-neutral-100"
          />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {teams.length} teams selected
          </span>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-6 py-3 rounded-full bg-primary text-white hover:opacity-90 transition-opacity duration-300 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Pick List'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Pick Order</h2>
            {teams.length > 0 && (
              <QuickComparison
                teams={teams}
                onOpenComparison={() => setShowComparison(true)}
              />
            )}
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={teams.map(team => team.team_number.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {teams.length === 0 ? (
                  <Card className="p-8 text-center rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <Target className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
                    <p className="text-neutral-500 dark:text-neutral-400">No teams selected yet. Add teams from the available list.</p>
                  </Card>
                ) : (
                  teams.map((team) => (
                    <SortableTeamItem
                      key={team.team_number}
                      team={team}
                      onUpdateNotes={handleUpdateNotes}
                      onRemove={handleRemoveTeam}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-6">
          <AdvancedTeamAnalysis
            availableTeams={availableTeams}
            currentPickList={teams}
            onAddTeam={handleAddTeam}
            selectedTeamNumbers={teams.map(team => team.team_number)}
          />
          
          <TeamSelector
            availableTeams={availableTeams}
            onAddTeam={handleAddTeam}
            selectedTeamNumbers={teams.map(team => team.team_number)}
          />
        </div>
      </div>

      <TeamComparisonModal
        teams={teams}
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
      />
    </div>
  );
}
