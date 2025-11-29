import React, { useState } from 'react';
import { Layout } from "@/components/Layout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MentalCoachChatBoard from "@/components/MentalCoachChatBoard";
import { 
  Brain, 
  MessageCircle, 
  Lightbulb, 
  Heart,
  Send,
  Sparkles,
  Crown,
  X
} from "lucide-react";

const MentalCoach = () => {
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  
  const suggestedQuestions = [
    "Feeling nervous about the interview?",
    "How to deal with coding competition stress?",
    "Tips for managing study burnout?",
    "Building confidence before presentations?"
  ];

  const handleConnectDoctor = (doctorName: string) => {
    setShowPremiumPopup(true);
  };

  const PremiumPopup = () => (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${showPremiumPopup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 transform transition-all duration-300 ${showPremiumPopup ? 'scale-100' : 'scale-95'}`}>
        <div className="text-center space-y-6">
          {/* Close button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPremiumPopup(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Premium icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          {/* Title and message */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold gradient-mental">Premium Feature</h3>
            <p className="text-muted-foreground">
              You need to upgrade to Premium version to access professional mental health consultations and personalized therapy sessions.
            </p>
          </div>
          
          {/* Premium benefits */}
          <div className="text-left space-y-2 bg-gradient-to-br from-mental/10 to-mental/5 p-4 rounded-xl">
            <h4 className="font-semibold text-mental mb-2">Premium Benefits:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Direct access to licensed psychologists</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Personalized therapy sessions</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>1-on-1 video consultations</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Mental health assessment reports</span>
              </li>
            </ul>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPremiumPopup(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1 bg-gradient-mental hover:opacity-90"
              onClick={() => {
                setShowPremiumPopup(false);
                // Here you can add navigation to premium upgrade page
                console.log('Redirecting to premium upgrade...');
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-mental flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-mental">Mental Wellness Coach</h1>
              <p className="text-muted-foreground">Your empathetic AI companion for mental well-being</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <MentalCoachChatBoard />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mood Tracker */}
            <DashboardCard title="Mood Check" variant="mental">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">😊</div>
                  <div className="text-sm text-muted-foreground">Current mood</div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {['😢', '😔', '😐', '😊', '😄'].map((emoji, i) => (
                    <button
                      key={i}
                      className="p-2 rounded-lg hover:bg-mental/10 transition-colors"
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DashboardCard>

            {/* Quick Tips */}
            <DashboardCard title="Today's Tip" variant="mental">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-mental" />
                  <span className="font-medium">Mindful Breathing</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Try the 4-7-8 technique: Inhale for 4, hold for 7, exhale for 8. 
                  Perfect before your coding contest!
                </p>
                <Button variant="outline" size="sm" className="w-full border-mental/30">
                  Start Exercise
                </Button>
              </div>
            </DashboardCard>

            {/* Recent Sessions */}
            <DashboardCard title="Recent Sessions" variant="mental">
              <div className="space-y-3">
                {[
                  { date: "Today", topic: "Contest Anxiety", duration: "15m" },
                  { date: "Yesterday", topic: "Study Motivation", duration: "22m" },
                  { date: "2 days ago", topic: "Sleep Schedule", duration: "18m" }
                ].map((session, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-mental/10">
                    <div>
                      <div className="text-sm font-medium">{session.topic}</div>
                      <div className="text-xs text-muted-foreground">{session.date}</div>
                    </div>
                    <div className="text-xs text-mental">{session.duration}</div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Recommended Psychological Mental Doctors */}
        <DashboardCard title="🧠 Recommended Psychological Mental Doctors" variant="mental" size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Doctor 1 - Dr. Sarah Mitchell */}
            <div className="p-6 glass rounded-xl border border-mental/20 hover:border-mental/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">SM</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-mental">Dr. Sarah Mitchell</h3>
                  <p className="text-sm text-muted-foreground">Clinical Psychologist</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Anxiety</Badge>
                    <Badge variant="secondary" className="text-xs">Depression</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 12+ years</p>
                    <p><strong>Specialization:</strong> Anxiety disorders and cognitive behavioral therapy</p>
                    <p><strong>Best for:</strong> Students with performance anxiety and stress management</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.9/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-mental hover:opacity-90 text-sm"
                  onClick={() => handleConnectDoctor('Dr. Sarah Mitchell')}
                >
                  Consult Dr. Sarah
                </Button>
              </div>
            </div>

            {/* Doctor 2 - Dr. Michael Chen */}
            <div className="p-6 glass rounded-xl border border-mental/20 hover:border-mental/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">MC</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-mental">Dr. Michael Chen</h3>
                  <p className="text-sm text-muted-foreground">Behavioral Therapist</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">ADHD</Badge>
                    <Badge variant="secondary" className="text-xs">Focus</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 10+ years</p>
                    <p><strong>Specialization:</strong> ADHD and attention disorders in tech professionals</p>
                    <p><strong>Best for:</strong> Developers struggling with focus and productivity</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.8/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-mental hover:opacity-90 text-sm"
                  onClick={() => handleConnectDoctor('Dr. Michael Chen')}
                >
                  Consult Dr. Michael
                </Button>
              </div>
            </div>

            {/* Doctor 3 - Dr. Emily Rodriguez */}
            <div className="p-6 glass rounded-xl border border-mental/20 hover:border-mental/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">ER</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-mental">Dr. Emily Rodriguez</h3>
                  <p className="text-sm text-muted-foreground">Stress Management Specialist</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Burnout</Badge>
                    <Badge variant="secondary" className="text-xs">Mindfulness</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 8+ years</p>
                    <p><strong>Specialization:</strong> Workplace burnout and mindfulness therapy</p>
                    <p><strong>Best for:</strong> Professionals dealing with work-life balance issues</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.9/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-mental hover:opacity-90 text-sm"
                  onClick={() => handleConnectDoctor('Dr. Emily Rodriguez')}
                >
                  Consult Dr. Emily
                </Button>
              </div>
            </div>

            {/* Doctor 4 - Dr. James Wilson */}
            <div className="p-6 glass rounded-xl border border-mental/20 hover:border-mental/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">JW</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-mental">Dr. James Wilson</h3>
                  <p className="text-sm text-muted-foreground">Career Counseling Psychologist</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Career</Badge>
                    <Badge variant="secondary" className="text-xs">Confidence</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 15+ years</p>
                    <p><strong>Specialization:</strong> Career transitions and imposter syndrome</p>
                    <p><strong>Best for:</strong> Tech professionals facing career decisions</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.7/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-mental hover:opacity-90 text-sm"
                  onClick={() => handleConnectDoctor('Dr. James Wilson')}
                >
                  Consult Dr. James
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              All doctors are licensed mental health professionals with verified credentials and positive patient reviews.
            </p>
            <Button variant="outline" className="border-mental/30 hover:bg-mental/10">
              View All Doctors
            </Button>
          </div>
        </DashboardCard>
        
        {/* Premium Popup */}
        <PremiumPopup />
      </div>
    </Layout>
  );
};

export default MentalCoach;