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
  Award,
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
    content: 'FIRST Robotics Competition (FRC) is an international high school robotics competition where teams of students work with professional mentors to design, build, and program robots to compete in challenging field games.',
    subsections: [
      {
        title: 'Competition Format',
        content: 'Teams compete in alliances of three robots each, working together to score points and defeat their opponents. Each match lasts 2 minutes and 30 seconds, with different phases offering various scoring opportunities.'
      },
      {
        title: 'Season Structure',
        content: 'The competition season typically runs from January to April, with regional competitions leading to district championships and ultimately the World Championship in Houston, Texas.'
      }
    ]
  },
  {
    id: 'field',
    title: 'Field Layout & Scoring',
    icon: <MapPin className="w-6 h-6" />,
    content: 'The playing field is a 27ft x 54ft arena with various scoring elements strategically placed to create challenging gameplay and multiple strategic options.',
    subsections: [
      {
        title: 'Scoring Elements',
        content: 'The field contains multiple scoring zones including speaker targets, amp stations, source stations, and stage areas. Each element offers different point values and strategic advantages.'
      },
      {
        title: 'Alliance Stations',
        content: 'Each alliance has a designated station area where human players can interact with the field elements and provide strategic support to their robots during matches.'
      }
    ]
  },
  {
    id: 'autonomous',
    title: 'Autonomous Period',
    icon: <Zap className="w-6 h-6" />,
    content: 'The first 15 seconds of each match is the autonomous period, where robots operate without human control using pre-programmed instructions.',
    subsections: [
      {
        title: 'Autonomous Objectives',
        content: 'During autonomous, robots can score points by placing game pieces in specific locations, moving to strategic positions, or completing complex tasks that give their alliance an early advantage.'
      },
      {
        title: 'Programming Challenge',
        content: 'Teams must program their robots to navigate the field, avoid obstacles, and execute precise movements all while operating independently for the full 15-second period.'
      }
    ]
  },
  {
    id: 'teleop',
    title: 'Teleoperated Period',
    icon: <Users className="w-6 h-6" />,
    content: 'The main 2 minutes and 15 seconds of the match is teleoperated, where human drivers control their robots using game controllers and strategic decision-making.',
    subsections: [
      {
        title: 'Driver Control',
        content: 'Each robot is controlled by a team of drivers who must work together to execute their alliance strategy, score points, and defend against opponents while managing limited resources.'
      },
      {
        title: 'Strategy & Coordination',
        content: 'Successful teleop play requires excellent communication between alliance partners, quick decision-making, and the ability to adapt to changing match conditions in real-time.'
      }
    ]
  },
  {
    id: 'endgame',
    title: 'Endgame Phase',
    icon: <Trophy className="w-6 h-6" />,
    content: 'The final 30 seconds of each match is the endgame, where teams can earn significant bonus points by completing challenging tasks that often determine match outcomes.',
    subsections: [
      {
        title: 'Endgame Objectives',
        content: 'Endgame tasks typically involve climbing, hanging, or balancing on elevated structures, requiring precise robot design and skilled driver execution under pressure.'
      },
      {
        title: 'Match Deciders',
        content: 'Endgame performance often determines match winners, as the bonus points available can completely change the score and provide crucial ranking points for tournament advancement.'
      }
    ]
  },
  {
    id: 'strategy',
    title: 'Strategy & Tactics',
    icon: <Target className="w-6 h-6" />,
    content: 'Successful FRC teams combine technical excellence with strategic thinking, developing game plans that maximize their strengths while exploiting opponent weaknesses.',
    subsections: [
      {
        title: 'Alliance Selection',
        content: 'During alliance selection, top-ranked teams choose partners based on complementary capabilities, creating alliances that can execute complex strategies and adapt to different opponents.'
      },
      {
        title: 'Match Strategy',
        content: 'Each match requires different strategies based on opponent capabilities, field conditions, and alliance composition. Teams must balance offensive scoring with defensive play.'
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Learn the Game
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                  Comprehensive guide to FIRST Robotics Competition gameplay
                </p>
              </div>
            </div>
          </div>

          {/* Video Section */}
          <Card className="mb-6 sm:mb-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-gray-900 dark:text-white">
                <div className="flex items-center space-x-2">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <span className="text-lg sm:text-xl">Game Introduction Video</span>
                </div>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Watch this official game animation to understand the basics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {videoUrl ? (
                  <video
                    className="w-full h-full object-cover"
                    controls
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-900">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white text-lg mb-2">Video Coming Soon</p>
                      <p className="text-gray-400 text-sm">
                        Official game animation will be embedded here
                      </p>
                      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                        <p className="text-gray-300 text-sm">
                          <strong>Placeholder:</strong> This is where the official FIRST Robotics Competition 
                          game animation video will be embedded. The video will provide a comprehensive 
                          overview of the game rules, field layout, and scoring mechanisms.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsMuted(!isMuted)}
                    className="bg-black/50 hover:bg-black/70 text-white border-0"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
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
                          <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">
                            {section.title}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedSections.has(section.id) && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
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
                                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500"
                              >
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                  {subsection.title}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
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

          {/* Additional Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-blue-900 dark:text-blue-100">
                  <Award className="w-6 h-6" />
                  <span>Additional Resources</span>
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Expand your knowledge with these official resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                      Official Game Manual
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-3">
                      Complete rules, regulations, and technical specifications
                    </p>
                    <Button size="sm" variant="outline" className="w-full text-xs sm:text-sm">
                      Download Manual
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-card rounded-lg border border-border">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                      Strategy Guide
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-3">
                      Advanced tactics and strategic considerations
                    </p>
                    <Button size="sm" variant="outline" className="w-full text-xs sm:text-sm">
                      View Guide
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
