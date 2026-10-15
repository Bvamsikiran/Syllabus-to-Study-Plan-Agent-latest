/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenId, ScheduleSlot, SyllabusModule, ResourceItem } from './types';
import { INITIAL_MODULES, INITIAL_RESOURCES } from './data/mockData';
import { NavigationHeader } from './components/NavigationHeader';
import { LandingPage } from './components/LandingPage';
import { MasterSchedule } from './components/MasterSchedule';
import { Step1Upload } from './components/Step1Upload';
import { Step2Exam } from './components/Step2Exam';
import { Step3Bandwidth } from './components/Step3Bandwidth';
import { Step4Resources } from './components/Step4Resources';
import { ModernStudyDashboard } from './components/ModernStudyDashboard';
import { VoiceStudyCoach } from './components/VoiceStudyCoach';
import { GenerativeAITutor } from './components/GenerativeAITutor';
import { ApiKeyModal } from './components/ApiKeyModal';
import { apiKeyService } from './services/apiKeyService';
import { GoogleAuthProviderComponent, useGoogleAuth } from './context/GoogleAuthContext';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { GoogleSlidesModal } from './components/GoogleSlidesModal';
import { GoogleFormsModal } from './components/GoogleFormsModal';
import { GmailSyncModal } from './components/GmailSyncModal';
import {
  saveStudyPlanToFirestore,
  saveUserProfile,
  getLatestStudyPlanFromFirestore,
  getUserProfile,
} from './services/firestoreService';

function AppContent() {
  const getInitialScreen = (): ScreenId => {
    const hash = window.location.hash.replace('#', '') as ScreenId;
    const validScreens: ScreenId[] = [
      'overview',
      'landing',
      'master-schedule',
      'step1-upload',
      'step2-exam',
      'step3-bandwidth',
      'step4-resources',
      'dashboard',
      'voice-quiz',
      'voice-coach',
      'ai-tutor',
    ];
    return validScreens.includes(hash) ? hash : 'dashboard';
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(getInitialScreen);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(false);

  // Global state across onboarding & planner — strictly starts empty
  const [syllabusText, setSyllabusText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [targetDate, setTargetDate] = useState<string>('');
  const [targetScore, setTargetScore] = useState<number>(0);
  const [retentionMode, setRetentionMode] = useState<'aggressive' | 'balanced'>('balanced');

  // Bandwidth slots — starts empty unless user configures or loads saved profile
  const [slots, setSlots] = useState<Record<string, ScheduleSlot>>({});

  // Attached study resources — starts empty unless uploaded or saved
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);

  // Active course modules — starts empty unless parsed or saved
  const [modules, setModules] = useState<SyllabusModule[]>(INITIAL_MODULES);

  // Google Workspace modals & auth
  const {
    driveModalOpen,
    setDriveModalOpen,
    slidesModalOpen,
    setSlidesModalOpen,
    formsModalOpen,
    setFormsModalOpen,
    gmailModalOpen,
    setGmailModalOpen,
    user,
  } = useGoogleAuth();

  // Load user profile & saved study plan from Firestore on authentication;
  // Clear previous state on logout to prevent cross-account leakage.
  useEffect(() => {
    if (user) {
      getUserProfile()
        .then((profile) => {
          if (profile) {
            if (profile.targetDate) setTargetDate(profile.targetDate);
            if (profile.targetScore) setTargetScore(profile.targetScore);
            if (profile.retentionMode) setRetentionMode(profile.retentionMode);
          }
        })
        .catch(() => {});

      getLatestStudyPlanFromFirestore()
        .then((plan) => {
          if (plan && plan.units && plan.units.length > 0) {
            setModules(plan.units);
            setParsedData({
              courseName: plan.courseName,
              units: plan.units,
              milestones: plan.milestones,
              pacing: plan.pacing,
              confidence: plan.confidence,
            });
            if (plan.scheduleSlots) {
              setSlots(plan.scheduleSlots);
            }
          }
        })
        .catch(() => {});
    } else {
      // Clear data on sign out
      setModules([]);
      setResources([]);
      setParsedData(null);
      setSlots({});
      setTargetDate('');
      setTargetScore(0);
      setSyllabusText('');
      setSelectedFile(null);
    }
  }, [user]);

  // Save profile state to Firestore when user or goals change (only if values are valid)
  useEffect(() => {
    if (user && targetDate) {
      saveUserProfile({
        targetDate,
        targetScore,
        retentionMode,
      }).catch(() => {});
    }
  }, [user, targetDate, targetScore, retentionMode]);

  // Navigate helper
  const navigateTo = (screen: ScreenId) => {
    setCurrentScreen(screen);
    window.location.hash = screen;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync back button / hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ScreenId;
      const validScreens: ScreenId[] = [
        'overview',
        'landing',
        'master-schedule',
        'step1-upload',
        'step2-exam',
        'step3-bandwidth',
        'step4-resources',
        'dashboard',
        'voice-quiz',
        'voice-coach',
        'ai-tutor',
      ];
      if (validScreens.includes(hash)) {
        setCurrentScreen(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSyllabusParsed = (data: any) => {
    setParsedData(data);
    if (data.units && data.units.length > 0) {
      // Initialize modules cleanly with 0 progress and pending status
      const converted: SyllabusModule[] = data.units.map((u: any, idx: number) => ({
        id: u.id || `unit-${idx}`,
        name: u.name,
        submodulesCount: u.submodulesCount || 4,
        weight: u.weight || 10,
        topics: u.topics || [],
        completedUnits: 0,
        totalUnits: u.submodulesCount || 4,
        reference: u.reference || '',
        status: 'pending',
        progress: 0,
        priority: u.priority || 'medium',
        category: u.category || 'General',
      }));
      setModules(converted);

      // Save to Firebase Firestore if logged in
      if (user) {
        saveStudyPlanToFirestore({
          courseName: data.courseName || 'Imported Course Syllabus',
          units: converted,
          milestones: data.milestones,
          pacing: data.pacing,
          confidence: data.confidence,
        }).catch((e) => console.warn('Firestore autosave note:', e));
      }
    }
  };

  const handleImportSyllabusFromDrive = async (fileName: string, text: string) => {
    setSelectedFile(fileName);
    setSyllabusText(text);
    navigateTo('step1-upload');

    try {
      const res = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: apiKeyService.getAiHeaders(),
        body: JSON.stringify({ text, fileName }),
      });
      if (res.ok) {
        const data = await res.json();
        handleSyllabusParsed(data.data || data);
      }
    } catch (e) {
      console.warn('Auto parsing error on Drive import:', e);
    }
  };

  const handleImportSyllabusFromSlides = async (presentationTitle: string, text: string) => {
    setSelectedFile(`Slides: ${presentationTitle}`);
    setSyllabusText(text);
    navigateTo('step1-upload');

    try {
      const res = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: apiKeyService.getAiHeaders(),
        body: JSON.stringify({ text, fileName: presentationTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        handleSyllabusParsed(data.data || data);
      }
    } catch (e) {
      console.warn('Auto parsing error on Slides import:', e);
    }
  };

  const handleImportSyllabusFromEmail = async (subject: string, text: string) => {
    setSelectedFile(`Gmail: ${subject}`);
    setSyllabusText(text);
    navigateTo('step1-upload');

    try {
      const res = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: apiKeyService.getAiHeaders(),
        body: JSON.stringify({ text, fileName: subject }),
      });
      if (res.ok) {
        const data = await res.json();
        handleSyllabusParsed(data.data || data);
      }
    } catch (e) {
      console.warn('Auto parsing error on Gmail import:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans">
      {/* Dev & Navigation Quick Switcher Banner */}
      <NavigationHeader
        currentScreen={currentScreen}
        onNavigate={navigateTo}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />

      {/* Screen Render */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentScreen === 'landing' && <LandingPage onNavigate={navigateTo} />}

        {currentScreen === 'master-schedule' && (
          <MasterSchedule
            onNavigate={navigateTo}
            modules={modules}
            slots={slots}
            targetDate={targetDate}
            targetScore={targetScore}
            retentionMode={retentionMode}
            courseName={parsedData?.courseName || ''}
          />
        )}

        {currentScreen === 'step1-upload' && (
          <Step1Upload
            onNavigate={navigateTo}
            syllabusText={syllabusText}
            setSyllabusText={setSyllabusText}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            onSyllabusParsed={handleSyllabusParsed}
          />
        )}

        {currentScreen === 'step2-exam' && (
          <Step2Exam
            onNavigate={navigateTo}
            parsedData={parsedData}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            targetScore={targetScore}
            setTargetScore={setTargetScore}
            retentionMode={retentionMode}
            setRetentionMode={setRetentionMode}
          />
        )}

        {currentScreen === 'step3-bandwidth' && (
          <Step3Bandwidth onNavigate={navigateTo} slots={slots} setSlots={setSlots} />
        )}

        {currentScreen === 'step4-resources' && (
          <Step4Resources
            onNavigate={navigateTo}
            resources={resources}
            setResources={setResources}
            modules={modules}
            courseName={parsedData?.courseName || ''}
          />
        )}

        {/* Unified Dashboard */}
        {(currentScreen === 'dashboard' || currentScreen === 'overview') && (
          <ModernStudyDashboard
            currentScreen={currentScreen}
            onNavigate={navigateTo}
            modules={modules}
            resources={resources}
            syllabusText={syllabusText}
            onOpenUploadModal={() => navigateTo('step1-upload')}
            onOpenResourceModal={() => navigateTo('step4-resources')}
            onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
          />
        )}

        {currentScreen === 'ai-tutor' && (
          <div className="flex-1 p-6 bg-[#070b19]">
            <GenerativeAITutor
              courseContext={parsedData?.courseName || 'Study Subject'}
              onNavigateToKnowledgeBase={() => navigateTo('step4-resources')}
            />
          </div>
        )}

        {(currentScreen === 'voice-quiz' || currentScreen === 'voice-coach') && (
          <VoiceStudyCoach
            onNavigate={navigateTo}
            modules={modules}
            courseName={parsedData?.courseName || 'Study Subject'}
            resources={resources}
            syllabusText={syllabusText}
            onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
          />
        )}
      </div>

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {/* Google Drive Workspace Modal */}
      <GoogleDriveModal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        onImportSyllabusContent={handleImportSyllabusFromDrive}
        currentModules={modules}
        targetDate={targetDate}
        targetScore={targetScore}
      />

      {/* Google Slides Integration Modal */}
      <GoogleSlidesModal
        isOpen={slidesModalOpen}
        onClose={() => setSlidesModalOpen(false)}
        onImportSyllabusContent={handleImportSyllabusFromSlides}
        currentModules={modules}
        targetDate={targetDate}
        targetScore={targetScore}
      />

      {/* Google Forms Quiz Integration Modal */}
      <GoogleFormsModal
        isOpen={formsModalOpen}
        onClose={() => setFormsModalOpen(false)}
        currentModules={modules}
      />

      {/* Gmail Study Digest & Sync Modal */}
      <GmailSyncModal
        isOpen={gmailModalOpen}
        onClose={() => setGmailModalOpen(false)}
        onImportFromEmail={handleImportSyllabusFromEmail}
        currentModules={modules}
        targetDate={targetDate}
        targetScore={targetScore}
      />
    </div>
  );
}

export default function App() {
  return (
    <GoogleAuthProviderComponent>
      <AppContent />
    </GoogleAuthProviderComponent>
  );
}
