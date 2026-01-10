import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Button } from '../components/ui';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  BookOpen,
  Target,
  Clock,
  Users,
  Zap,
  Shield,
  ChevronRight,
  ChevronDown,
  Gamepad2,
  Trophy,
  Timer,
  MapPin
} from 'lucide-react';
import Layout from '@/components/layout/Layout';

interface GameSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  subsections?: {
    title: string;
    content: string;
  }[];
}

const gameSections: GameSection[] = [
  {
    id: 'overview',
    title: 'Game Overview',
    icon: <Gamepad2 className="w-6 h-6" />,
    content: 'FIRST Robotics Competition: REBUILT presented by Haas is the 2026 FRC game. Teams compete in alliances of three robots each, working together to score points by placing FUEL in HUBs and climbing the TOWER.',
    subsections: [
      {
        title: 'Match Duration',
        content: 'Each match consists of an Autonomous Period (first 20 seconds) followed by a Teleoperated Period (last 2:20, especially the last 0:30 Endgame).'
      },
      {
        title: 'Competition Format',
        content: 'Teams compete in alliances of three robots each, working together to score points and defeat their opponents. The alliance with the highest score wins the match.'
      }
    ]
  },
  {
    id: 'scoring',
    title: 'Scoring (Points Only)',
    icon: <Target className="w-6 h-6" />,
    content: 'Scoring in REBUILT 2026 is based on FUEL placement and TOWER climbing. Understanding the scoring system is crucial for effective strategy.',
    subsections: [
      {
        title: 'FUEL Scoring',
        content: 'FUEL in active HUB (AUTO or TELEOP): 1 point per FUEL scored. FUEL in inactive HUB: 0 points (never scores). During Endgame (last 30 seconds), both HUBs are active, so every FUEL correctly scored = 1 point.'
      },
      {
        title: 'AUTO TOWER (First 20 seconds)',
        content: 'LEVEL 1 climb per ROBOT: 15 points. Robots must be fully supported by the lowest rung to earn these points.'
      },
      {
        title: 'TELEOP/END GAME TOWER (Last 2:20, especially last 0:30)',
        content: 'LEVEL 2 climb per ROBOT: 20 points (BUMPERS completely above LOW RUNG). LEVEL 3 climb per ROBOT: 30 points (BUMPERS completely above MID RUNG). Each ROBOT earns points for only one LEVEL in TELEOP/END GAME.'
      },
      {
        title: 'Evaluation Timing',
        content: 'TOWER points are evaluated about 3 seconds after the match ends or when all robots have come to rest. FUEL scoring is also evaluated for up to 3 seconds after AUTO and after the match end to catch late-entering FUEL.'
      }
    ]
  },
  {
    id: 'autonomous',
    title: 'Autonomous Period (First 20 seconds)',
    icon: <Zap className="w-6 h-6" />,
    content: 'During the Autonomous period, robots operate using pre-programmed code. All scoring during this period sets the stage for the rest of the match.',
    subsections: [
      {
        title: 'Autonomous Objectives',
        content: 'Robots can score FUEL in the active HUB (1 point per FUEL) and attempt TOWER LEVEL 1 climbs (15 points per robot). The Alliance with more FUEL scored in Auto determines which goal becomes inactive during Shifts 2 and 4 in Teleop.'
      },
      {
        title: 'Auto Shift Advantage',
        content: 'The Alliance with more FUEL scored in Auto determines which goal becomes inactive during Shifts 2 and 4 in Teleop. This strategic advantage can significantly impact match outcomes.'
      }
    ]
  },
  {
    id: 'teleop',
    title: 'Teleoperated Period (Last 2:20)',
    icon: <Users className="w-6 h-6" />,
    content: 'During the Teleoperated period, drivers take control. Scoring shifts focus to cycle efficiency and navigating field obstacles.',
    subsections: [
      {
        title: 'FUEL Scoring',
        content: 'FUEL in active HUB: 1 point per FUEL scored. FUEL in inactive HUB: 0 points. The active/inactive status is determined by Auto performance.'
      },
      {
        title: 'TOWER Climbing',
        content: 'Robots can climb the TOWER during Teleop, earning 20 points for LEVEL 2 (BUMPERS above LOW RUNG) or 30 points for LEVEL 3 (BUMPERS above MID RUNG). Only the highest level achieved counts per robot.'
      },
      {
        title: 'The "Shift" Mechanic',
        content: 'Transition Shift: The initial segment of Teleop. Alliance Shifts: Periodically, goals may become inactive. Refer to the FMS Game Data (\'R\' or \'B\') to identify which goal to target.'
      }
    ]
  },
  {
    id: 'endgame',
    title: 'Endgame Period (Last 30 seconds: 0:30-0:00)',
    icon: <Trophy className="w-6 h-6" />,
    content: 'The Endgame focuses on the TOWER, a vertical structure requiring robots to climb and support their own weight. During Endgame, both HUBs are active.',
    subsections: [
      {
        title: 'Endgame FUEL Scoring',
        content: 'During Endgame (0:30-0:00), both HUBs are active, so every FUEL correctly scored = 1 point. This creates a high-scoring opportunity in the final moments of the match.'
      },
      {
        title: 'Endgame TOWER Climbing',
        content: 'Robots may score TELEOP TOWER climbs during Endgame: LEVEL 2 (BUMPERS completely above LOW RUNG) = 20 points per ROBOT, LEVEL 3 (BUMPERS completely above MID RUNG) = 30 points per ROBOT. These TOWER points contribute both to your match score and toward the TRAVERSAL ranking point threshold (50+ TOWER points at regionals).'
      },
      {
        title: 'Match Deciders',
        content: 'Endgame performance often determines match winners, as the combination of active HUBs and TOWER climbing opportunities can significantly change the score in the final moments.'
      }
    ]
  },
  {
    id: 'strategy',
    title: 'Strategy & Tactics',
    icon: <Target className="w-6 h-6" />,
    content: 'Successful REBUILT 2026 teams combine technical excellence with strategic thinking, developing game plans that maximize FUEL scoring and TOWER climbing while managing active/inactive HUB status.',
    subsections: [
      {
        title: 'Active vs Inactive HUB Strategy',
        content: 'Understanding which HUB is active during different periods is crucial. The Alliance with more FUEL in Auto determines inactive HUBs during Shifts 2 and 4, making Auto performance strategically important.'
      },
      {
        title: 'TOWER Climbing Strategy',
        content: 'TOWER points are evaluated 3 seconds after match end, so robots must maintain their position. Each robot earns points for only one LEVEL, so teams must decide whether to attempt LEVEL 2 or LEVEL 3 based on robot capabilities.'
      },
      {
        title: 'Endgame Strategy',
        content: 'With both HUBs active during Endgame, teams should maximize FUEL scoring in the final 30 seconds. TOWER climbing during Endgame can provide both match points and ranking point opportunities.'
      }
    ]
  }
];

export default function LearnGame() {
  const { user, loading: authLoading } = useSupabase();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [videoUrl, setVideoUrl] = useState(''); // Placeholder for video URL

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg self-start">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  REBUILT 2026 Game Rules
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Comprehensive guide to FIRST Robotics Competition: REBUILT presented by Haas
                </p>
              </div>
            </div>
          </div>

          {/* Video Section */}
          <Card className="mb-6 sm:mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-foreground">
                <div className="flex items-center space-x-2">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span className="text-lg sm:text-xl">Game Introduction Video</span>
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm sm:text-base">
                Watch this official REBUILT 2026 game animation to understand the basics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/_fybREErgyM"
                  title="REBUILT 2026 Game Animation"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>

          {/* Game Sections */}
          <div className="space-y-6">
            {gameSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          {section.icon}
                        </div>
                        <div>
                          <CardTitle className="text-foreground text-lg sm:text-xl">
                            {section.title}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="p-2 hover:bg-muted rounded-lg transition-colors">
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedSections.has(section.id) && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <p className="text-foreground leading-relaxed">
                          {section.content}
                        </p>
                        
                        {section.subsections && (
                          <div className="space-y-4">
                            {section.subsections.map((subsection, subIndex) => (
                              <motion.div
                                key={subIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: subIndex * 0.1 }}
                                className="p-4 bg-muted/50 rounded-lg border-l-4 border-blue-500"
                              >
                                <h4 className="font-semibold text-foreground mb-2">
                                  {subsection.title}
                                </h4>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {subsection.content}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

        </motion.div>
      </div>
    </Layout>
  );
}
