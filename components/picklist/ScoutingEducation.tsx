import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Trophy, 
  Users, 
  Shield, 
  TrendingUp, 
  BarChart3,
  Lightbulb,
  BookOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface StrategyTipProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  category: 'scoring' | 'defense' | 'strategy' | 'alliance';
}

function StrategyTip({ icon, title, description, category }: StrategyTipProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'scoring': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'defense': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'strategy': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'alliance': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-semibold text-card-foreground">{title}</h3>
          <Badge className={getCategoryColor(category)}>
            {category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function ExpandableSection({ title, children, defaultExpanded = false }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded-lg p-2 transition-colors"
      >
        <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {children}
        </div>
      )}
    </Card>
  );
}

export function ScoutingEducation() {
  const [activeTab, setActiveTab] = useState<'basics' | 'strategy' | 'tips'>('basics');

  const tabs = [
    { id: 'basics', label: 'Scouting Basics', icon: BookOpen },
    { id: 'strategy', label: 'Game Strategy', icon: Target },
    { id: 'tips', label: 'Pro Tips', icon: Lightbulb },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Scouting Education Center</h2>
        <p className="text-muted-foreground">
          Learn how to scout effectively and make better alliance decisions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'basics' && (
        <div className="space-y-6">
          <ExpandableSection title="What is Scouting?" defaultExpanded>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Scouting is the process of observing and recording data about robot performance during matches. 
                This data helps teams make informed decisions during alliance selection and strategy planning.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary mb-1">Quantitative Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Measurable metrics like scores, cycle times, and success rates
                  </p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                  <h4 className="font-semibold text-secondary-foreground mb-1">Qualitative Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Observations about robot behavior, reliability, and strategy
                  </p>
                </div>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Key Metrics to Track">
            <div className="space-y-3">
              <StrategyTip
                icon={<Target className="h-5 w-5 text-green-600" />}
                title="Scoring Performance"
                description="Track autonomous and teleop scoring capabilities, including accuracy and consistency"
                category="scoring"
              />
              <StrategyTip
                icon={<Shield className="h-5 w-5 text-blue-600" />}
                title="Defense Capability"
                description="Rate how well teams can defend against opponents and disrupt their strategies"
                category="defense"
              />
              <StrategyTip
                icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
                title="Reliability"
                description="Measure consistency across matches and ability to perform under pressure"
                category="strategy"
              />
            </div>
          </ExpandableSection>

          <ExpandableSection title="Data Collection Best Practices">
            <div className="space-y-3">
              <div className="p-3 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg">
                <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Be Objective</h4>
                <p className="text-sm text-muted-foreground">
                  Record what you observe, not what you think. Avoid bias and assumptions.
                </p>
              </div>
              <div className="p-3 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                <h4 className="font-semibold text-primary mb-1">Stay Consistent</h4>
                <p className="text-sm text-muted-foreground">
                  Use the same criteria and scale for all teams to ensure comparable data.
                </p>
              </div>
              <div className="p-3 bg-green-500/10 border-l-4 border-green-500 rounded-r-lg">
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">Record Everything</h4>
                <p className="text-sm text-muted-foreground">
                  Even small details can be important later. Better to have too much data than too little.
                </p>
              </div>
            </div>
          </ExpandableSection>
        </div>
      )}

      {activeTab === 'strategy' && (
        <div className="space-y-6">
          <ExpandableSection title="Alliance Selection Strategy" defaultExpanded>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Building a strong alliance requires balancing different strengths and weaknesses. 
                Here's how to think strategically about team selection.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Primary Picks</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose teams with high scoring potential and reliability
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• High average scores</li>
                    <li>• Consistent performance</li>
                    <li>• Strong autonomous</li>
                  </ul>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                  <h4 className="font-semibold text-secondary-foreground mb-2">Secondary Picks</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Complement your primary picks with specialized skills
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Defensive capabilities</li>
                    <li>• Unique scoring methods</li>
                    <li>• Endgame specialists</li>
                  </ul>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-accent-foreground mb-2">Backup Plans</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Always have alternatives in case your top choices aren't available
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Similar skill levels</li>
                    <li>• Different strategies</li>
                    <li>• Reliable performers</li>
                  </ul>
                </div>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Game Analysis">
            <div className="space-y-3">
              <StrategyTip
                icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                title="Score Trends"
                description="Look for teams improving over time vs. those declining in performance"
                category="strategy"
              />
              <StrategyTip
                icon={<Users className="h-5 w-5 text-blue-600" />}
                title="Alliance Synergy"
                description="Consider how teams' strengths complement each other rather than overlap"
                category="alliance"
              />
              <StrategyTip
                icon={<Trophy className="h-5 w-5 text-yellow-600" />}
                title="Match Context"
                description="Consider opponent strength and match importance when evaluating performance"
                category="strategy"
              />
            </div>
          </ExpandableSection>
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="space-y-6">
          <ExpandableSection title="Scouting Pro Tips" defaultExpanded>
            <div className="space-y-3">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-card-foreground mb-2">💡 Watch Multiple Matches</h4>
                <p className="text-sm text-muted-foreground">
                  One match can be misleading. Watch at least 3-4 matches to get a true picture of a team's capabilities.
                </p>
              </div>
              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                <h4 className="font-semibold text-card-foreground mb-2">📊 Focus on Consistency</h4>
                <p className="text-sm text-muted-foreground">
                  A team that scores 80 points consistently is often better than one that scores 100 sometimes and 40 other times.
                </p>
              </div>
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <h4 className="font-semibold text-card-foreground mb-2">🎯 Consider the Meta</h4>
                <p className="text-sm text-muted-foreground">
                  What strategies are working in your event? Teams that excel at the current meta are valuable picks.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-semibold text-card-foreground mb-2">🤝 Team Chemistry</h4>
                <p className="text-sm text-muted-foreground">
                  Some teams work better together than others. Consider past alliance success and communication.
                </p>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection title="Common Mistakes to Avoid">
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg">
                <h4 className="font-semibold text-destructive mb-1">❌ Recency Bias</h4>
                <p className="text-sm text-muted-foreground">
                  Don't overvalue teams based on their most recent match. Look at overall trends.
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg">
                <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-1">❌ Ignoring Defense</h4>
                <p className="text-sm text-muted-foreground">
                  High-scoring teams are great, but defense wins championships too.
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg">
                <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">❌ Overthinking</h4>
                <p className="text-sm text-muted-foreground">
                  Sometimes the obvious choice is the right choice. Don't overcomplicate your picks.
                </p>
              </div>
            </div>
          </ExpandableSection>
        </div>
      )}
    </div>
  );
}
