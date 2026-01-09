import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { GripVertical, Plus, Save, Trash2, Edit3, Brain, Target, BarChart3, Shield, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface SortableTeamItemProps {
  team: PickListTeam;
  onUpdateNotes: (teamNumber: number, notes: string) => void;
  onRemove: (teamNumber: number) => void;
}

function SortableTeamItem({ team, onUpdateNotes, onRemove }: SortableTeamItemProps) {
  const router = useRouter();
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

  const handleTeamClick = () => {
    router.push(`/team/${team.team_number}`);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(team.team_number, notes);
    setIsEditingNotes(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Card className="p-6 mb-3 bg-card border-l-4 border-l-primary rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors duration-300"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <button
                  onClick={handleTeamClick}
                  className="flex items-center space-x-2 hover:text-primary transition-colors duration-300 group"
                >
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary">
                    #{team.pick_order} - Team {team.team_number}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </button>
                <span className="text-sm text-muted-foreground">{team.team_name}</span>
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
                      className="flex-1 bg-background border-border text-foreground"
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
                      className="px-4 py-2 rounded-full border-border text-muted-foreground hover:bg-muted transition-colors duration-300"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-sm text-muted-foreground italic">
                      {team.notes || 'No notes added'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingNotes(true)}
                      className="p-2 h-8 w-8 rounded-full hover:bg-muted transition-colors duration-300"
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
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'number'>('score');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredTeams = availableTeams
    .filter(team => !selectedTeamNumbers.includes(team.team_number))
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

  const handleAddSelectedTeam = () => {
    if (!selectedTeam) return;
    
    const team = availableTeams.find(t => t.team_number.toString() === selectedTeam);
    if (team) {
      onAddTeam({
        team_number: team.team_number,
        team_name: team.team_name,
        pick_order: 0, // Will be updated when added to list
        stats: team.stats,
      });
      setSelectedTeam(''); // Reset selection
    }
  };

  return (
    <div className="glass-card rounded-xl border border-white/5 w-full flex flex-col overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <h3 className="text-sm font-semibold text-foreground">Available Teams</h3>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="p-4">
          <div className="flex flex-col space-y-2 mb-3">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 border border-white/10 rounded-lg text-xs sm:text-sm bg-background/50 text-foreground hover:bg-white/5 transition-colors min-h-[40px]"
            >
              <option value="">Select a team to add...</option>
              {filteredTeams.map((team) => (
                <option key={team.team_number} value={team.team_number.toString()}>
                  Team {team.team_number} - {team.team_name}
                  {team.stats ? ` (${team.stats.avg_total_score.toFixed(1)} pts)` : ' (No stats)'}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'name' | 'number')}
              className="px-3 py-2 border border-white/10 rounded-lg text-xs sm:text-sm bg-background/50 text-foreground hover:bg-white/5 transition-colors min-h-[40px]"
            >
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Name</option>
              <option value="number">Sort by Number</option>
            </select>
          </div>

          <Button
            onClick={handleAddSelectedTeam}
            disabled={!selectedTeam}
            className="w-full px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-xs sm:text-sm mb-3 min-h-[40px]"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Selected Team
          </Button>

          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {filteredTeams.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Brain className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs">No teams available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">All teams have been added</p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mb-2">
                {filteredTeams.length} teams available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
      // Load all team stats in one API call instead of individual calls
      const statsResponse = await fetch('/api/team-stats');
      
      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch team stats: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      console.log('Raw stats data:', statsData);
      
      // Filter out Team Avalanche and map the data
      const teamsWithStats = (statsData.stats || [])
        .filter((team: any) => !team.team_name.toLowerCase().includes('avalanche'))
        .map((team: any) => ({
          team_number: team.team_number,
          team_name: team.team_name,
          stats: team,
        }));

      console.log('Loaded teams with stats:', teamsWithStats.length);
      console.log('Sample team data:', teamsWithStats[0]);
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
      const pickListData: any = {
        name: pickListName,
        event_key: eventKey,
        teams: teams,
      };

      // For PUT requests, include the ID in the request body
      if (pickListId) {
        pickListData.id = pickListId;
      }

      const url = '/api/pick-lists';
      const method = pickListId ? 'PUT' : 'POST';

      console.log('Saving pick list:', { method, pickListData });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(pickListData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (onSave) {
        onSave(data);
      }
      
      // Show success message
      console.log('Pick list saved successfully:', data);
    } catch (error) {
      console.error('Error saving pick list:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save pick list. Please try again.';
      alert(errorMessage);
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
            className="text-xl font-semibold border-none bg-transparent p-0 text-card-foreground"
          />
          <span className="text-sm text-muted-foreground">
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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 order-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
            <h2 className="text-lg font-semibold text-card-foreground">Pick Order</h2>
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
                  <Card className="p-8 text-center rounded-xl bg-card border border-border">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No teams selected yet. Add teams from the available list.</p>
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

        <div className="xl:col-span-2 space-y-4 min-w-[300px] order-2">
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
