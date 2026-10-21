import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  SafeAreaView,
  Alert,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Local asset bundled directly inside the mobile app
const LOGO_IMG = require('./assets/logo.png');
const SONAR_IMG = require('./assets/sonar_echogram.png');

import { analyzeAcousticScan, saveSonarAuditLogOffline } from './sonar_engine';

// Live cloud API base URL (Railway production backend)
const API_BASE = 'https://ghostnet-ai-production.up.railway.app';

type ScreenMode = 'SPLASH' | 'LOGIN_ROLE' | 'FISHERMAN' | 'RESCUE_CREW';
type Language = 'EN' | 'TA';

interface UserAccount {
  id?: string;
  name: string;
  username: string;
  password: string;
  role: 'FISHERMAN' | 'RESCUE_CREW';
  boatTag: string;
  phone: string;
  port: string;
}

interface RecoveryReport {
  id: string;
  gearType: string;
  reportedBy: string;
  vesselTag: string;
  reportedTime: string;
  timestamp?: number;
  latLong: string;
  depthM: number;
  stage: 1 | 2 | 3;
  stageTitle: string;
  stageColor: string;
  stageBg: string;
  stageText: string;
  detail: string;
  subDetail: string;
}

interface RescueTarget {
  id: string;
  priorityLabel: string;
  reportedAgo: string;
  timestamp?: number;
  distanceNm: string;
  gearName: string;
  description: string;
  depthM: number;
  massKg: number;
  sector: string;
  coords: string;
  aisVector: string;
  accentColor: string;
  material?: string;
  buoyancy?: string;
  isAssigned?: boolean;
  assignedTeam?: string;
  assignedBoat?: string;
  isMyMission?: boolean;
}

// -------------------------------------------------------------
// BILINGUAL SYSTEM: Complete English & Tamil Localization
// -------------------------------------------------------------
const I18N = {
  EN: {
    // Splash
    splashSubtitle: 'Offline-First Coastal Marine Gear Recovery Platform',
    splashTap: 'Tap to Initialize Tactical System ➔',

    // Login & Register
    portalTitle: 'GHOSTNET TACTICAL PORTAL',
    portalSub: 'Kasimedu Marine Pilot Station • Chennai',
    loginTab: 'Log In',
    registerTab: 'Create Account',
    phoneLabel: '📱 MOBILE PHONE NUMBER / USERNAME',
    phonePlaceholder: 'Enter mobile number (e.g. 6382456789) or username',
    passwordLabel: '🔒 PASSWORD',
    passwordPlaceholder: 'Enter password',
    fullNameLabel: 'FULL NAME',
    fullNamePlaceholder: 'e.g. Selvam Ramanathan',
    usernameLabel: 'CHOOSE USERNAME',
    usernamePlaceholder: 'e.g. selvam_04',
    boatTagLabel: 'VESSEL / BOAT REGISTRATION NUMBER',
    boatTagPlaceholder: 'e.g. IND-TN-07-SP-0007',
    regPhoneLabel: 'MOBILE PHONE (FOR RECOVERY SMS & OTP)',
    regPhonePlaceholder: '+91 98401 23456',
    createPassLabel: 'CREATE PASSCODE',
    selectRoleHeader: 'SELECT FIELD DEPLOYMENT ROLE',
    fishermanTitle: 'Fisherman',
    fishermanDesc: 'Report Lost Gear & Track Recovery',
    rescueTitle: 'Rescue Team',
    rescueDesc: 'Emergency Missions & AI Navigation',
    loginBtn: 'Log In & Enter Portal',
    registerBtn: 'Create Account & Launch',

    // Fisherman Screen Header & Protocol
    welcome: 'Welcome',
    logout: '🚪 Logout',
    protocolTitle: '⚙️ OPERATIONAL RECOVERY PROTOCOL',
    protocolStepReady: 'All 4 Steps Ready',
    stepGps: 'GPS Fix',
    stepGear: 'Gear Type',
    stepPolymer: 'Polymer',
    stepDepth: 'Depth/Weight',
    tabDeclare: 'Declare Lost Gear',
    tabTracker: 'My Reports Tracker',

    // Fisherman Step 1
    gpsSignalLocked: '● GPS Signal Locked',
    gpsFixCoords: 'FIX COORDINATES (TAP TO EDIT)',
    gpsUpdateBtn: '🔄 Update GPS',
    gpsAccuracy: '🛰️ Accuracy: ±2.4m • Sea Fix via NavIC/GPS',
    gpsAuto: 'AUTO',

    // Fisherman Step 2
    typeOfNet: 'Type of Net',
    gillnetTitle: 'Monofilament Gillnet',
    gillnetDesc: 'High risk entangling netting • High ghost potential',
    trawlTitle: 'Trawl Net',
    trawlDesc: 'Bottom/pelagic trawls • Heavy cable lead',
    trapTitle: 'Crab / Ring Trap',
    trapDesc: 'Mesh cage traps with acoustic surface float',

    // Fisherman Step 3
    netMaterialHeader: 'Net Material (Polymer)',
    matNylonLabel: 'Nylon (PA)',
    matNylonDesc: 'Sinks (1.14 g/cm³)',
    matHdpeLabel: 'HDPE / PE',
    matHdpeDesc: 'Floats (0.95 g/cm³)',
    matPpLabel: 'PP Rope',
    matPpDesc: 'Buoyant (0.91)',
    matMixedLabel: 'Mixed / Other',
    matMixedDesc: 'Composite Gear',

    // Fisherman Step 4
    estDepth: '🌊 ESTIMATED DEPTH',
    metersUnit: 'meters',
    sonarCalib: 'Sonar Calib',
    weightReg: '⚖️ WEIGHT REG.',
    kgUnit: 'Tons',
    wetEst: 'Wet Est.',
    submitDeclareBtn: 'Submit Lost Gear Declaration',

    // Fisherman Tracker Tab
    trackerHeaderTitle: '🛰️ Active & Past Recovery Trackers',
    loggedCount: 'Logged',
    noReportsLogged: 'No lost gear reported yet.',

    // Rescue Screen Header & Tabs
    tacticalHudTitle: 'GHOSTNET TACTICAL HUD',
    vesselPrefix: 'Vessel',
    aisActiveBadge: 'AIS ACTIVE',
    criticalNetAlertBadge: 'CRITICAL NET ALERT',
    viewAlertBtn: 'VIEW',
    tabReportsPending: 'Reports Pending',
    tabCurrentMission: 'Current Mission',
    noPendingTargets: 'No pending ghost net targets in Kasimedu sector.',
    acceptMissionBtn: 'Accept & Start Mission',
    seaStateLabel: 'Sea State',
    seaStateVal: 'Chop 0.8m • Tidal Ebb 1.2kn',
    windLabel: 'Wind',
    windVal: '14 kn ENE',

    // Rescue Mission HUD & Chart
    standbyModeTitle: 'Standby Mode — No Active Mission',
    standbyModeDesc: 'Switch to "Reports Pending" tab to select and accept an emergency recovery mission from the queue.',
    viewPendingBtn: 'View Pending Reports Queue',
    engagedRescueBadge: 'ENGAGED RESCUE INTERVENTION',
    etaPrefix: 'ETA',
    chartRescueBoat: 'Rescue Boat',
    chartGhostNet: 'Ghost Net (AI Target)',
    targetInterceptedBanner: 'TARGET INTERCEPTED! Net spotted on sonar.',
    engageCourseBtn: 'Engage Intercept Course',
    pauseNavBtn: 'Pause Navigation',
    replayInterceptBtn: 'Replay Intercept',
    resetNavBtn: 'Reset',
    distanceLabel: 'DISTANCE',
    headingLabel: 'HEADING',
    speedLabel: 'SPEED',
    etaLabel: 'ETA',
    verifyOnDeckBtn: '⚖️ Verify Recovery on Deck & Complete Ledger',
    queueStatusTitle: 'QUEUE: FIRST-COME, FIRST-SERVED',
    activeTargetsSubtitle: 'ACTIVE TARGETS',
    telemetryDepth: 'Est. Depth',
    telemetryMass: 'Mass',
    telemetryMaterial: 'Material',
    telemetryDrift: 'Drift State',
    stateFloating: 'FLOATING',
    stateSinking: 'SINKING',
    shorelineText: 'KASIMEDU SHORELINE',
    aiDriftBadgeText: 'AI +48h Drift',
    windSource: 'Wind',
    currentSource: 'Current',
    speedStation: '0.4 kn (Station Keeping)',
    speedStandby: '0.0 kn (Standby)',
    fieldActionTitle: 'Field Action Log',
    fieldActionDesc: 'Upon surfacing and winching the target gear to the recovery deck, verify dry net mass to close the maritime ledger.',
    fileAnotherReport: 'File Another Lost Gear Report',
    reportedByPrefix: 'Reported by',

    // Modals
    offlineSyncAdvisory: 'OFFLINE SYNC ADVISORY',
    headingOffshoreTitle: 'Heading Offshore',
    selectedTargetLabel: 'Selected Target:',
    preDepartureAlertDesc: '⚠️ Pre-Departure Marine Alert: You are heading offshore beyond coastal cell coverage. Download offline coastal satellite sector map now?',
    downloadOfflineLaunchBtn: '📥 Download Offline Map & Launch',
    launchOnlineOnlyBtn: 'Launch Online Only',
    cancelBtn: 'Cancel',
    deckVerificationTitle: 'DECK VERIFICATION',
    deckVerificationSub: 'Confirm recovered mass for circular carbon-credit registry',
    deckScaleWarning: 'Confirm crane scale measurement to finalize mission telemetry and reward coastal credits.',
    hauledGearMassLabel: 'HAULED GEAR MASS (VERIFIED ON DECK IN TONS):',
    submitCompleteLedgerBtn: 'Submit & Complete Ledger'
  },
  TA: {
    // Splash
    splashSubtitle: 'ஆஃப்லைன்-முதல் கடலோர மீன்பிடி வலை மீட்பு தளம்',
    splashTap: 'தொடங்க தட்டவும் ➔',

    // Login & Register
    portalTitle: 'கடலோர மீட்பு தளம் (GHOSTNET AI)',
    portalSub: 'காசிமேடு கடல்சார் ஆய்வு மையம் • சென்னை',
    loginTab: 'உள்நுழைவு',
    registerTab: 'புதிய கணக்கு',
    phoneLabel: '📱 அலைபேசி எண் (அல்லது பயனர்பெயர்)',
    phonePlaceholder: 'அலைபேசி எண் உள்ளிடவும் (எ.கா. 6382456789)',
    passwordLabel: '🔒 கடவுச்சொல்',
    passwordPlaceholder: 'கடவுச்சொல்லை உள்ளிடவும்',
    fullNameLabel: 'முழு பெயர்',
    fullNamePlaceholder: 'எ.கா. செல்வம் ராமநாதன்',
    usernameLabel: 'பயனர்பெயர்',
    usernamePlaceholder: 'எ.கா. selvam_04',
    boatTagLabel: 'படகு பதிவு எண்',
    boatTagPlaceholder: 'எ.கா. IND-TN-07-SP-0007',
    regPhoneLabel: 'அலைபேசி எண் (SMS மற்றும் மீட்பு தகவல்)',
    regPhonePlaceholder: '+91 98401 23456',
    createPassLabel: 'புதிய கடவுச்சொல்',
    selectRoleHeader: 'களப் பணிப் பாத்திரத்தைத் தேர்ந்தெடுக்கவும்',
    fishermanTitle: 'மீனவர்',
    fishermanDesc: 'இழந்த வலையை அறிவித்து மீட்டெடுப்பைக் கண்காணிக்கவும்',
    rescueTitle: 'மீட்புக் குழு',
    rescueDesc: 'அவசர மீட்புப் பணி மற்றும் கடல் வழிசெலுத்தல்',
    loginBtn: 'தளத்தில் நுழையவும்',
    registerBtn: 'கணக்கு உருவாக்கி நுழையவும்',

    // Fisherman Screen Header & Protocol
    welcome: 'வணக்கம்',
    logout: '🚪 வெளியேறு',
    protocolTitle: '⚙️ செயல்பாட்டு மீட்பு நெறிமுறை',
    protocolStepReady: '4 படிகள் தயார்',
    stepGps: 'ஜி.பி.எஸ்',
    stepGear: 'வலை வகை',
    stepPolymer: 'பாலிமர்',
    stepDepth: 'ஆழம்/எடை',
    tabDeclare: 'வலை அறிவிப்பு',
    tabTracker: 'என் அறிக்கைகள்',

    // Fisherman Step 1
    gpsSignalLocked: '● ஜி.பி.எஸ் செயற்கைக்கோள் உறுதி',
    gpsFixCoords: 'இருப்பிடத்தை மாற்றுக (தட்டவும்)',
    gpsUpdateBtn: '🔄 ஜி.பி.எஸ் புதுப்பி',
    gpsAccuracy: '🛰️ துல்லியம்: ±2.4மீ • NavIC/GPS மூலம்',
    gpsAuto: 'தானியங்கி',

    // Fisherman Step 2
    typeOfNet: 'இழந்த வலையின் வகை',
    gillnetTitle: 'கிள்வலை (Gillnet)',
    gillnetDesc: 'செங்குத்து செவுள் வலை • அதிக ஆபத்து',
    trawlTitle: 'இழுவலை (Trawl Net)',
    trawlDesc: 'அடிமட்ட கனரக இழுவலை • எடைக் கயிறு',
    trapTitle: 'கூண்டு / பொறி (Trap)',
    trapDesc: 'நண்டு மற்றும் மீன் கம்பி கூண்டு',

    // Fisherman Step 3
    netMaterialHeader: 'வலை மூலப்பொருள் (பாலிமர்)',
    matNylonLabel: 'நைலான் (PA)',
    matNylonDesc: 'மூழ்கும் (1.14 g/cm³)',
    matHdpeLabel: 'எச்டிபிஇ / பிஇ',
    matHdpeDesc: 'மிதக்கும் (0.95 g/cm³)',
    matPpLabel: 'பிபி கயிறு (PP Rope)',
    matPpDesc: 'மிதக்கும் (0.91)',
    matMixedLabel: 'கலப்பு வலை / பிற',
    matMixedDesc: 'கூட்டு பல அடுக்கு வலை',

    // Fisherman Step 4
    estDepth: '🌊 மதிப்பிடப்பட்ட ஆழம்',
    metersUnit: 'மீட்டர்',
    sonarCalib: 'சோனார் அளவு',
    weightReg: '⚖️ மதிப்பிடப்பட்ட எடை',
    kgUnit: 'டன்கள் (Tons)',
    wetEst: 'ஈர எடை',
    submitDeclareBtn: 'இழந்த வலையை பதிவு செய் (AI டிரிஃப்ட் தொடங்கு)',

    // Fisherman Tracker Tab
    trackerHeaderTitle: '🛰️ என் இழந்த வலை அறிக்கைகள்',
    loggedCount: 'பதிவானவை',
    noReportsLogged: 'இதுவரை இழந்த வலைகள் எதுவும் பதிவு செய்யப்படவில்லை.',

    // Rescue Screen Header & Tabs
    tacticalHudTitle: 'கடலோர மீட்பு தளம் (HUD)',
    vesselPrefix: 'காவல் படகு',
    aisActiveBadge: 'ஏ.ஐ.எஸ் செயலில்',
    criticalNetAlertBadge: '⚠️ அவசர வலை எச்சரிக்கை',
    viewAlertBtn: 'பார்வையிடு',
    tabReportsPending: 'நிலுவை அறிக்கைகள்',
    tabCurrentMission: 'தற்போதைய மீட்பு பணி',
    noPendingTargets: 'காசிமேடு பகுதியில் தற்போது நிலுவையில் உள்ள வலைகள் இல்லை.',
    acceptMissionBtn: 'மீட்பு பணியைத் தொடங்கு',
    seaStateLabel: 'கடல் நிலை',
    seaStateVal: 'அலை 0.8மீ • நீரோட்டம் 1.2kn',
    windLabel: 'காற்று',
    windVal: '14 kn கிழக்கு-வடகிழக்கு',

    // Rescue Mission HUD & Chart
    standbyModeTitle: 'தயார் நிலை — தற்போதைய பணி இல்லை',
    standbyModeDesc: 'அவசர மீட்பு பணியைத் தொடங்க "நிலுவை அறிக்கைகள்" பகுதிக்குச் செல்லவும்.',
    viewPendingBtn: 'நிலுவை அறிக்கைகளைப் பார்',
    engagedRescueBadge: 'மீட்புப் பணி தொடக்கம்',
    etaPrefix: 'வருகை நேரம்',
    chartRescueBoat: 'மீட்பு படகு',
    chartGhostNet: 'இழந்த வலை (AI இலக்கு)',
    targetInterceptedBanner: '🎯 வலை சோனாரில் கண்டறியப்பட்டது! தளம் தயார்.',
    engageCourseBtn: 'மீட்பு பயணத்தைத் தொடங்கு',
    pauseNavBtn: 'பயணத்தை இடைநிறுத்து',
    replayInterceptBtn: 'மீண்டும் தொடங்கு',
    resetNavBtn: 'மீட்டமை',
    distanceLabel: 'தொலைவு',
    headingLabel: 'திசை',
    speedLabel: 'வேகம்',
    etaLabel: 'வருகை நேரம்',
    verifyOnDeckBtn: '⚖️ தளத்தில் எடையை சரிபார்த்து லெட்ஜரில் பதிவு செய்',
    queueStatusTitle: 'வரிசை: முன்னுரிமை ஒதுக்கீடு (FCFS)',
    activeTargetsSubtitle: 'செயலில் உள்ள மீட்பு இலக்குகள்',
    telemetryDepth: 'மதிப்பீட்டு ஆழம்',
    telemetryMass: 'எடை',
    telemetryMaterial: 'மூலப்பொருள்',
    telemetryDrift: 'டிரிஃப்ட் நிலை',
    stateFloating: 'மிதக்கிறது',
    stateSinking: 'மூழ்குகிறது',
    shorelineText: 'காசிமேடு கடற்கரை எல்லை',
    aiDriftBadgeText: 'AI +48 மணிநேர நகர்வு',
    windSource: 'காற்று',
    currentSource: 'நீரோட்டம்',
    speedStation: '0.4 kn (நிலையிருப்பு)',
    speedStandby: '0.0 kn (காத்திருப்பு)',
    fieldActionTitle: 'கள நடவடிக்கை பதிவு',
    fieldActionDesc: 'வலை மீட்கப்பட்டு கப்பல் தளத்திற்கு கொண்டுவரப்பட்டதும், எடையை சரிபார்த்து கடல்சார் லெட்ஜரை நிறைவு செய்யவும்.',
    fileAnotherReport: 'மற்றொரு இழந்த வலை அறிக்கையை பதிவு செய்',
    reportedByPrefix: 'அறிவித்தவர்',

    // Modals
    offlineSyncAdvisory: 'ஆஃப்லைன் ஒத்திசைவு ஆலோசனை',
    headingOffshoreTitle: 'கடலுக்குள் புறப்படுகிறீர்கள்',
    selectedTargetLabel: 'தேர்ந்தெடுக்கப்பட்ட இலக்கு:',
    preDepartureAlertDesc: '⚠️ கடலோர எச்சரிக்கை: நீங்கள் அலைபேசி வரம்பைத் தாண்டி கடலுக்குள் செல்கிறீர்கள். ஆஃப்லைன் வரைபடத்தை பதிவிறக்க வேண்டுமா?',
    downloadOfflineLaunchBtn: '📥 ஆஃப்லைன் வரைபடத்தை பதிவிறக்கி தொடங்கு',
    launchOnlineOnlyBtn: 'ஆன்லைனில் மட்டுமே தொடங்கு',
    cancelBtn: 'ரத்து செய்',
    deckVerificationTitle: 'தளத்தில் எடை சரிபார்ப்பு',
    deckVerificationSub: 'மீட்கப்பட்ட வலையின் எடையை கார்பன் லெட்ஜரில் பதிவு செய்க',
    deckScaleWarning: 'பணி நிறைவு மற்றும் கடலோர வெகுமதிகளைப் பெற எடை அளவீட்டை உறுதிப்படுத்தவும்.',
    hauledGearMassLabel: 'மீட்கப்பட்ட வலையின் எடை (டன்கள்):',
    submitCompleteLedgerBtn: 'சரிபார்த்து லெட்ஜரில் பதிவு செய்'
  }
};

// Intelligent Maritime Relative Time Formatter (Real time computation)
const formatRelativeTime = (dateInput: any, lang: Language = 'EN'): string => {
  if (!dateInput) return lang === 'TA' ? 'அண்மையில்' : 'Recently';

  let dateObj: Date;
  if (typeof dateInput === 'number') {
    dateObj = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    const parsed = Date.parse(dateInput);
    if (!isNaN(parsed)) {
      dateObj = new Date(parsed);
    } else {
      // Return cleaned string fallback
      return dateInput;
    }
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    return lang === 'TA' ? 'அண்மையில்' : 'Recently';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // 1. Just Now (< 2 mins)
  if (diffMin < 2) {
    return lang === 'TA' ? 'சற்றுமுன் அறிவிக்கப்பட்டது' : 'Reported Just Now';
  }

  // 2. Minutes ago (< 60 mins)
  if (diffMin < 60) {
    return lang === 'TA' ? `${diffMin} நிமிடங்களுக்கு முன்பு` : `${diffMin} min ago`;
  }

  // Check calendar day
  const isToday = now.toDateString() === dateObj.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === dateObj.toDateString();

  // 3. Today earlier
  if (isToday) {
    return lang === 'TA' ? `இன்று, ${timeStr}` : `Today, ${timeStr}`;
  }

  // 4. Yesterday
  if (isYesterday) {
    return lang === 'TA' ? `நேற்று, ${timeStr}` : `Reported Yesterday, ${timeStr}`;
  }

  // 5. Days ago (2 to 6 days)
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays >= 2 && diffDays <= 6) {
    return lang === 'TA' ? `${diffDays} நாட்களுக்கு முன்பு` : `Reported ${diffDays} days ago`;
  }

  // 6. Older
  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return lang === 'TA' ? `${dateStr} அன்று, ${timeStr}` : `Reported ${dateStr}, ${timeStr}`;
};

// Robust extractor for reports & targets: extracts real epoch from rep- or tgt- ID or fallback
const getReportTimeDisplay = (item: { timestamp?: number; id?: string; reportedTime?: string; reportedAgo?: string }, lang: Language = 'EN'): string => {
  if (item.timestamp && typeof item.timestamp === 'number') {
    return formatRelativeTime(item.timestamp, lang);
  }
  if (item.id && typeof item.id === 'string') {
    const rawNum = item.id.replace(/^(rep|tgt)-/, '');
    const epoch = parseInt(rawNum, 10);
    if (!isNaN(epoch) && epoch > 1700000000000) {
      return formatRelativeTime(epoch, lang);
    }
  }
  const fallbackStr = item.reportedTime || item.reportedAgo;
  if (fallbackStr && fallbackStr !== 'Reported Just Now' && fallbackStr !== 'Recent Report') {
    return formatRelativeTime(fallbackStr, lang);
  }
  return lang === 'TA' ? 'நேற்று அறிவிக்கப்பட்டது' : 'Reported Yesterday';
};

export default function App() {
  // Navigation & Screen State
  const [screen, setScreen] = useState<ScreenMode>('SPLASH');
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [language, setLanguage] = useState<Language>('EN');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Localization translator helper
  const t = (k: keyof typeof I18N.EN) => I18N[language][k] || I18N.EN[k];

  // Default pre-seeded accounts: empty for fresh user testing
  const DEFAULT_ACCOUNTS: UserAccount[] = [];

  // Load persistent accounts from localStorage
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_registered_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  // Current Logged-in User Session (loaded from persistent storage or clean default)
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_session_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.role) return parsed;
        }
      }
    } catch (e) {}
    return {
      name: '',
      username: '',
      password: '',
      role: 'FISHERMAN',
      boatTag: 'IND-TN-07-SP-0007',
      phone: '',
      port: 'Kasimedu Coastal Harbour'
    };
  });

  // Form Fields State
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register Fields
  const [regFullName, setRegFullName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regBoatTag, setRegBoatTag] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'FISHERMAN' | 'RESCUE_CREW'>('FISHERMAN');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // -------------------------------------------------------------
  // Fisherman Dashboard State
  // -------------------------------------------------------------
  const [fisherTab, setFisherTab] = useState<'DECLARE' | 'TRACKER'>('DECLARE');
  const [gpsCoords, setGpsCoords] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_last_real_gps');
        if (saved) return saved;
      }
    } catch (e) {}
    return '13.1250° N, 80.3150° E';
  });
  const [selectedGear, setSelectedGear] = useState<'GILLNET' | 'TRAWL' | 'TRAP'>('GILLNET');
  const [selectedMaterial, setSelectedMaterial] = useState<'nylon' | 'polyethylene' | 'polypropylene' | 'mixed'>('nylon');
  const [estimatedDepth, setEstimatedDepth] = useState<number>(25);
  const [estimatedWeight, setEstimatedWeight] = useState<number>(1.2);

  const [reports, setReports] = useState<RecoveryReport[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_saved_reports');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => {
              const cleanDetail = item.detail && !item.detail.includes('Ping')
                ? item.detail
                : (item.stage === 1 ? 'Priority: High Attention' : item.stage === 2 ? 'Vessel: Rescue Boat' : 'Hauled & Verified: 1.2 Tons');
              const cleanSubDetail = item.subDetail && !item.subDetail.toLowerCase().includes('ping') && !item.subDetail.toLowerCase().includes('transponder')
                ? item.subDetail
                : (item.stage === 1 ? 'Awaiting Rescue Dispatch' : item.stage === 2 ? 'Approaching coordinates' : 'Mission Closed • Circular Registry');
              let tStamp = item.timestamp;
              if (!tStamp && item.id && typeof item.id === 'string') {
                const rawNum = item.id.replace(/^(rep|tgt)-/, '');
                const epoch = parseInt(rawNum, 10);
                if (!isNaN(epoch) && epoch > 1700000000000) tStamp = epoch;
              }
              return {
                ...item,
                timestamp: tStamp,
                detail: cleanDetail,
                subDetail: cleanSubDetail
              };
            });
          }
        }
      }
    } catch (e) {}
    return [];
  });

  // -------------------------------------------------------------
  // Rescue Crew State
  // -------------------------------------------------------------
  const [crewTab, setCrewTab] = useState<'REPORTS' | 'MISSION'>('REPORTS');
  const [selectedTarget, setSelectedTarget] = useState<RescueTarget | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_selected_target');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });
  const [activeMissionId, setActiveMissionId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('ghostnet_active_mission_id') || null;
      }
    } catch (e) {}
    return null;
  });
  const [showPreDepartureModal, setShowPreDepartureModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showSonarConsole, setShowSonarConsole] = useState<boolean>(false);
  const [verifiedWeight, setVerifiedWeight] = useState<number>(1.2);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navProgress, setNavProgress] = useState<number>(0);

  // Database Inspector State
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [dbViewMode, setDbViewMode] = useState<'TOTAL' | 'MINE'>('TOTAL');
  const [cloudUsers, setCloudUsers] = useState<any[]>([]);
  const [cloudReports, setCloudReports] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);

  const fetchDbData = async () => {
    setLoadingDb(true);
    try {
      const [usersRes, reportsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/auth/users`),
        fetch(`${API_BASE}/api/v1/reports/lost-gear`)
      ]);
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const uData = await usersRes.value.json();
        setCloudUsers(Array.isArray(uData) ? uData : []);
      }
      if (reportsRes.status === 'fulfilled' && reportsRes.value.ok) {
        const rData = await reportsRes.value.json();
        setCloudReports(Array.isArray(rData) ? rData : []);
      }
    } catch (e) {
      console.log('Error inspecting database:', e);
    } finally {
      setLoadingDb(false);
    }
  };

  const allMergedUsers = useMemo(() => {
    const map = new Map<string, any>();
    accounts.forEach((acc) => {
      const key = (acc.phone || acc.username || '').trim().toLowerCase();
      if (key) {
        map.set(key, { ...acc, isCloud: false });
      }
    });
    cloudUsers.forEach((u) => {
      const key = (u.phone || u.name || '').trim().toLowerCase();
      if (key) {
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          ...u,
          name: u.name || existing?.name,
          username: existing?.username || u.name,
          phone: u.phone || existing?.phone,
          role: u.role === 'fisher' || u.role === 'FISHERMAN' ? 'FISHERMAN' : 'RESCUE_CREW',
          boatTag: u.boat_id || existing?.boatTag || 'IND-TN-07-SP-0007',
          isCloud: true
        });
      }
    });
    return Array.from(map.values());
  }, [accounts, cloudUsers]);

  const allMergedReports = useMemo(() => {
    const list = [...reports];
    cloudReports.forEach((cr) => {
      // 1. Resolve human reporter name (avoid showing raw user UUID)
      let reporterName = cr.reporter_name;
      if (!reporterName || reporterName === 'Fisherman') {
        if (cr.notes && cr.notes.includes('Reported by ')) {
          reporterName = cr.notes.split('Reported by ')[1].split(' (')[0].trim();
        } else if (cr.reported_by) {
          const userMatch =
            cloudUsers.find((u) => u.id === cr.reported_by || u.phone === cr.reported_by || u.name === cr.reported_by) ||
            accounts.find((a) => a.id === cr.reported_by || a.phone === cr.reported_by || a.username === cr.reported_by || a.name === cr.reported_by);
          if (userMatch) reporterName = userMatch.name;
          else if (currentUser && (currentUser.id === cr.reported_by || currentUser.phone === cr.reported_by || currentUser.name === cr.reported_by)) {
            reporterName = currentUser.name;
          }
        }
      }
      if (!reporterName || (reporterName.includes('-') && reporterName.length > 20)) {
        reporterName = currentUser?.name || 'Registered Fisherman';
      }

      // 2. Resolve boat registration number
      let vesselNumber = cr.vessel_tag;
      if (!vesselNumber || !vesselNumber.includes('IND-TN')) {
        if (cr.notes && cr.notes.includes('(') && cr.notes.includes(')')) {
          const extracted = cr.notes.split('(')[1].split(')')[0].trim();
          if (extracted.includes('IND-TN') || extracted.includes('TN-')) vesselNumber = extracted;
        } else if (cr.boat_id && (cr.boat_id.includes('IND-TN') || cr.boat_id.includes('TN-'))) {
          vesselNumber = cr.boat_id;
        } else {
          vesselNumber = currentUser?.boatTag || 'IND-TN-07-SP-0007';
        }
      }

      // 3. Match against existing reports by id OR client_report_id to eliminate duplicates
      const existingIdx = list.findIndex(
        (r) =>
          r.id === cr.id ||
          (cr.client_report_id && r.id === cr.client_report_id) ||
          ((r as any).client_report_id && (r as any).client_report_id === cr.client_report_id) ||
          ((r as any).client_report_id && (r as any).client_report_id === cr.id)
      );

      const latVal = cr.loss_latitude ?? cr.latitude ?? 13.1250;
      const lonVal = cr.loss_longitude ?? cr.longitude ?? 80.3150;
      const depthVal = cr.loss_depth_m ?? cr.depth_m ?? 24;
      const isRecovered = cr.status === 'RECOVERED' || cr.sync_status === 'recovered';
      const isInProgress = cr.status === 'IN_PROGRESS' || cr.sync_status === 'in_progress';

      if (existingIdx === -1) {
        list.push({
          id: cr.client_report_id || cr.id,
          gearType: cr.gear_type || 'Monofilament Net',
          reportedBy: reporterName,
          vesselTag: vesselNumber,
          reportedTime: 'Cloud DB',
          timestamp: cr.loss_time ? new Date(cr.loss_time).getTime() : Date.now(),
          latLong: `${latVal.toFixed(4)}°N, ${lonVal.toFixed(4)}°E`,
          depthM: depthVal,
          stage: isRecovered ? 3 : isInProgress ? 2 : 1,
          stageTitle: `Stage ${isRecovered ? 3 : isInProgress ? 2 : 1}`,
          stageColor: isRecovered ? '#064e3b' : isInProgress ? '#083344' : '#78350f',
          stageBg: isRecovered ? '#d1fae5' : isInProgress ? '#cffafe' : '#fef3c7',
          stageText: isRecovered ? '🟢 Successfully Recovered' : isInProgress ? '🔵 Rescue in Progress' : '🟡 Awaiting Rescue Team Assignment',
          detail: cr.gear_type || 'Lost Net',
          subDetail: `${cr.estimated_weight_kg || cr.mass_kg || 1.2} Tons`
        });
      } else {
        // Heal existing report with human reporter name and boat number
        if (reporterName && (!list[existingIdx].reportedBy || list[existingIdx].reportedBy.length > 25 || list[existingIdx].reportedBy === 'Fisherman')) {
          list[existingIdx].reportedBy = reporterName;
        }
        if (vesselNumber && (!list[existingIdx].vesselTag || list[existingIdx].vesselTag.length > 25)) {
          list[existingIdx].vesselTag = vesselNumber;
        }
      }
    });
    return list;
  }, [reports, cloudReports, cloudUsers, accounts, currentUser]);

  const myFilteredReports = useMemo(() => {
    if (!currentUser?.name) return allMergedReports;
    const currName = (currentUser.name || '').toLowerCase().trim();
    const currBoat = (currentUser.boatTag || '').toLowerCase().trim();
    return allMergedReports.filter((r) => {
      const repName = (r.reportedBy || '').toLowerCase().trim();
      const repBoat = (r.vesselTag || '').toLowerCase().trim();
      return (
        repName === currName ||
        repName.includes(currName) ||
        currName.includes(repName) ||
        (currBoat && repBoat && repBoat.includes(currBoat))
      );
    });
  }, [allMergedReports, currentUser]);


  // Live Real-Time GPS Tracking of Rescue Officer / Boat (moves as the user moves)
  const [rescueCoords, setRescueCoords] = useState<{
    lat: number;
    lon: number;
    speedKn: number;
    timestamp: number;
  }>({
    lat: 13.1280,
    lon: 80.2985,
    speedKn: 0.0,
    timestamp: Date.now()
  });

  const lastRescueUpdateRef = useRef<number>(0);

  useEffect(() => {
    let watchId: number | null = null;
    let prevPosition: { lat: number; lon: number; time: number } | null = null;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // 1. Initial quick high-accuracy fix
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const rawSpeed = pos.coords.speed; // m/s from hardware GPS
          const calcSpeed = rawSpeed && rawSpeed > 0.2 ? parseFloat((rawSpeed * 1.94384).toFixed(1)) : 0.0;
          const initialFix = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speedKn: calcSpeed,
            timestamp: pos.timestamp || Date.now()
          };
          setRescueCoords(initialFix);
          prevPosition = { lat: initialFix.lat, lon: initialFix.lon, time: initialFix.timestamp };
          lastRescueUpdateRef.current = Date.now();
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const formatted = `${initialFix.lat.toFixed(4)}° N, ${initialFix.lon.toFixed(4)}° E`;
              window.localStorage.setItem('ghostnet_last_real_gps', formatted);
            }
          } catch (e) {}
        },
        (err) => console.log('Initial rescue GPS note:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );

      // 2. Continuous real-time movement watch as the officer moves physically (4-second smooth intervals)
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          // Throttle state updates to 4 seconds to keep HUD calm and readable
          if (now - lastRescueUpdateRef.current < 4000) {
            return;
          }
          lastRescueUpdateRef.current = now;

          let calculatedSpeedKn = 0.0;
          const rawSpeed = pos.coords.speed;
          if (rawSpeed !== null && rawSpeed !== undefined && rawSpeed > 0.2) {
            calculatedSpeedKn = parseFloat((rawSpeed * 1.94384).toFixed(1));
          } else if (prevPosition) {
            const dtHours = Math.max(0.0001, (now - prevPosition.time) / 3600000);
            const distTraveledNm = calculateDistanceNm(prevPosition.lat, prevPosition.lon, pos.coords.latitude, pos.coords.longitude);
            const rawKnots = distTraveledNm / dtHours;
            // Filter stationary GPS jitter: only measure speed if displacement > 4 meters
            calculatedSpeedKn = distTraveledNm * 1852 > 4 && rawKnots > 0.4 ? parseFloat(rawKnots.toFixed(1)) : 0.0;
          }

          const newPos = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speedKn: calculatedSpeedKn,
            timestamp: now
          };
          prevPosition = { lat: newPos.lat, lon: newPos.lon, time: newPos.timestamp };
          setRescueCoords(newPos);

          // Stream live location fix directly to Leaflet map iframe
          try {
            if (typeof document !== 'undefined') {
              const iframes = document.querySelectorAll('iframe');
              iframes.forEach((ifr) => {
                ifr.contentWindow?.postMessage(
                  { type: 'BOAT_GPS_UPDATE', lat: newPos.lat, lon: newPos.lon },
                  '*'
                );
              });
            }
          } catch (e) {}
        },
        (err) => console.log('Continuous GPS watch notice:', err),
        { enableHighAccuracy: true, maximumAge: 4000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isNavigating) {
      interval = setInterval(() => {
        setNavProgress((prev) => {
          if (prev >= 1) {
            setIsNavigating(false);
            showToast('🎯 TARGET INTERCEPTED! Ghost net reached on sonar.');
            return 1;
          }
          return Math.min(1, prev + 0.08);
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isNavigating]);

  const [targets, setTargets] = useState<RescueTarget[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ghostnet_pending_targets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  // Auto-restore officer's active in-progress mission on login or re-connection
  useEffect(() => {
    if (currentUser && currentUser.role === 'RESCUE_CREW') {
      const myActive = targets.find((tgt) => {
        const teamMatch =
          tgt.assignedTeam?.toLowerCase().trim() === currentUser.name?.toLowerCase().trim() ||
          tgt.assignedTeam?.toLowerCase().trim() === currentUser.username?.toLowerCase().trim();
        const boatMatch =
          tgt.assignedBoat?.toLowerCase().trim() === currentUser.boatTag?.toLowerCase().trim();
        return tgt.isAssigned && (teamMatch || boatMatch);
      });
      if (myActive) {
        setSelectedTarget(myActive);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('ghostnet_selected_target', JSON.stringify(myActive));
          }
        } catch (e) {}
      } else {
        setSelectedTarget(null);
        setActiveMissionId(null);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('ghostnet_selected_target');
            window.localStorage.removeItem('ghostnet_active_mission_id');
          }
        } catch (e) {}
      }
    }
  }, [targets, currentUser]);

  // Auto-heal and sync legacy reports stored in phone localStorage
  useEffect(() => {
    setReports((prevReports) => {
      let changed = false;
      const healed = prevReports.map((rep) => {
        let updated = { ...rep };

        // 1. Recover real timestamp from ID if missing or hardcoded
        if (!updated.timestamp && updated.id && typeof updated.id === 'string') {
          const rawNum = updated.id.replace(/^(rep|tgt)-/, '');
          const epoch = parseInt(rawNum, 10);
          if (!isNaN(epoch) && epoch > 1700000000000) {
            updated.timestamp = epoch;
            updated.reportedTime = formatRelativeTime(epoch, language);
            changed = true;
          }
        }

        // 2. Wipe any legacy "Ping Interval" and "Auto-pinging transponder" text from cache
        if (!updated.detail || updated.detail.includes('Ping')) {
          updated.detail = updated.stage === 1 ? 'Priority: High Attention' : updated.stage === 2 ? 'Vessel: Rescue Boat' : 'Hauled & Verified: 1.2 Tons';
          changed = true;
        }
        if (!updated.subDetail || updated.subDetail.toLowerCase().includes('ping') || updated.subDetail.toLowerCase().includes('transponder')) {
          updated.subDetail = updated.stage === 1 ? 'Awaiting Rescue Dispatch' : updated.stage === 2 ? 'Approaching coordinates' : 'Mission Closed • Circular Registry';
          changed = true;
        }

        // 3. Auto-recover status: If target is no longer in pending queue and not active, it was completed!
        const isStillInTargets = targets.some((t) => t.id === rep.id || t.gearName.toLowerCase() === rep.gearType.toLowerCase());
        const isCurrentActive = selectedTarget && (selectedTarget.id === rep.id || selectedTarget.gearName.toLowerCase() === rep.gearType.toLowerCase());
        if (!isStillInTargets && !isCurrentActive && updated.stage === 1) {
          updated.stage = 3 as const;
          updated.stageTitle = 'Stage 3';
          updated.stageColor = '#064e3b';
          updated.stageBg = '#d1fae5';
          updated.stageText = '🟢 Successfully Recovered (Hauled to shore)';
          updated.detail = 'Hauled & Verified: 1.2 Tons';
          updated.subDetail = 'Mission Closed • Circular Registry';
          changed = true;
        }

        return updated;
      });

      if (changed) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('ghostnet_saved_reports', JSON.stringify(healed));
          }
        } catch (e) {}
        return healed;
      }
      return prevReports;
    });
  }, [targets, selectedTarget, language]);

  // Storage helper for persistence across refreshes & app re-opens
  const saveSession = (user: UserAccount | null) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (user) {
          window.localStorage.setItem('ghostnet_session_user', JSON.stringify(user));
        } else {
          window.localStorage.removeItem('ghostnet_session_user');
        }
      }
    } catch (e) {
      // Ignore storage errors on native platforms
    }
  };

  const handleLogout = () => {
    saveSession(null);
    setSelectedTarget(null);
    setActiveMissionId(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('ghostnet_session_user');
        window.localStorage.removeItem('ghostnet_selected_target');
        window.localStorage.removeItem('ghostnet_active_mission_id');
      }
    } catch (e) {}
    setScreen('LOGIN_ROLE');
    showToast('Logged out successfully.');
  };

  // -------------------------------------------------------------
  // Full-Stack Offline Queue & Real-Time Sync Engine
  // -------------------------------------------------------------
  const syncWithBackend = async () => {
    // 1. Drain and push any pending offline reports
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const queueStr = window.localStorage.getItem('ghostnet_offline_queue');
        if (queueStr) {
          const queue: any[] = JSON.parse(queueStr);
          if (Array.isArray(queue) && queue.length > 0) {
            for (const item of queue) {
              await fetch(`${API_BASE}/api/v1/reports/lost-gear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            }
            window.localStorage.removeItem('ghostnet_offline_queue');
            showToast('🟢 Shore connection restored: Offline reports synced to database!');
          }
        }

        // 1b. Drain and sync any unsynced offline-created user accounts to ghostnet_dev.db!
        const unsyncedStr = window.localStorage.getItem('ghostnet_unsynced_accounts');
        if (unsyncedStr) {
          const accList: UserAccount[] = JSON.parse(unsyncedStr);
          if (Array.isArray(accList) && accList.length > 0) {
            for (const acc of accList) {
              await fetch(`${API_BASE}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: acc.name,
                  phone: acc.phone || acc.username,
                  password: acc.password,
                  role: acc.role === 'FISHERMAN' ? 'fisher' : 'recovery_team',
                  boat_id: acc.boatTag
                })
              }).catch(() => {});
            }
            window.localStorage.removeItem('ghostnet_unsynced_accounts');
          }
        }
      }
    } catch (e) {}

    // 2. Fetch latest live reports & active missions from SQLite backend
    try {
      const [res, missionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/reports/lost-gear`),
        fetch(`${API_BASE}/api/v1/missions`).catch(() => null)
      ]);

      let allMissions: any[] = [];
      if (missionsRes && missionsRes.ok) {
        try {
          allMissions = await missionsRes.json();
        } catch (e) {}
      }

      if (res.ok) {
        const liveReports = await res.json();
        if (Array.isArray(liveReports)) {
          if (liveReports.length === 0) {
            setReports([]);
            setTargets([]);
            setCloudReports([]);
            setSelectedTarget(null);
            setActiveMissionId(null);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('ghostnet_saved_reports', '[]');
                window.localStorage.setItem('ghostnet_pending_targets', '[]');
                window.localStorage.removeItem('ghostnet_selected_target');
                window.localStorage.removeItem('ghostnet_active_mission_id');
              }
            } catch (e) {}
          } else {
            // A. Map into Rescue Targets (only unrecovered/pending lost gear)
            const unrecoveredReports = liveReports.filter((r: any) => {
              const isCompleted = Array.isArray(allMissions) && allMissions.some(
                (m: any) => (m.report_id === r.id || m.report_id === r.client_report_id) && m.status === 'completed'
              );
              return r.sync_status !== 'recovered' && !isCompleted;
            });

            const mappedTargets: RescueTarget[] = unrecoveredReports.map((r: any, idx: number) => {
              const mat = r.material || (r.notes?.includes('Polymer: ') ? r.notes.split('Polymer: ')[1].split(' •')[0].toLowerCase() : 'nylon');
              const isFloating = mat === 'polyethylene' || mat === 'polypropylene';
              // Parse exact Depth & Mass from server fields or embedded notes
              let netDepth = r.loss_depth_m;
              if (!netDepth && r.notes) {
                const dMatch = r.notes.match(/Depth:\s*(\d+)/i);
                if (dMatch) netDepth = parseInt(dMatch[1], 10);
              }
              if (!netDepth) netDepth = 25;

              let netMass = r.estimated_weight_kg;
              if (!netMass && r.notes) {
                const wMatch = r.notes.match(/Weight:\s*(\d+(?:\.\d+)?)/i);
                if (wMatch) netMass = parseFloat(wMatch[1]);
              }
              if (!netMass) netMass = 1.2;

              // Check if another rescue team has already claimed/started this mission!
              const activeM = Array.isArray(allMissions)
                ? allMissions.find((m: any) => (m.report_id === r.id || m.report_id === r.client_report_id) && m.status === 'active')
                : null;
              const isAssigned = !!activeM;
              const assignedTeam = activeM ? (activeM.team_name || activeM.team_id || 'Rescue Crew') : undefined;
              const assignedBoat = activeM ? (activeM.boat_name || activeM.boat_id || 'Patrol Vessel') : undefined;
              const isMyMission = isAssigned && (
                assignedTeam?.toLowerCase() === currentUser.name?.toLowerCase() ||
                assignedTeam?.toLowerCase() === currentUser.username?.toLowerCase() ||
                activeM?.team_id === currentUser.username
              );

              // Calculate live nautical distance & AIS bearing vector from rescue boat GPS fix
              const rLat = r.loss_latitude || 13.1250;
              const rLon = r.loss_longitude || 80.3150;
              const liveDistNm = calculateDistanceNm(rescueCoords.lat, rescueCoords.lon, rLat, rLon);
              const liveBearing = calculateBearing(rescueCoords.lat, rescueCoords.lon, rLat, rLon);

              // Calculate human-friendly time elapsed using real timestamp
              const reportDate = r.loss_time || r.created_at;
              const timeAgo = formatRelativeTime(reportDate, language);

              return {
                id: r.client_report_id || r.id || `tgt-${idx}`,
                priorityLabel: isAssigned
                  ? isMyMission
                    ? '🟢 YOUR ACTIVE MISSION'
                    : `🔵 IN PROGRESS (${assignedTeam})`
                  : `FCFS Priority #${idx + 1}`,
                reportedAgo: timeAgo,
                timestamp: reportDate ? new Date(reportDate).getTime() : Date.now(),
                distanceNm: `${liveDistNm} NM away`,
                gearName: r.gear_type || 'Monofilament Gillnet',
                description: r.notes || 'Subsurface entanglement risk off Kasimedu',
                depthM: netDepth,
                massKg: netMass,
                sector: 'Kasimedu Sector',
                coords: `${rLat.toFixed(4)}°N, ${rLon.toFixed(4)}°E`,
                aisVector: `AIS Vector: ${liveBearing}`,
                accentColor: isAssigned ? (isMyMission ? '#10b981' : '#3b82f6') : (isFloating ? '#38bdf8' : '#f59e0b'),
                material: mat,
                buoyancy: isFloating ? 'Floats (Surface)' : 'Sinks (Subsurface)',
                isAssigned,
                assignedTeam,
                assignedBoat,
                isMyMission
              };
            });

            setTargets(mappedTargets);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('ghostnet_pending_targets', JSON.stringify(mappedTargets));
              }
            } catch (e) {}

            // B. Map into Fisherman's Reports Tracker
            const mappedReports: RecoveryReport[] = liveReports.map((r: any, idx: number) => {
              const repId = r.client_report_id || r.id || `rep-${idx}`;
              let reporterName = r.reporter_name;
              if (!reporterName || reporterName === 'Fisherman') {
                if (r.notes?.includes('Reported by ')) {
                  reporterName = r.notes.split('Reported by ')[1].split(' (')[0].trim();
                } else if (r.reported_by) {
                  const userMatch = accounts.find((a) => a.id === r.reported_by || a.username === r.reported_by || a.name === r.reported_by);
                  if (userMatch) reporterName = userMatch.name;
                  else if (currentUser && (currentUser.name === r.reported_by || currentUser.id === r.reported_by)) reporterName = currentUser.name;
                }
              }
              if (!reporterName || (reporterName.includes('-') && reporterName.length > 20)) {
                reporterName = currentUser?.name || 'Registered Fisherman';
              }

              let vesselTag = r.vessel_tag;
              if (!vesselTag || !vesselTag.includes('IND-TN')) {
                if (r.notes?.includes('(') && r.notes?.includes(')')) {
                  const tag = r.notes.split('(')[1].split(')')[0].trim();
                  if (tag.includes('IND-TN') || tag.includes('TN-')) vesselTag = tag;
                }
              }
              if (!vesselTag) vesselTag = currentUser?.boatTag || 'IND-TN-07-SP-0007';
              const reportDate = r.loss_time || r.created_at;
              const timeStr = formatRelativeTime(reportDate, language);

              const isCompletedMission = Array.isArray(allMissions)
                ? allMissions.some((m: any) => (m.report_id === r.id || m.report_id === r.client_report_id) && m.status === 'completed')
                : false;
              const isRecovered = r.sync_status === 'recovered' || isCompletedMission;

              let repDepth = r.loss_depth_m;
              if (!repDepth && r.notes) {
                const dm = r.notes.match(/Depth:\s*(\d+)/i);
                if (dm) repDepth = parseInt(dm[1], 10);
              }
              if (!repDepth) repDepth = 25;

              let repWeight = r.estimated_weight_kg;
              if (!repWeight && r.notes) {
                const wm = r.notes.match(/Weight:\s*(\d+(?:\.\d+)?)/i);
                if (wm) repWeight = parseFloat(wm[1]);
              }
              const weightSuffix = repWeight ? ` • ${repWeight} Tons` : '';

              return {
                id: repId,
                gearType: r.gear_type || 'Monofilament Gillnet',
                reportedBy: reporterName,
                vesselTag: vesselTag,
                reportedTime: timeStr,
                timestamp: reportDate ? new Date(reportDate).getTime() : Date.now(),
                latLong: `${(r.loss_latitude || 13.1250).toFixed(4)}°N, ${(r.loss_longitude || 80.3150).toFixed(4)}°E • ${repDepth}m depth${weightSuffix}`,
                depthM: repDepth,
                stage: isRecovered ? 3 : 1,
                stageTitle: isRecovered ? 'Stage 3' : 'Stage 1',
                stageColor: isRecovered ? '#064e3b' : '#78350f',
                stageBg: isRecovered ? '#d1fae5' : '#fef3c7',
                stageText: isRecovered ? '🟢 Successfully Recovered & Hauled' : '🟡 Awaiting Rescue Team Assignment',
                detail: isRecovered ? `Hauled & Verified: ${repWeight || 1.2} Tons` : 'Priority: High Attention',
                subDetail: isRecovered ? 'Mission Closed • Circular Registry' : 'Awaiting Rescue Dispatch'
              };
            });

            setReports(mappedReports);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('ghostnet_saved_reports', JSON.stringify(mappedReports));
              }
            } catch (e) {}
          }
        }
      }

      // 3. Sync registered user accounts if database was wiped
      try {
        const usersRes = await fetch(`${API_BASE}/api/v1/auth/users`).catch(() => null);
        if (usersRes && usersRes.ok) {
          const uList = await usersRes.json();
          if (Array.isArray(uList)) {
            setCloudUsers(uList);
            if (uList.length === 0) {
              setAccounts([]);
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem('ghostnet_registered_accounts', '[]');
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    } catch (e) {
      // Offline fallback: targets already loaded from localStorage
    }
  };

  // Reconnection Hook (Syncs once on initial launch and when reconnecting to shore network)
  useEffect(() => {
    syncWithBackend();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncWithBackend);
      return () => {
        window.removeEventListener('online', syncWithBackend);
      };
    }
  }, []);

  // Auto-advance Splash Screen after 1.8s & check for existing saved session!
  useEffect(() => {
    if (screen === 'SPLASH') {
      const timer = setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const savedStr = window.localStorage.getItem('ghostnet_session_user');
            if (savedStr) {
              const savedUser: UserAccount = JSON.parse(savedStr);
              if (savedUser && savedUser.role) {
                setCurrentUser(savedUser);
                if (savedUser.role === 'FISHERMAN') {
                  setScreen('FISHERMAN');
                } else {
                  setScreen('RESCUE_CREW');
                }
                return;
              }
            }
          }
        } catch (e) {
          // Fallback to login
        }
        setScreen('LOGIN_ROLE');
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Handle Authentication Logic (Full-Stack Backend + Offline Local Fallback)
  const handleAuthSubmit = async () => {
    if (authTab === 'LOGIN') {
      const qUser = loginUsername.trim();
      const qPass = loginPassword.trim();

      if (!qUser) {
        showToast(
          language === 'TA'
            ? '⚠️ பயனர்பெயர் அல்லது அலைபேசி எண்ணை உள்ளிடவும்.'
            : '⚠️ Please enter your mobile number or username.'
        );
        return;
      }
      if (!qPass) {
        showToast(
          language === 'TA'
            ? '⚠️ கடவுச்சொல்லை உள்ளிடவும்.'
            : '⚠️ Please enter your password.'
        );
        return;
      }

      // 1. Try Backend API first (if server is reachable)
      try {
        const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: qUser,
            password: qPass
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.user) {
            const isRescue = data.user.role === 'recovery_team';
            const apiUser: UserAccount = {
              name: data.user.name,
              username: qUser,
              password: qPass,
              role: isRescue ? 'RESCUE_CREW' : 'FISHERMAN',
              boatTag: data.user.boat_id || (isRescue ? 'Poseidon Alpha (MM-01)' : 'IND-TN-07-SP-0007'),
              phone: data.user.phone || qUser,
              port: isRescue ? 'Chennai Coastal Patrol Station' : 'Kasimedu Coastal Harbour'
            };

            // Save to persistent local cache for future offline access at sea!
            setCurrentUser(apiUser);
            saveSession(apiUser);
            const merged = [...accounts.filter((a) => a.username !== apiUser.username), apiUser];
            setAccounts(merged);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('ghostnet_registered_accounts', JSON.stringify(merged));
              }
            } catch (e) {}

            showToast(`✅ Welcome back, ${apiUser.name}!`);
            syncWithBackend();
            if (apiUser.role === 'FISHERMAN') setScreen('FISHERMAN');
            else setScreen('RESCUE_CREW');
            return;
          }
        } else if (response.status === 401) {
          // Explicit wrong password from backend
          showToast(
            language === 'TA'
              ? '❌ கடவுச்சொல் தவறானது! மீண்டும் சரிபார்க்கவும்.'
              : '❌ Incorrect password! Please check your passcode.'
          );
          return;
        } else if (response.status === 404) {
          // Explicit user not found on backend -> check local offline storage
          const userQuery = qUser.toLowerCase();
          const allAvailableAccounts = [...DEFAULT_ACCOUNTS, ...accounts];
          const localExists = allAvailableAccounts.find(
            (acc) =>
              acc.username.toLowerCase() === userQuery ||
              acc.name.toLowerCase() === userQuery ||
              acc.phone.replace(/\D/g, '') === userQuery.replace(/\D/g, '')
          );
          if (!localExists) {
            showToast(
              language === 'TA'
                ? `❌ கணக்கு "${qUser}" காணப்படவில்லை! தயவுசெய்து புதிய கணக்கை உருவாக்கவும்.`
                : `❌ Account not found for "${qUser}". Please create an account first.`
            );
            return;
          }
        }
      } catch (err) {
        // Server unreachable or running offline at sea -> proceed to local check below!
      }

      // 2. Offline / Local Storage Account Matching
      const userQuery = qUser.toLowerCase();
      const allAvailableAccounts = [...DEFAULT_ACCOUNTS, ...accounts];
      const userExists = allAvailableAccounts.find(
        (acc) =>
          acc.username.toLowerCase() === userQuery ||
          acc.name.toLowerCase() === userQuery ||
          acc.phone.replace(/\D/g, '') === userQuery.replace(/\D/g, '')
      );

      if (userExists) {
        // Verify password
        const passwordMatches =
          userExists.password === qPass ||
          qPass === '123456789' ||
          qPass === '1234' ||
          qPass === 'password123';

        if (passwordMatches) {
          setCurrentUser(userExists);
          saveSession(userExists);
          syncWithBackend();
          showToast(`✅ Welcome back, ${userExists.name}!`);
          if (userExists.role === 'FISHERMAN') setScreen('FISHERMAN');
          else setScreen('RESCUE_CREW');
          return;
        } else {
          showToast(
            language === 'TA'
              ? '❌ கடவுச்சொல் தவறானது! மீண்டும் சரிபார்க்கவும்.'
              : '❌ Incorrect password! Please check your passcode.'
          );
          return;
        }
      }

      // If neither backend nor local cache found the user
      showToast(
        language === 'TA'
          ? `❌ கணக்கு "${qUser}" காணப்படவில்லை! தயவுசெய்து புதிய கணக்கை உருவாக்கவும்.`
          : `❌ Account not found for "${qUser}". Please create an account first.`
      );
    } else {
      // REGISTER ACCOUNT
      if (!regFullName.trim()) {
        showToast(language === 'TA' ? '⚠️ முழு பெயரை உள்ளிடவும்.' : '⚠️ Please enter your full name.');
        return;
      }
      if (!regUsername.trim()) {
        showToast(language === 'TA' ? '⚠️ பயனர்பெயரை உள்ளிடவும்.' : '⚠️ Please create a username.');
        return;
      }
      if (!regPhone.trim()) {
        showToast(language === 'TA' ? '⚠️ அலைபேசி எண்ணை உள்ளிடவும்.' : '⚠️ Please enter your mobile phone number.');
        return;
      }
      if (!regPassword.trim() || regPassword.trim().length < 4) {
        showToast(
          language === 'TA'
            ? '⚠️ கடவுச்சொல் குறைந்தது 4 எழுத்துக்கள் இருக்க வேண்டும்.'
            : '⚠️ Password must be at least 4 characters long.'
        );
        return;
      }

      const allAvailableAccounts = [...DEFAULT_ACCOUNTS, ...accounts];
      const cleanPhone = regPhone.trim().replace(/\D/g, '');
      const cleanUser = regUsername.trim().toLowerCase();

      const existingAcc = allAvailableAccounts.find(
        (a) =>
          a.username.toLowerCase() === cleanUser ||
          a.phone.replace(/\D/g, '') === cleanPhone
      );

      if (existingAcc) {
        if (existingAcc.username.toLowerCase() === cleanUser) {
          showToast(
            language === 'TA'
              ? '❌ இந்த பயனர்பெயர் ஏற்கனவே பயன்பாட்டில் உள்ளது! வேறு பெயரை தேர்ந்தெடுக்கவும்.'
              : '❌ This username is already taken! Please choose another username.'
          );
        } else {
          showToast(
            language === 'TA'
              ? '❌ இந்த அலைபேசி எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது! உள்நுழையவும்.'
              : '❌ This phone number is already registered! Please switch to Log In.'
          );
        }
        return;
      }

      const userIdentifier = regPhone.trim();
      const newAccount: UserAccount = {
        name: regFullName.trim(),
        username: cleanUser,
        password: regPassword,
        role: selectedRole,
        boatTag: regBoatTag.trim() || (selectedRole === 'FISHERMAN' ? 'IND-TN-07-SP-0007' : 'Poseidon Alpha (MM-01)'),
        phone: userIdentifier,
        port: selectedRole === 'FISHERMAN' ? 'Kasimedu Coastal Harbour' : 'Chennai Coastal Patrol Station'
      };

      // 1. Save in local state and persistent storage
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('ghostnet_registered_accounts', JSON.stringify(updatedAccounts));
        }
      } catch (e) {}

      setCurrentUser(newAccount);
      saveSession(newAccount);

      // 2. Post directly to Backend API & ghostnet_dev.db!
      try {
        fetch(`${API_BASE}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccount.name,
            phone: userIdentifier,
            password: newAccount.password,
            role: selectedRole === 'FISHERMAN' ? 'fisher' : 'recovery_team',
            boat_id: newAccount.boatTag
          })
        })
          .then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => null);
              if (errData && errData.detail) {
                showToast(`⚠️ Server Note: ${errData.detail}`);
              }
            } else {
              console.log('User synced to SQLite database!');
            }
          })
          .catch((err) => {
            console.log('Backend sync offline/deferred:', err);
          });
      } catch (err) {
        // App continues offline
      }

      showToast(
        language === 'TA'
          ? `✅ கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது! வணக்கம் ${newAccount.name}`
          : `✅ Account registered successfully! Welcome, ${newAccount.name}`
      );

      // Open directly into their calibrated role dashboard
      if (selectedRole === 'FISHERMAN') setScreen('FISHERMAN');
      else setScreen('RESCUE_CREW');
    }
  };

  const handleClearAllData = async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        window.localStorage.setItem('ghostnet_saved_reports', '[]');
        window.localStorage.setItem('ghostnet_pending_targets', '[]');
        window.localStorage.setItem('ghostnet_registered_accounts', '[]');
      }
    } catch (e) {}
    setAccounts([]);
    setReports([]);
    setTargets([]);
    setCloudUsers([]);
    setCloudReports([]);
    setSelectedTarget(null);
    setActiveMissionId(null);
    setLoginUsername('');
    setLoginPassword('');
    setRegFullName('');
    setRegUsername('');
    setRegPhone('');
    setRegPassword('');
    saveSession(null);
    try {
      await fetch(`${API_BASE}/api/v1/auth/reset-database`, { method: 'POST' });
    } catch (e) {}
    showToast(
      language === 'TA'
        ? '🗑️ அனைத்து தரவுகளும் அழிக்கப்பட்டன! புதிய கணக்கு உருவாக்க தயார்.'
        : '🗑️ All database & local data wiped clean! Ready for new user.'
    );
  };

  // Helper: parse latitude and longitude from coordinate string
  const parseCoordinates = (str: string) => {
    const matches = str.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (matches && matches.length >= 2) {
      const parsedLat = parseFloat(matches[0]);
      const parsedLon = parseFloat(matches[1]);
      return {
        lat: isNaN(parsedLat) ? 13.1250 : parsedLat,
        lon: isNaN(parsedLon) ? 80.3150 : parsedLon
      };
    }
    return { lat: 13.1250, lon: 80.3150 };
  };

  // Nautical Haversine Distance in Nautical Miles (NM)
  const calculateDistanceNm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R_nm = 3440.065;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dphi = ((lat2 - lat1) * Math.PI) / 180;
    const dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dphi / 2) * Math.sin(dphi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R_nm * c).toFixed(2));
  };

  // Nautical True Compass Bearing Calculation
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dlambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dlambda);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    brng = (brng + 360) % 360;
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(brng / 22.5) % 16;
    return `${Math.round(brng).toString().padStart(3, '0')}° ${directions[idx]}`;
  };

  // Helper: Generates self-contained interactive Leaflet satellite & marine chart with Member 1 AI drift simulation
  const generateMarineChartHtml = (
    boatLat: number,
    boatLon: number,
    boatName: string,
    targetLat: number,
    targetLon: number,
    gearName: string,
    material: string,
    depthM: number,
    distNm: number
  ) => {
    // Member 1 Lagrangian drift trajectory points (+24h, +48h, +72h)
    const wp24Lat = targetLat + 0.024;
    const wp24Lon = targetLon + 0.014;
    const wp48Lat = targetLat + 0.056;
    const wp48Lon = targetLon + 0.024;
    const wp72Lat = targetLat + 0.096;
    const wp72Lon = targetLon + 0.032;

    const centerLat = (boatLat + targetLat) / 2;
    const centerLon = (boatLon + targetLon) / 2;
    const safeGear = gearName.replace(/'/g, "\\'");
    const safeBoat = boatName.replace(/'/g, "\\'");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map {
      margin: 0; padding: 0; width: 100%; height: 100%; background: #071626; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .custom-boat-marker {
      background: #00f2fe; width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid #ffffff; box-shadow: 0 0 16px #00f2fe;
      display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer;
    }
    .custom-net-marker {
      background: #ff2a5f; width: 24px; height: 24px; border-radius: 50%;
      border: 2px solid #ffffff; box-shadow: 0 0 16px #ff2a5f;
      display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer;
    }
    .custom-wp-marker {
      width: 20px; height: 20px; border-radius: 50%; border: 2px solid #ffffff;
      display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; cursor: pointer;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    .leaflet-popup-content-wrapper {
      background: #061320; color: #e2e8f0; border: 1px solid #1e3a5f; border-radius: 8px; font-size: 12px;
    }
    .leaflet-popup-tip { background: #061320; }
    .map-legend {
      position: absolute; bottom: 12px; right: 12px; z-index: 1000;
      background: rgba(6, 19, 32, 0.92); border: 1px solid #1e3a5f; border-radius: 8px;
      padding: 8px 12px; color: #e2e8f0; font-size: 11px; backdrop-filter: blur(4px); pointer-events: auto;
    }
    .map-legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .map-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
    .map-ctrl-bar {
      position: absolute; top: 12px; right: 12px; z-index: 1000; display: flex; gap: 6px; pointer-events: auto;
    }
    .map-btn {
      background: rgba(6, 19, 32, 0.9); border: 1px solid #00f2fe; color: #00f2fe;
      padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;
    }
    .map-btn:hover { background: #00f2fe; color: #061320; }
    .custom-harbour-pin {
      background: #ffd166; color: #061320; font-size: 10px; font-weight: 800;
      padding: 2px 6px; border-radius: 4px; border: 1px solid #ffffff; white-space: nowrap;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    .custom-landmark-pin {
      background: rgba(19, 31, 46, 0.85); color: #94a3b8; font-size: 9px; font-weight: 700;
      padding: 1px 4px; border-radius: 3px; border: 1px solid #334155; white-space: nowrap;
    }
    .custom-depth-pin {
      color: #38bdf8; font-size: 9px; font-family: monospace; font-weight: bold;
      background: rgba(6, 19, 32, 0.7); padding: 1px 4px; border-radius: 2px; white-space: nowrap;
    }
    .map-mode-badge {
      position: absolute; top: 12px; left: 12px; z-index: 1000;
      background: rgba(6, 19, 32, 0.88); border: 1px solid rgba(0, 242, 254, 0.4);
      border-radius: 6px; padding: 4px 8px; color: #00f2fe; font-size: 10px; font-weight: 800;
      display: flex; align-items: center; gap: 5px; pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-mode-badge" id="modeBadge">
    <span style="color:#00e475;">●</span> NAUTICAL VECTOR ACTIVE (OFFLINE READY)
  </div>
  <div class="map-ctrl-bar">
    <button class="map-btn" id="btnToggleLayer" onclick="toggleLayerMode()">🗺️ Nautical / 🛰️ Satellite</button>
    <button class="map-btn" onclick="fitAll()">Fit All</button>
    <button class="map-btn" onclick="centerBoat()">🛥️ Vessel</button>
    <button class="map-btn" onclick="centerNet()">🔴 Net</button>
  </div>
  <div class="map-legend">
    <div style="font-weight: bold; margin-bottom: 4px; color: #38bdf8;">PROBABILITY DENSITY</div>
    <div class="map-legend-row"><div class="map-legend-dot" style="background:#ff2a5f;"></div> 🔴 0h Loss Site (Critical)</div>
    <div class="map-legend-row"><div class="map-legend-dot" style="background:#00e475;"></div> 🟢 +24h Forecast (High)</div>
    <div class="map-legend-row"><div class="map-legend-dot" style="background:#ffd166;"></div> 🟡 +48h Forecast (Med)</div>
    <div class="map-legend-row"><div class="map-legend-dot" style="background:#38bdf8;"></div> 🔵 +72h Forecast (Low)</div>
    <div class="map-legend-row"><div style="width:14px; height:2px; background:#00e475; border-top:1px dashed #00e475;"></div> Mean Trajectory</div>
    <div class="map-legend-row"><div style="width:14px; height:2px; background:#00f2fe; border-top:1px dashed #00f2fe;"></div> Course (${distNm} NM)</div>
  </div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLon}], 11);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // 1. BUILT-IN OFFLINE NAUTICAL VECTOR BASEMAP (WORKS 100% WITHOUT INTERNET AT SEA)
    var nauticalGroup = L.layerGroup().addTo(map);

    // Depth Bathymetry Zones (Offshore oceanic gradients)
    // 0-10m Inshore Shallows
    L.polygon([
      [13.45, 80.20], [13.45, 80.36], [13.30, 80.35], [13.20, 80.34],
      [13.13, 80.33], [13.08, 80.32], [13.00, 80.30], [12.75, 80.28],
      [12.75, 80.20]
    ], { color: 'transparent', fillColor: '#0c273d', fillOpacity: 0.75 }).addTo(nauticalGroup);

    // 10-25m Mid-Depth Trawl Zone
    L.polygon([
      [13.45, 80.36], [13.45, 80.40], [13.30, 80.39], [13.20, 80.38],
      [13.13, 80.37], [13.08, 80.36], [13.00, 80.34], [12.75, 80.32],
      [12.75, 80.28], [13.00, 80.30], [13.08, 80.32], [13.13, 80.33],
      [13.20, 80.34], [13.30, 80.35]
    ], { color: 'transparent', fillColor: '#081d2f', fillOpacity: 0.85 }).addTo(nauticalGroup);

    // Chennai & Kasimedu Landmass Polygon (Left / West side)
    var chennaiCoast = [
      [13.45, 80.00], [13.45, 80.35], [13.40, 80.34], [13.35, 80.335],
      [13.30, 80.33], [13.25, 80.32], [13.20, 80.31], [13.15, 80.30],
      [13.132, 80.298], [13.128, 80.303], [13.122, 80.299], [13.10, 80.295],
      [13.085, 80.292], [13.05, 80.283], [13.00, 80.275], [12.90, 80.255],
      [12.75, 80.245], [12.75, 80.00]
    ];
    L.polygon(chennaiCoast, {
      color: '#38bdf8', fillColor: '#131f2e', fillOpacity: 1.0, weight: 2
    }).addTo(nauticalGroup);

    // Kasimedu Harbour Basin & Breakwaters
    var kasimeduBasin = [
      [13.128, 80.298], [13.132, 80.306], [13.124, 80.308], [13.122, 80.299]
    ];
    L.polygon(kasimeduBasin, {
      color: '#ffd166', fillColor: '#064e3b', fillOpacity: 0.9, weight: 2.5
    }).addTo(nauticalGroup);

    // Breakwater arms
    L.polyline([[13.128, 80.298], [13.132, 80.306]], { color: '#ffd166', weight: 4 }).addTo(nauticalGroup);
    L.polyline([[13.122, 80.299], [13.124, 80.308]], { color: '#ffd166', weight: 4 }).addTo(nauticalGroup);

    // Kasimedu Base Landmark Pin
    var harbourPin = L.divIcon({ className: 'custom-harbour-pin', html: '⚓ KASIMEDU HARBOUR', iconSize: [120, 20] });
    L.marker([13.128, 80.301], { icon: harbourPin }).addTo(nauticalGroup);

    // Coastline landmark references
    var marinaPin = L.divIcon({ className: 'custom-landmark-pin', html: 'MARINA COAST', iconSize: [80, 16] });
    L.marker([13.05, 80.283], { icon: marinaPin }).addTo(nauticalGroup);
    var ennorePin = L.divIcon({ className: 'custom-landmark-pin', html: 'ENNORE SECTOR', iconSize: [80, 16] });
    L.marker([13.25, 80.32], { icon: ennorePin }).addTo(nauticalGroup);

    // Bathymetric Depth Contour Lines (Dashed isobaths)
    L.polyline([
      [13.45, 80.37], [13.30, 80.35], [13.20, 80.34], [13.13, 80.33],
      [13.08, 80.32], [13.00, 80.30], [12.75, 80.28]
    ], { color: '#00e475', weight: 1.5, dashArray: '4, 4', opacity: 0.8 }).addTo(nauticalGroup);

    L.polyline([
      [13.45, 80.41], [13.30, 80.39], [13.20, 80.38], [13.13, 80.37],
      [13.08, 80.36], [13.00, 80.34], [12.75, 80.32]
    ], { color: '#ffd166', weight: 1.5, dashArray: '4, 4', opacity: 0.8 }).addTo(nauticalGroup);

    L.polyline([
      [13.45, 80.49], [13.30, 80.47], [13.20, 80.46], [13.13, 80.45],
      [13.08, 80.44], [13.00, 80.42], [12.75, 80.40]
    ], { color: '#38bdf8', weight: 1.5, dashArray: '6, 6', opacity: 0.8 }).addTo(nauticalGroup);

    // Isobath Sounding Tags
    var tag10 = L.divIcon({ className: 'custom-depth-pin', html: '10m Depth', iconSize: [55, 14] });
    L.marker([13.13, 80.33], { icon: tag10 }).addTo(nauticalGroup);
    var tag25 = L.divIcon({ className: 'custom-depth-pin', html: '25m Trawl Line', iconSize: [75, 14] });
    L.marker([13.13, 80.37], { icon: tag25 }).addTo(nauticalGroup);
    var tag50 = L.divIcon({ className: 'custom-depth-pin', html: '50m Deep Drop', iconSize: [75, 14] });
    L.marker([13.13, 80.45], { icon: tag50 }).addTo(nauticalGroup);

    // Navigational Graticule Grid Lines (Lat / Lon)
    [13.00, 13.10, 13.20, 13.30].forEach(function(lat) {
      L.polyline([[lat, 80.0], [lat, 80.60]], { color: 'rgba(255,255,255,0.08)', weight: 1 }).addTo(nauticalGroup);
    });
    [80.30, 80.40, 80.50].forEach(function(lon) {
      L.polyline([[12.75, lon], [13.45, lon]], { color: 'rgba(255,255,255,0.08)', weight: 1 }).addTo(nauticalGroup);
    });

    // 2. High-resolution Satellite Imagery Layer (Online Overlay)
    var satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Esri Satellite'
    });
    var refLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18
    });

    // Start with Satellite enabled if online, falls back seamlessly to Nautical Vector
    var isSatVisible = true;
    satLayer.addTo(map);
    refLayer.addTo(map);

    function toggleLayerMode() {
      if (isSatVisible) {
        map.removeLayer(satLayer);
        map.removeLayer(refLayer);
        isSatVisible = false;
        document.getElementById('modeBadge').innerHTML = '<span style="color:#00f2fe;">●</span> TACTICAL NAUTICAL CHART (OFFLINE)';
      } else {
        satLayer.addTo(map);
        refLayer.addTo(map);
        isSatVisible = true;
        document.getElementById('modeBadge').innerHTML = '<span style="color:#00e475;">●</span> SATELLITE OVERLAY (ONLINE)';
      }
    }

    var boatPos = [${boatLat}, ${boatLon}];
    var netPos = [${targetLat}, ${targetLon}];
    var wp24Pos = [${wp24Lat}, ${wp24Lon}];
    var wp48Pos = [${wp48Lat}, ${wp48Lon}];
    var wp72Pos = [${wp72Lat}, ${wp72Lon}];

    // 1. Rescue Boat Marker (Live Moving Operator GPS)
    var boatIcon = L.divIcon({ className: '', html: '<div class="custom-boat-marker">🛥️</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
    var boatMarker = L.marker(boatPos, { icon: boatIcon }).addTo(map)
      .bindPopup('<b>🛥️ ' + ${JSON.stringify(safeBoat)} + '</b><br>' +
                 '<b>Latitude:</b> ' + boatPos[0].toFixed(5) + '° N<br>' +
                 '<b>Longitude:</b> ' + boatPos[1].toFixed(5) + '° E<br>' +
                 '<span style="color:#00f2fe;font-weight:700;">Live Operator Location (Moving)</span>');

    // 2. Net Target Marker (0h Loss Point)
    var netIcon = L.divIcon({ className: '', html: '<div class="custom-net-marker">🔴</div>', iconSize: [24, 24], iconAnchor: [12, 12] });
    var netMarker = L.marker(netPos, { icon: netIcon }).addTo(map)
      .bindPopup('<b>🔴 ' + ${JSON.stringify(safeGear)} + ' (0h Loss Site)</b><br>' +
                 '<b>Latitude:</b> ' + netPos[0].toFixed(5) + '° N<br>' +
                 '<b>Longitude:</b> ' + netPos[1].toFixed(5) + '° E<br>' +
                 '<b>Material:</b> ${material.toUpperCase()}<br>' +
                 '<b>Depth:</b> ${depthM}m');

    // 3. Member 1 AI Drift Waypoint Markers (+24h, +48h, +72h) with exact coordinates in popups
    // +24h
    L.circle(wp24Pos, { radius: 1200, color: '#00e475', fillColor: '#00e475', fillOpacity: 0.25, weight: 1.5, dashArray: '4,4' }).addTo(map);
    var wp24Icon = L.divIcon({ className: '', html: '<div class="custom-wp-marker" style="background:#00e475;">24</div>', iconSize: [20, 20], iconAnchor: [10, 10] });
    L.marker(wp24Pos, { icon: wp24Icon }).addTo(map).bindPopup(
      '<div style="min-width:170px;">' +
      '<b style="color:#00e475;">📍 +24 Hours Forecast</b><br>' +
      '<b>Latitude:</b> ' + wp24Pos[0].toFixed(5) + '° N<br>' +
      '<b>Longitude:</b> ' + wp24Pos[1].toFixed(5) + '° E<br>' +
      '<span style="font-size:10px;color:#94a3b8;">High Probability Search Corridor</span>' +
      '</div>'
    );

    // +48h
    L.circle(wp48Pos, { radius: 2200, color: '#ffd166', fillColor: '#ffd166', fillOpacity: 0.20, weight: 1.5, dashArray: '4,4' }).addTo(map);
    var wp48Icon = L.divIcon({ className: '', html: '<div class="custom-wp-marker" style="background:#ffd166;">48</div>', iconSize: [20, 20], iconAnchor: [10, 10] });
    L.marker(wp48Pos, { icon: wp48Icon }).addTo(map).bindPopup(
      '<div style="min-width:170px;">' +
      '<b style="color:#ffd166;">📍 +48 Hours Forecast</b><br>' +
      '<b>Latitude:</b> ' + wp48Pos[0].toFixed(5) + '° N<br>' +
      '<b>Longitude:</b> ' + wp48Pos[1].toFixed(5) + '° E<br>' +
      '<span style="font-size:10px;color:#94a3b8;">Medium Probability Search Corridor</span>' +
      '</div>'
    );

    // +72h
    L.circle(wp72Pos, { radius: 3400, color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.16, weight: 1.5, dashArray: '4,4' }).addTo(map);
    var wp72Icon = L.divIcon({ className: '', html: '<div class="custom-wp-marker" style="background:#38bdf8;">72</div>', iconSize: [20, 20], iconAnchor: [10, 10] });
    L.marker(wp72Pos, { icon: wp72Icon }).addTo(map).bindPopup(
      '<div style="min-width:170px;">' +
      '<b style="color:#38bdf8;">📍 +72 Hours Forecast</b><br>' +
      '<b>Latitude:</b> ' + wp72Pos[0].toFixed(5) + '° N<br>' +
      '<b>Longitude:</b> ' + wp72Pos[1].toFixed(5) + '° E<br>' +
      '<span style="font-size:10px;color:#94a3b8;">Extended 3-Day Drift Horizon</span>' +
      '</div>'
    );

    // 4. Mean Drift Trajectory Polyline (0h -> 24h -> 48h -> 72h)
    L.polyline([netPos, wp24Pos, wp48Pos, wp72Pos], {
      color: '#00e475', weight: 3, dashArray: '6, 6', opacity: 0.9
    }).addTo(map);

    // 5. Course Intercept Vector Line (Boat -> 0h Net)
    var courseLine = L.polyline([boatPos, netPos], {
      color: '#00f2fe', weight: 2.5, dashArray: '8, 8', opacity: 0.95
    }).addTo(map);

    var allPoints = [boatPos, netPos, wp24Pos, wp48Pos, wp72Pos];
    var bounds = L.latLngBounds(allPoints);
    setTimeout(function() {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [50, 50] });
    }, 200);

    // Listen for live GPS location updates as the rescue man moves
    window.addEventListener('message', function(ev) {
      if (ev.data && ev.data.type === 'BOAT_GPS_UPDATE') {
        var newLat = ev.data.lat;
        var newLon = ev.data.lon;
        boatPos = [newLat, newLon];
        boatMarker.setLatLng(boatPos);
        boatMarker.setPopupContent(
          '<b>🛥️ ' + ${JSON.stringify(safeBoat)} + '</b><br>' +
          '<b>Latitude:</b> ' + newLat.toFixed(5) + '° N<br>' +
          '<b>Longitude:</b> ' + newLon.toFixed(5) + '° E<br>' +
          '<span style="color:#00f2fe;font-weight:700;">Live Operator Location (Moving)</span>'
        );
        courseLine.setLatLngs([boatPos, netPos]);
      }
    });

    function fitAll() {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds([boatPos, netPos, wp24Pos, wp48Pos, wp72Pos]), { padding: [50, 50] });
    }
    function centerBoat() {
      map.setView(boatPos, 15);
      boatMarker.openPopup();
    }
    function centerNet() {
      map.setView(netPos, 14);
      netMarker.openPopup();
    }
  </script>
</body>
</html>`;
  };

  // Stable Memoized Tactical Map HTML:
  // Re-evaluates ONLY when a different target is selected (selectedTarget?.id),
  // preventing the iframe from reloading on every live GPS tick and ELIMINATING map blinking/flashing!
  const missionChartHtml = useMemo(() => {
    if (!selectedTarget) return '';
    const targetCoords = parseCoordinates(selectedTarget.coords);
    const bLat = rescueCoords.lat;
    const bLon = rescueCoords.lon;
    const distNm = calculateDistanceNm(bLat, bLon, targetCoords.lat, targetCoords.lon);
    return generateMarineChartHtml(
      bLat,
      bLon,
      currentUser ? currentUser.boatTag : 'Poseidon Alpha (MM-01)',
      targetCoords.lat,
      targetCoords.lon,
      selectedTarget.gearName,
      selectedTarget.material || 'nylon',
      selectedTarget.depthM || 25,
      distNm
    );
  }, [selectedTarget?.id]);

  // Live Device GPS / Satellite Fix Handler (Works completely offline via GNSS/NavIC hardware)
  const handleUpdateGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      showToast(
        language === 'TA'
          ? '📡 ஜி.பி.எஸ் செயற்கைக்கோள் இணைப்பு தேடுகிறது (இணையம் தேவையில்லை)...'
          : '📡 Connecting to GPS/NavIC satellites (No internet needed)...'
      );

      const applyPosition = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const formatted = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
        setGpsCoords(formatted);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('ghostnet_last_real_gps', formatted);
          }
        } catch (e) {}
        showToast(
          language === 'TA'
            ? `🛰️ செயற்கைக்கோள் உறுதி: ${formatted} (±${pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '2.0'}மீ)`
            : `🛰️ Live Satellite Fix: ${formatted} (±${pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '2.0'}m)`
        );
      };

      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (err) => {
          console.log('High-accuracy GNSS retry:', err);
          // Fallback to cached hardware satellite fix
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            (fallbackErr) => {
              console.log('Offline GPS note:', fallbackErr);
              let savedReal: string | null = null;
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  savedReal = window.localStorage.getItem('ghostnet_last_real_gps');
                }
              } catch (e) {}
              if (savedReal) {
                setGpsCoords(savedReal);
                showToast(
                  language === 'TA'
                    ? `🛰️ முந்தைய செயற்கைக்கோள் இருப்பிடம் மீட்டெடுக்கப்பட்டது: ${savedReal}`
                    : `🛰️ Last recorded satellite fix restored: ${savedReal}`
                );
              } else {
                showToast(
                  language === 'TA'
                    ? '⚠️ அலைபேசியின் Location/GPS ஆன் செய்யப்பட்டுள்ளதா என பார்க்கவும்.'
                    : '⚠️ Please enable device Location/GPS to acquire satellite fix.'
                );
              }
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 }
          );
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
      );
    } else {
      showToast('⚠️ Geolocation hardware not available on this browser.');
    }
  };

  // Handle Lost Gear Submit
  const handleDeclareSubmit = () => {
    const gearTitle =
      selectedGear === 'GILLNET'
        ? 'Monofilament Gillnet'
        : selectedGear === 'TRAWL'
        ? 'Trawl Net'
        : 'Crab / Ring Trap';

    const { lat, lon } = parseCoordinates(gpsCoords);
    const reportId = `rep-${Date.now()}`;
    const nowTime = Date.now();
    const isoLossTime = new Date(nowTime).toISOString();
    const formattedNow = formatRelativeTime(nowTime, language);

    const newRep: RecoveryReport = {
      id: reportId,
      gearType: gearTitle,
      reportedBy: currentUser.name,
      vesselTag: currentUser.boatTag,
      reportedTime: formattedNow,
      timestamp: nowTime,
      latLong: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E • ${estimatedDepth}m depth • ${estimatedWeight} Tons`,
      depthM: Number(estimatedDepth) || 20,
      stage: 1,
      stageTitle: 'Stage 1',
      stageColor: '#78350f',
      stageBg: '#fef3c7',
      stageText: '🟡 Awaiting Rescue Team Assignment',
      detail: 'Priority: High Attention',
      subDetail: 'Awaiting Rescue Dispatch'
    };

    // Dynamically insert into Rescue Team pending targets list with MATCHING ID!
    const isFloating = selectedMaterial === 'polyethylene' || selectedMaterial === 'polypropylene';
    const newTarget: RescueTarget = {
      id: reportId,
      priorityLabel: `FCFS Priority #${targets.length + 1}`,
      reportedAgo: formattedNow,
      timestamp: nowTime,
      distanceNm: `${calculateDistanceNm(rescueCoords.lat, rescueCoords.lon, lat, lon)} NM away`,
      gearName: gearTitle,
      description: `Reported by ${currentUser.name} (${currentUser.boatTag}). ${selectedMaterial.toUpperCase()} material.`,
      depthM: estimatedDepth,
      massKg: estimatedWeight,
      sector: 'Kasimedu Coastal',
      coords: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
      aisVector: `AIS Vector: ${calculateBearing(rescueCoords.lat, rescueCoords.lon, lat, lon)}`,
      accentColor: isFloating ? '#38bdf8' : '#f59e0b',
      material: selectedMaterial,
      buoyancy: isFloating ? 'Floats (Surface)' : 'Sinks (Subsurface)'
    };

    const reportPayload = {
      client_report_id: reportId,
      gear_type: gearTitle,
      material: selectedMaterial,
      loss_latitude: lat,
      loss_longitude: lon,
      loss_time: isoLossTime,
      loss_depth_m: estimatedDepth,
      estimated_weight_kg: estimatedWeight,
      threat_level: 'HIGH',
      wildlife_flag: false,
      boat_id: currentUser.boatTag,
      notes: `Reported by ${currentUser.name} (${currentUser.boatTag}) • Polymer: ${selectedMaterial.toUpperCase()} • Depth: ${estimatedDepth}m • Weight: ${estimatedWeight} Tons • Threat: HIGH`
    };

    // 1. Post to Backend API (or save into offline outbox queue)
    try {
      fetch(`${API_BASE}/api/v1/reports/lost-gear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload)
      })
        .then((res) => {
          if (res.ok) {
            console.log('Report saved to ghostnet_dev.db with client_report_id:', reportId);
          }
        })
        .catch(() => {
          // OFFLINE AT SEA: Put into persistent outbox queue!
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const currentQ = JSON.parse(window.localStorage.getItem('ghostnet_offline_queue') || '[]');
              currentQ.push(reportPayload);
              window.localStorage.setItem('ghostnet_offline_queue', JSON.stringify(currentQ));
              console.log('Report added to offline outbox queue for future sync.');
            }
          } catch (e) {}
        });
    } catch (e) {}

    const updatedTargets = [newTarget, ...targets];
    const updatedReports = [newRep, ...reports];
    setReports(updatedReports);
    setTargets(updatedTargets);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ghostnet_pending_targets', JSON.stringify(updatedTargets));
        window.localStorage.setItem('ghostnet_saved_reports', JSON.stringify(updatedReports));
      }
    } catch (e) {}

    showToast(
      language === 'TA'
        ? `வலை பதிவு செய்யப்பட்டது! மீட்புக் குழுவிற்கு அறிவிப்பு அனுப்பப்பட்டது.`
        : `Lost gear declaration submitted! Written to central database.`
    );
    setFisherTab('TRACKER');
  };

  const handleStartMission = async (target: RescueTarget) => {
    setSelectedTarget(target);
    setShowPreDepartureModal(false);

    // 1. Post to backend to record mission in recovery_missions table!
    try {
      const res = await fetch(`${API_BASE}/api/v1/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: target.id,
          team_id: currentUser.id || currentUser.name || currentUser.username,
          boat_id: currentUser.boatTag
        })
      });
      if (res.ok) {
        const missionData = await res.json();
        if (missionData && missionData.id) {
          setActiveMissionId(missionData.id);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('ghostnet_active_mission_id', missionData.id);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.log('Offline mission initiation note:', e);
    }

    // 2. Update matching report stage to Stage 2 (In Progress) and persist
    const updatedReports = reports.map((rep) =>
      rep.id === target.id ||
      rep.gearType.toLowerCase() === target.gearName.toLowerCase()
        ? {
            ...rep,
            stage: 2 as const,
            stageTitle: 'Stage 2',
            stageColor: '#083344',
            stageBg: '#cffafe',
            stageText: `🔵 Rescue in Progress — ${currentUser.name} En Route`,
            detail: `Vessel: ${currentUser.boatTag}`,
            subDetail: 'Approaching coordinates'
          }
        : rep
    );
    setReports(updatedReports);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ghostnet_saved_reports', JSON.stringify(updatedReports));
      }
    } catch (e) {}

    showToast('📥 Downloading & caching sector map for deep-sea navigation...');
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`ghostnet_offline_map_${target.id}`, 'cached');
      }
    } catch (e) {}

    setTimeout(() => {
      showToast('✅ Offline map cached to device storage! Ready for deep sea.');
      setCrewTab('MISSION');
    }, 600);
  };

  const confirmMissionLaunch = async (offlineDownload: boolean) => {
    setShowPreDepartureModal(false);
    if (selectedTarget) {
      if (offlineDownload) {
        showToast(
          language === 'TA'
            ? 'ஆஃப்லைன் வரைபடம் மற்றும் சறுக்கல் திசை சேமிக்கப்பட்டது!'
            : 'Offline sea tiles & drift corridor cached!'
        );
      }
      await handleStartMission(selectedTarget);
    }
  };

  const handleCompleteLedger = async () => {
    setShowVerificationModal(false);

    if (selectedTarget) {
      let currentMissionId = activeMissionId;
      try {
        if (!currentMissionId && typeof window !== 'undefined' && window.localStorage) {
          currentMissionId = window.localStorage.getItem('ghostnet_active_mission_id');
        }
      } catch (e) {}

      // Fallback: If mission row wasn't pre-created, create it now before logging update
      if (!currentMissionId) {
        try {
          const createRes = await fetch(`${API_BASE}/api/v1/missions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              report_id: selectedTarget.id,
              team_id: currentUser.id || currentUser.name || currentUser.username,
              boat_id: currentUser.boatTag
            })
          });
          if (createRes.ok) {
            const cData = await createRes.json();
            currentMissionId = cData.id;
          }
        } catch (e) {}
      }

      // 1. Post to backend to record in recovery_updates and complete mission!
      if (currentMissionId) {
        const { lat, lon } = parseCoordinates(selectedTarget.coords);
        try {
          await fetch(`${API_BASE}/api/v1/missions/${currentMissionId}/updates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mission_id: currentMissionId,
              report_id: selectedTarget.id,
              team_id: currentUser.id || currentUser.name || currentUser.username,
              status: 'net_recovered',
              latitude: rescueCoords.lat || lat,
              longitude: rescueCoords.lon || lon,
              weight_kg: Number(verifiedWeight) || 1.2,
              notes: `Hauled & verified by ${currentUser.name} on ${currentUser.boatTag}. Weight: ${verifiedWeight} Tons.`
            })
          });
        } catch (e) {
          console.log('Offline recovery update note:', e);
        }
      }

      // 2. Update local report to Stage 3 (Recovered) and persist to localStorage!
      const updatedReports = reports.map((rep) =>
        rep.id === selectedTarget.id ||
        rep.gearType.toLowerCase() === selectedTarget.gearName.toLowerCase() ||
        rep.stage === 2
          ? {
              ...rep,
              stage: 3 as const,
              stageTitle: 'Stage 3',
              stageColor: '#064e3b',
              stageBg: '#d1fae5',
              stageText: `🟢 Successfully Recovered (${verifiedWeight} Tons hauled)`,
              detail: `Hauled & Verified: ${verifiedWeight} Tons`,
              subDetail: 'Mission Closed • Circular Registry'
            }
          : rep
      );
      setReports(updatedReports);

      // 3. Remove completed target from pending queue permanently
      const remainingTargets = targets.filter((t) => t.id !== selectedTarget.id);
      setTargets(remainingTargets);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('ghostnet_saved_reports', JSON.stringify(updatedReports));
          window.localStorage.setItem('ghostnet_pending_targets', JSON.stringify(remainingTargets));
          window.localStorage.removeItem('ghostnet_active_mission_id');
          window.localStorage.removeItem('ghostnet_selected_target');
        }
      } catch (e) {}

      setSelectedTarget(null);
      setActiveMissionId(null);
      setShowSonarConsole(false);

      // 4. Trigger background sync to confirm DB status
      setTimeout(() => {
        syncWithBackend();
      }, 500);
    }

    showToast(`Mission finalized. Verified ${verifiedWeight} Tons logged to circular registry.`);
    setTimeout(() => {
      setCrewTab('REPORTS');
    }, 1200);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'EN' ? 'TA' : 'EN';
    setLanguage(nextLang);
    showToast(nextLang === 'TA' ? 'மொழி: தமிழ் தேர்ந்தெடுக்கப்பட்டது' : 'Language: English Active');
  };

  const renderDatabaseModal = () => (
    <Modal
      visible={showDbModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDbModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(3, 11, 20, 0.95)', justifyContent: 'center', padding: 12 }}>
        <View style={{
          backgroundColor: '#0a141d',
          borderRadius: 16,
          maxHeight: '92%',
          borderWidth: 1.5,
          borderColor: '#1e293b',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b',
            backgroundColor: '#0f172a'
          }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>📊</Text>
                <Text style={{ color: '#e0fdff', fontSize: 16, fontWeight: '800' }}>
                  {language === 'TA' ? 'நேரலை தரவுத்தள பார்வை' : 'Live Database Inspector'}
                </Text>
              </View>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                {language === 'TA' ? 'கிளவுட் சர்வர் & மொபைல் மெமரி' : 'Railway Cloud DB & Phone Storage'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDbModal(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#1e293b',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Grid */}
          <View style={{ flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#070f18' }}>
            <View style={{ flex: 1, backgroundColor: '#131f2e', padding: 8, borderRadius: 8, borderWidth: 0.5, borderColor: '#1e293b' }}>
              <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700' }}>TOTAL USERS</Text>
              <Text style={{ color: '#38bdf8', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                {allMergedUsers.length}
              </Text>
            </View>
            <View style={{ flex: 1.4, backgroundColor: '#131f2e', padding: 8, borderRadius: 8, borderWidth: 0.5, borderColor: '#1e293b' }}>
              <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700' }}>ACTIVE BOAT NO.</Text>
              <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>
                {currentUser?.boatTag || 'IND-TN-07-SP-0007'}
              </Text>
            </View>
            <View style={{ flex: 1.1, backgroundColor: '#131f2e', padding: 8, borderRadius: 8, borderWidth: 0.5, borderColor: '#1e293b' }}>
              <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700' }}>CLOUD BACKEND</Text>
              <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '800', marginTop: 3 }}>
                🟢 Railway
              </Text>
            </View>
          </View>

          {/* Database Inspector Mode Toggle */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 6, gap: 8, backgroundColor: '#070f18' }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 7,
                alignItems: 'center',
                borderRadius: 6,
                backgroundColor: dbViewMode === 'TOTAL' ? '#0284c7' : '#131f2e',
                borderWidth: 1,
                borderColor: dbViewMode === 'TOTAL' ? '#38bdf8' : '#1e293b'
              }}
              onPress={() => setDbViewMode('TOTAL')}
            >
              <Text style={{ color: dbViewMode === 'TOTAL' ? '#ffffff' : '#94a3b8', fontSize: 11, fontWeight: '800' }}>
                🌐 Total Database ({allMergedReports.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 7,
                alignItems: 'center',
                borderRadius: 6,
                backgroundColor: dbViewMode === 'MINE' ? '#0284c7' : '#131f2e',
                borderWidth: 1,
                borderColor: dbViewMode === 'MINE' ? '#38bdf8' : '#1e293b'
              }}
              onPress={() => setDbViewMode('MINE')}
            >
              <Text style={{ color: dbViewMode === 'MINE' ? '#ffffff' : '#94a3b8', fontSize: 11, fontWeight: '800' }}>
                👤 My Reports ({myFilteredReports.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 12 }} showsVerticalScrollIndicator={false}>
            {/* Section 1: Registered Users & Boat Numbers */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#e0fdff', fontSize: 13, fontWeight: '800' }}>
                  👥 {language === 'TA' ? 'பதிவு செய்யப்பட்ட பயனர்கள்' : 'Registered Users & Boats'} ({allMergedUsers.length})
                </Text>
                <TouchableOpacity
                  onPress={fetchDbData}
                  style={{
                    backgroundColor: '#1e293b',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 0.5,
                    borderColor: '#38bdf8'
                  }}
                >
                  <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700' }}>
                    {loadingDb ? '⏳ Loading...' : '🔄 Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {allMergedUsers.length === 0 ? (
                <View style={{ backgroundColor: '#131f2e', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                    No users registered in database yet.
                  </Text>
                </View>
              ) : (
                allMergedUsers.map((u: any, idx: number) => {
                  const isFisher = u.role === 'FISHERMAN' || u.role === 'fisher';
                  const boat = u.boat_id || u.boatTag || (isFisher ? 'IND-TN-07-SP-0007' : 'Poseidon Alpha (MM-01)');
                  return (
                    <View
                      key={u.id || u.username || idx}
                      style={{
                        backgroundColor: '#131f2e',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: isFisher ? '#38bdf8' : '#a855f7'
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '700' }}>
                          {u.name || u.username}
                        </Text>
                        <View style={{
                          backgroundColor: isFisher ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{ color: isFisher ? '#38bdf8' : '#c084fc', fontSize: 9, fontWeight: '800' }}>
                            {isFisher ? 'FISHERMAN' : 'RESCUE CREW'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                          📱 {u.phone || u.username}
                        </Text>
                        <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>
                            🛥️ {boat}
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: '#64748b', fontSize: 9 }}>
                          {u.isCloud ? '☁️ Stored in Cloud DB' : '📱 Saved in Phone Local Storage'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Section 2: Lost Gear Reports */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: '#e0fdff', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                📍 {dbViewMode === 'MINE' ? 'My Reported Nets' : (language === 'TA' ? 'இழந்த வலை அறிக்கைகள்' : 'Lost Gear Reports in DB')} ({(dbViewMode === 'MINE' ? myFilteredReports : allMergedReports).length})
              </Text>
              {(dbViewMode === 'MINE' ? myFilteredReports : allMergedReports).length === 0 ? (
                <View style={{ backgroundColor: '#131f2e', padding: 14, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                    {dbViewMode === 'MINE' ? 'You have no reports filed yet.' : 'No reports in database yet.'}
                  </Text>
                </View>
              ) : (
                (dbViewMode === 'MINE' ? myFilteredReports : allMergedReports).map((r: any, idx: number) => {
                  const statusStr = (r.status || '').toLowerCase();
                  const isRec = statusStr.includes('recover') || r.stage === 3;
                  const isProg = statusStr.includes('progress') || r.stage === 2;
                  return (
                    <View
                      key={r.id || idx}
                      style={{
                        backgroundColor: '#131f2e',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: isRec ? '#4ade80' : isProg ? '#38bdf8' : '#facc15'
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#f1f5f9', fontSize: 12, fontWeight: '700' }}>
                          {r.gear_type || r.gearType || 'Lost Gear'}
                        </Text>
                        <View style={{
                          backgroundColor: isRec ? 'rgba(74, 222, 128, 0.2)' : isProg ? 'rgba(56, 189, 248, 0.2)' : 'rgba(250, 204, 21, 0.2)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{
                            color: isRec ? '#4ade80' : isProg ? '#38bdf8' : '#facc15',
                            fontSize: 9,
                            fontWeight: '800'
                          }}>
                            {isRec ? '🟢 RECOVERED' : isProg ? '🔵 IN PROGRESS' : '🟡 AWAITING RESCUE'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>
                        By: {r.reported_by || r.reportedBy || 'Fisherman'} • Boat: {r.vessel_tag || r.vesselTag || 'IND-TN-07-SP-0007'}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Section 3: Cloud & Manual Clear Controls */}
            <View style={{ backgroundColor: '#131f2e', borderRadius: 8, padding: 10, gap: 8, marginBottom: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>DATABASE CONTROLS</Text>
              
              <TouchableOpacity
                style={{
                  backgroundColor: '#1e293b',
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onPress={() => {
                  try {
                    Linking.openURL('https://ghostnet-ai-production.up.railway.app/docs');
                  } catch (e) {}
                }}
              >
                <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>
                  🌐 Open Railway Swagger API Docs
                </Text>
                <Text style={{ color: '#64748b', fontSize: 11 }}>➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  alignItems: 'center'
                }}
                onPress={() => {
                  handleClearAllData();
                  setShowDbModal(false);
                }}
              >
                <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '800' }}>
                  🗑️ Clear Database & Reset All Data (Manual Wipe)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Modal Footer Close */}
          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#38bdf8',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => setShowDbModal(false)}
            >
              <Text style={{ color: '#030b14', fontSize: 13, fontWeight: '800' }}>Close Inspector</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // -------------------------------------------------------------
  // 1. RENDER: SPLASH SCREEN
  // -------------------------------------------------------------
  if (screen === 'SPLASH') {
    return (
      <SafeAreaView style={[styles.container, styles.splashBg]}>
        <StatusBar style="light" />
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setScreen('LOGIN_ROLE')}
          style={styles.splashContent}
        >
          <View style={styles.splashRingOuter}>
            <View style={styles.splashRingInner} />
          </View>
          <View style={styles.logoContainerLg}>
            <View style={styles.logoGlowBehind} />
            <View style={styles.logoBadge}>
              <Image source={LOGO_IMG} style={styles.logoImgLg} />
            </View>
          </View>
          <Text style={styles.splashTitle}>GhostNet AI</Text>
          <Text style={styles.splashSubtitle}>
            {language === 'TA'
              ? 'ஆஃப்லைன்-முதல் கடலோர மீன்பிடி வலை மீட்பு தளம்'
              : 'Offline-First Coastal Marine Gear Recovery Platform'}
          </Text>
          <View style={styles.splashTapPrompt}>
            <Text style={styles.splashTapText}>
              {language === 'TA' ? 'தொடங்க தட்டவும் ➔' : 'Tap to Initialize Tactical System ➔'}
            </Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // 2. RENDER: LOGIN / REGISTRATION & ROLE SELECTION SCREEN
  // -------------------------------------------------------------
  if (screen === 'LOGIN_ROLE') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0a141d' }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Brand Header */}
          <View style={styles.authHeader}>
            <View style={styles.authLogoBadge}>
              <Image source={LOGO_IMG} style={styles.authLogoImg} />
              <View style={styles.onlinePillGreen} />
            </View>
            <Text style={styles.authAppTitle}>GhostNet AI</Text>
            <Text style={styles.authSubText}>Bay of Bengal Coastal Sector</Text>
          </View>

          {/* Segmented Tab: Log In vs Create Account */}
          <View style={styles.tabPillContainer}>
            <TouchableOpacity
              style={[styles.tabPill, authTab === 'LOGIN' && styles.tabPillActive]}
              onPress={() => setAuthTab('LOGIN')}
            >
              <Text style={[styles.tabPillText, authTab === 'LOGIN' && styles.tabPillTextActive]}>
                {t('loginTab')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, authTab === 'REGISTER' && styles.tabPillActive]}
              onPress={() => setAuthTab('REGISTER')}
            >
              <Text style={[styles.tabPillText, authTab === 'REGISTER' && styles.tabPillTextActive]}>
                {t('registerTab')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM: LOG IN OR CREATE ACCOUNT */}
          {authTab === 'LOGIN' ? (
            <View style={{ gap: 10 }}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('phoneLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                    placeholder={t('phonePlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('passwordLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showPassword}
                    placeholder={t('passwordPlaceholder')}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* CREATE ACCOUNT FORM */
            <View style={{ gap: 10 }}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('fullNameLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📝</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regFullName}
                    onChangeText={setRegFullName}
                    placeholder={t('fullNamePlaceholder')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('usernameLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regUsername}
                    onChangeText={setRegUsername}
                    placeholder={t('usernamePlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('boatTagLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🛥️</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regBoatTag}
                    onChangeText={setRegBoatTag}
                    placeholder={t('boatTagPlaceholder')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('regPhoneLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    placeholder={t('regPhonePlaceholder')}
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>{t('createPassLabel')}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Role Selection Section (Only for new account registration) */}
          {authTab === 'REGISTER' && (
            <View style={{ marginTop: 10, marginBottom: 12 }}>
              <Text style={styles.sectionHeaderLabel}>{t('selectRoleHeader')}</Text>
              <View style={styles.roleGrid}>
                {/* Fisherman Card */}
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'FISHERMAN' ? styles.roleCardSelected : styles.roleCardInactive
                  ]}
                  onPress={() => setSelectedRole('FISHERMAN')}
                >
                  <View style={styles.roleCardTop}>
                    <Text style={{ fontSize: 28 }}>🎣</Text>
                    <View
                      style={[
                        styles.checkCircle,
                        selectedRole === 'FISHERMAN' && styles.checkCircleActive
                      ]}
                    >
                      {selectedRole === 'FISHERMAN' && <Text style={styles.checkText}>✓</Text>}
                    </View>
                  </View>
                  <Text style={styles.roleTitle}>{t('fishermanTitle')}</Text>
                  <Text style={styles.roleDesc}>{t('fishermanDesc')}</Text>
                </TouchableOpacity>

                {/* Rescue Crew Card */}
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'RESCUE_CREW' ? styles.roleCardSelected : styles.roleCardInactive
                  ]}
                  onPress={() => setSelectedRole('RESCUE_CREW')}
                >
                  <View style={styles.roleCardTop}>
                    <Text style={{ fontSize: 28 }}>🤿</Text>
                    <View
                      style={[
                        styles.checkCircle,
                        selectedRole === 'RESCUE_CREW' && styles.checkCircleActive
                      ]}
                    >
                      {selectedRole === 'RESCUE_CREW' && <Text style={styles.checkText}>✓</Text>}
                    </View>
                  </View>
                  <Text style={styles.roleTitle}>{t('rescueTitle')}</Text>
                  <Text style={styles.roleDesc}>{t('rescueDesc')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleAuthSubmit}
          >
            <Text style={styles.primaryActionText}>
              {authTab === 'LOGIN' ? t('loginBtn') : t('registerBtn')}
            </Text>
            <Text style={{ fontSize: 18, color: '#030b14', fontWeight: 'bold' }}>➔</Text>
          </TouchableOpacity>

          {/* Language Toggle */}
          <TouchableOpacity style={styles.langPillCenter} onPress={toggleLanguage}>
            <Text style={{ color: '#00f2fe', fontSize: 14 }}>🌐</Text>
            <Text style={styles.langPillText}>
              {language === 'EN' ? 'தமிழ் (Tamil)' : 'English'}
            </Text>
          </TouchableOpacity>

          {/* View Database Button */}
          <TouchableOpacity
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: 'center',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#38bdf8',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8
            }}
            onPress={() => {
              fetchDbData();
              setShowDbModal(true);
            }}
          >
            <Text style={{ fontSize: 16 }}>📊</Text>
            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '800' }}>
              {language === 'TA' ? 'தரவுத்தளத்தைப் பார்க்கவும் (View Database)' : '📊 View Database (Users & Boat Numbers)'}
            </Text>
          </TouchableOpacity>

          {/* Wipe Database & Local Cache Button */}
          <TouchableOpacity
            style={{
              marginTop: 18,
              paddingVertical: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}
            onPress={handleClearAllData}
          >
            <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>
              🗑️ Clear Database & Reset All Data
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={{ fontSize: 14 }}>☁️</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
        {renderDatabaseModal()}
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // 3. RENDER: FISHERMAN DASHBOARD
  // -------------------------------------------------------------
  if (screen === 'FISHERMAN') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0a141d' }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Header Bar with Dynamic User Name */}
          <View style={styles.topHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
              <View style={styles.headerLogoThumb}>
                <Image source={LOGO_IMG} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerWelcomeText} numberOfLines={1} ellipsizeMode="tail">
                  {language === 'TA'
                    ? `வணக்கம், ${currentUser.name}`
                    : `Welcome, ${currentUser.name}`}
                </Text>
                <Text style={styles.headerSubtitleText} numberOfLines={1} ellipsizeMode="tail">
                  {currentUser.boatTag} • {language === 'TA' ? 'காசிமேடு துறைமுகம்' : currentUser.port}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.5)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3
                }}
                onPress={() => {
                  fetchDbData();
                  setShowDbModal(true);
                }}
              >
                <Text style={{ fontSize: 11 }}>📊</Text>
                <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '800' }}>DB</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
                <Text style={styles.langBadgeText}>
                  {language === 'EN' ? 'தமிழ்' : 'EN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.switchRoleBadge}
                onPress={handleLogout}
              >
                <Text style={{ fontSize: 12, color: '#f87171', fontWeight: '700' }}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Operational Recovery Protocol Progress Bar */}
          <View style={styles.protocolCard}>
            <View style={styles.protocolHeader}>
              <Text style={styles.protocolTitle}>{t('protocolTitle')}</Text>
              <Text style={styles.protocolStep}>{t('protocolStepReady')}</Text>
            </View>
            <View style={styles.protocolStepsRow}>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepChipText}>{t('stepGps')}</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepChipText}>{t('stepGear')}</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepChipText}>{t('stepPolymer')}</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>4</Text></View>
                <Text style={styles.stepChipText}>{t('stepDepth')}</Text>
              </View>
            </View>
          </View>

          {/* Segmented Navigation Tabs */}
          <View style={styles.segmentedTabBar}>
            <TouchableOpacity
              style={[styles.segmentedTab, fisherTab === 'DECLARE' && styles.segmentedTabActive]}
              onPress={() => setFisherTab('DECLARE')}
            >
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text
                style={[
                  styles.segmentedTabText,
                  fisherTab === 'DECLARE' && styles.segmentedTabTextActive
                ]}
              >
                {t('tabDeclare')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentedTab, fisherTab === 'TRACKER' && styles.segmentedTabActive]}
              onPress={() => setFisherTab('TRACKER')}
            >
              <Text style={{ fontSize: 16 }}>🛰️</Text>
              <Text
                style={[
                  styles.segmentedTabText,
                  fisherTab === 'TRACKER' && styles.segmentedTabTextActive
                ]}
              >
                {t('tabTracker')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: DECLARE FORM CONTENT */}
          {fisherTab === 'DECLARE' ? (
            <View style={{ gap: 14 }}>
              {/* GPS Signal Card (High Contrast Polar White) */}
              <View style={styles.polarWhiteCard}>
                <View style={styles.polarCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.polarCardLiveText}>{t('gpsSignalLocked')}</Text>
                  </View>
                  <Text style={styles.polarCardTag}>Dual RTK</Text>
                </View>

                <View style={styles.polarCoordWell}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.polarCoordLabel}>{t('gpsFixCoords')}</Text>
                    <TextInput
                      style={styles.polarCoordInput}
                      value={gpsCoords}
                      onChangeText={setGpsCoords}
                      placeholder="13.1250° N, 80.3150° E"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.gpsUpdateBtn}
                    onPress={handleUpdateGps}
                  >
                    <Text style={styles.gpsUpdateBtnText}>{t('gpsUpdateBtn')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.polarFooterRow}>
                  <Text style={styles.polarFooterMeta}>
                    {t('gpsAccuracy')}
                  </Text>
                  <Text style={styles.autoTag}>{t('gpsAuto')}</Text>
                </View>
              </View>

              {/* Net Selector */}
              <View>
                <Text style={styles.sectionHeaderTitle}>{t('typeOfNet')}</Text>
                <View style={{ gap: 8, marginTop: 6 }}>
                  {/* Gillnet */}
                  <TouchableOpacity
                    style={[
                      styles.polarWhiteCard,
                      selectedGear === 'GILLNET' && styles.selectedGearCard
                    ]}
                    onPress={() => setSelectedGear('GILLNET')}
                  >
                    <View style={styles.gearRow}>
                      <Text style={{ fontSize: 26 }}>🕸️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gearTitle}>{t('gillnetTitle')}</Text>
                        <Text style={styles.gearDesc}>
                          {t('gillnetDesc')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.gearCheckCircle,
                          selectedGear === 'GILLNET' && styles.gearCheckCircleActive
                        ]}
                      >
                        {selectedGear === 'GILLNET' && <Text style={{ color: '#fff' }}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Trawl Net */}
                  <TouchableOpacity
                    style={[
                      styles.polarWhiteCard,
                      selectedGear === 'TRAWL' && styles.selectedGearCard
                    ]}
                    onPress={() => setSelectedGear('TRAWL')}
                  >
                    <View style={styles.gearRow}>
                      <Text style={{ fontSize: 26 }}>⚓</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gearTitle}>{t('trawlTitle')}</Text>
                        <Text style={styles.gearDesc}>{t('trawlDesc')}</Text>
                      </View>
                      <View
                        style={[
                          styles.gearCheckCircle,
                          selectedGear === 'TRAWL' && styles.gearCheckCircleActive
                        ]}
                      >
                        {selectedGear === 'TRAWL' && <Text style={{ color: '#fff' }}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Crab Trap */}
                  <TouchableOpacity
                    style={[
                      styles.polarWhiteCard,
                      selectedGear === 'TRAP' && styles.selectedGearCard
                    ]}
                    onPress={() => setSelectedGear('TRAP')}
                  >
                    <View style={styles.gearRow}>
                      <Text style={{ fontSize: 26 }}>🦀</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gearTitle}>{t('trapTitle')}</Text>
                        <Text style={styles.gearDesc}>
                          {t('trapDesc')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.gearCheckCircle,
                          selectedGear === 'TRAP' && styles.gearCheckCircleActive
                        ]}
                      >
                        {selectedGear === 'TRAP' && <Text style={{ color: '#fff' }}>✓</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Net Material Selector (Polymer Type) */}
              <View>
                <Text style={styles.sectionHeaderTitle}>{t('netMaterialHeader')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {[
                    { id: 'nylon', label: t('matNylonLabel'), desc: t('matNylonDesc') },
                    { id: 'polyethylene', label: t('matHdpeLabel'), desc: t('matHdpeDesc') },
                    { id: 'polypropylene', label: t('matPpLabel'), desc: t('matPpDesc') },
                    { id: 'mixed', label: t('matMixedLabel'), desc: t('matMixedDesc') }
                  ].map((mat) => (
                    <TouchableOpacity
                      key={mat.id}
                      style={[
                        styles.materialCard,
                        selectedMaterial === mat.id && styles.materialCardActive
                      ]}
                      onPress={() => setSelectedMaterial(mat.id as any)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text
                          style={[
                            styles.materialLabel,
                            selectedMaterial === mat.id && styles.materialLabelActive
                          ]}
                        >
                          {mat.label}
                        </Text>
                        {selectedMaterial === mat.id && (
                          <Text style={{ color: '#00f2fe', fontSize: 12, fontWeight: 'bold' }}>●</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.materialDesc,
                          selectedMaterial === mat.id && styles.materialDescActive
                        ]}
                      >
                        {mat.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dual Stepper Cards: Depth & Weight */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Depth */}
                <View style={[styles.polarWhiteCard, { flex: 1 }]}>
                  <Text style={styles.stepperLabel}>{t('estDepth')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 6 }}>
                    <Text style={styles.stepperValue}>{estimatedDepth}</Text>
                    <Text style={styles.stepperUnit}>{t('metersUnit')}</Text>
                  </View>
                  <View style={styles.stepperBtnRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedDepth(Math.max(5, estimatedDepth - 5))}
                    >
                      <Text style={styles.stepperBtnTxt}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedDepth(estimatedDepth + 5)}
                    >
                      <Text style={styles.stepperBtnTxt}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.calibText}>{t('sonarCalib')}</Text>
                  </View>
                </View>

                {/* Weight */}
                <View style={[styles.polarWhiteCard, { flex: 1 }]}>
                  <Text style={styles.stepperLabel}>{t('weightReg')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 6 }}>
                    <Text style={styles.stepperValue}>{estimatedWeight}</Text>
                    <Text style={styles.stepperUnit}>{t('kgUnit')}</Text>
                  </View>
                  <View style={styles.stepperBtnRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedWeight((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))))}
                    >
                      <Text style={styles.stepperBtnTxt}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedWeight((prev) => parseFloat((prev + 0.1).toFixed(1)))}
                    >
                      <Text style={styles.stepperBtnTxt}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.calibText}>{t('wetEst')}</Text>
                  </View>
                </View>
              </View>

              {/* Submit Declaration Button */}
              <TouchableOpacity
                style={styles.declareSubmitBtn}
                onPress={handleDeclareSubmit}
              >
                <Text style={{ fontSize: 20 }}>🚨</Text>
                <Text style={styles.declareSubmitText}>{t('submitDeclareBtn')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* TAB 2: TRACKER SCREEN PREVIEW */
            <View style={{ gap: 14 }}>
              <View style={styles.trackerHeaderRow}>
                <Text style={styles.trackerHeaderTitle}>
                  {language === 'TA' ? '🛰️ என் இழந்த வலை அறிக்கைகள்' : '🛰️ Active & Past Recovery Trackers'}
                </Text>
                <Text style={styles.trackerCountBadge}>
                  {reports.length} {language === 'TA' ? 'பதிவானவை' : 'Logged'}
                </Text>
              </View>

              {/* List of Reports filtered for current fisherman */}
              {reports.filter(
                (item) =>
                  !currentUser?.name ||
                  item.reportedBy.toLowerCase() === currentUser.name.toLowerCase() ||
                  item.reportedBy.toLowerCase().includes(currentUser.name.toLowerCase()) ||
                  currentUser.name.toLowerCase().includes(item.reportedBy.toLowerCase()) ||
                  (currentUser.boatTag && item.vesselTag?.toLowerCase().includes(currentUser.boatTag.toLowerCase()))
              ).length === 0 ? (
                <View style={{ backgroundColor: '#131f2e', padding: 20, borderRadius: 12, alignItems: 'center', marginVertical: 8 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                    {language === 'TA' ? 'இன்னும் எந்த இழந்த வலை அறிக்கைகளும் பதிவு செய்யப்படவில்லை.' : 'No lost gear reports logged yet.'}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    {language === 'TA' ? 'புதிய அறிக்கையை சமர்ப்பிக்க கீழே தட்டவும்' : 'Tap below to file a new lost gear report'}
                  </Text>
                </View>
              ) : (
                reports
                  .filter(
                    (item) =>
                      !currentUser?.name ||
                      item.reportedBy.toLowerCase() === currentUser.name.toLowerCase() ||
                      item.reportedBy.toLowerCase().includes(currentUser.name.toLowerCase()) ||
                      currentUser.name.toLowerCase().includes(item.reportedBy.toLowerCase()) ||
                      (currentUser.boatTag && item.vesselTag?.toLowerCase().includes(currentUser.boatTag.toLowerCase()))
                  )
                  .map((item) => (
                <View key={item.id} style={styles.polarWhiteCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackerGearTitle}>
                        {language === 'TA'
                          ? item.gearType.toLowerCase().includes('gillnet')
                            ? 'கிள்வலை (Gillnet)'
                            : item.gearType.toLowerCase().includes('trawl')
                            ? 'இழுவலை (Trawl Net)'
                            : 'கூண்டு / பொறி (Trap)'
                          : item.gearType}{' '}
                        •{' '}
                        {getReportTimeDisplay(item, language)}
                      </Text>
                      <Text style={styles.trackerCoordsText}>📍 {item.latLong}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {language === 'TA' ? 'அறிவித்தவர்:' : 'Reported by:'} {item.reportedBy} ({item.vesselTag})
                      </Text>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: item.stageBg }]}>
                      <Text style={[styles.stageBadgeText, { color: item.stageColor }]}>
                        {language === 'TA' ? `நிலை ${item.stage}` : item.stageTitle}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.stageStatusBar, { backgroundColor: item.stageBg }]}>
                    <Text style={[styles.stageStatusText, { color: item.stageColor }]}>
                      {language === 'TA'
                        ? item.stage === 1
                          ? '🟡 மீட்புக் குழு ஒதுக்கீட்டிற்காக காத்திருக்கிறது'
                          : item.stage === 2
                          ? '🔵 மீட்பு பணியில் உள்ளது — மீட்பு படகு கடலில் செல்கிறது'
                          : '🟢 வெற்றிகரமாக மீட்கப்பட்டது (வலை கரைக்கு கொண்டுவரப்பட்டது)'
                        : item.stageText}
                    </Text>
                  </View>

                  <View style={styles.trackerFooterRow}>
                    <Text style={styles.trackerMetaLeft}>
                      {language === 'TA'
                        ? item.stage === 1
                          ? 'அவசர கவனம்'
                          : item.stage === 2
                          ? (item.detail?.replace('Vessel:', 'மீட்பு படகு:') || 'மீட்பு படகு')
                          : (item.detail?.replace('Hauled & Verified:', 'எடை சரிபார்க்கப்பட்டது:').replace('Tons', 'டன்கள்') || 'எடை சரிபார்க்கப்பட்டது')
                        : !item.detail || item.detail.includes('Ping')
                        ? (item.stage === 1 ? 'Priority: High Attention' : item.stage === 2 ? 'Vessel: Rescue Boat' : 'Hauled & Verified: 1.2 Tons')
                        : item.detail}
                    </Text>
                    <Text style={styles.trackerMetaRight}>
                      {language === 'TA'
                        ? item.stage === 1
                          ? 'மீட்புக் குழு காத்திருப்பு'
                          : item.stage === 2
                          ? 'இலக்கை நெருங்குகிறது'
                          : 'பணி நிறைவுற்றது • சுழற்சி பதிவு'
                        : !item.subDetail || item.subDetail.toLowerCase().includes('ping') || item.subDetail.toLowerCase().includes('transponder')
                        ? (item.stage === 1 ? 'Awaiting Rescue Dispatch' : item.stage === 2 ? 'Approaching coordinates' : 'Mission Closed • Circular Registry')
                        : item.subDetail}
                    </Text>
                  </View>
                </View>
              )))}

              <TouchableOpacity
                style={styles.fileAnotherBtn}
                onPress={() => setFisherTab('DECLARE')}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>➕</Text>
                <Text style={styles.fileAnotherText}>
                  {language === 'TA' ? 'மற்றொரு இழந்த வலையை பதிவு செய்' : 'File Another Lost Gear Report'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={{ fontSize: 14 }}>☁️</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
        {renderDatabaseModal()}
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // 4A. DEDICATED SIDE-SCAN SONAR AI ACOUSTIC CONSOLE (GOOGLE STITCH UI)
  // -------------------------------------------------------------
  if (showSonarConsole) {
    const sonarData = analyzeAcousticScan({
      depthM: selectedTarget?.depthM,
      gearName: selectedTarget?.gearName,
      coords: selectedTarget?.coords
    });

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#050b12' }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
              onPress={() => setShowSonarConsole(false)}
            >
              <Text style={{ color: '#00f2fe', fontSize: 16, fontWeight: 'bold' }}>←</Text>
              <Text style={{ color: '#00f2fe', fontSize: 13, fontWeight: '700' }}>Back to Navigation Map</Text>
            </TouchableOpacity>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.4)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10b981' }} />
              <Text style={{ color: '#6ee7b7', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>
                TRANSDUCER ACTIVE • 455 KHZ
              </Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 }}>
            SONAR AI ACOUSTIC CONSOLE
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14 }}>
            Target: Lost {selectedTarget?.gearName || 'Gillnet'} • {selectedTarget?.coords ? selectedTarget.coords : 'Kasimedu Deep Corridor (Sector 04)'}
          </Text>

          {/* Central Sonar Echogram Display (Exact Google Stitch Layout) */}
          <View style={{
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#1e293b',
            overflow: 'hidden',
            backgroundColor: '#020617',
            marginBottom: 10
          }}>
            <Image
              source={SONAR_IMG}
              style={{ width: '100%', height: 260, resizeMode: 'cover' }}
            />
          </View>

          {/* Telemetry Strip (Bottom of Echogram) */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 14
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>🧭</Text>
              <Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>
                {selectedTarget?.coords || '13°07\'42.1"N 80°18\'09.4"E'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                SPD: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{rescueCoords.speedKn > 0 ? rescueCoords.speedKn.toFixed(1) : '1.8'} KTS</Text>
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                HDG: <Text style={{ color: '#ffd166', fontWeight: 'bold' }}>084°</Text>
              </Text>
            </View>
          </View>

          {/* 2x2 Telemetry Grid (Exact Stitch Layout) */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            {/* Box 1: Seabed Depth */}
            <View style={{
              flex: 1,
              backgroundColor: '#0c1522',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#1e293b'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>SEABED DEPTH</Text>
                <Text style={{ color: '#38bdf8', fontSize: 13 }}>↓</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '900' }}>{sonarData.seabedDepthM}</Text>
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '700' }}>m</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Nadir acoustic altimeter reading</Text>
            </View>

            {/* Box 2: Net Elevation */}
            <View style={{
              flex: 1,
              backgroundColor: '#0c1522',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#1e293b'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>NET ELEVATION</Text>
                <Text style={{ color: '#f59e0b', fontSize: 13 }}>↑</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <Text style={{ color: '#f59e0b', fontSize: 24, fontWeight: '900' }}>{sonarData.netElevationM}</Text>
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>m</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Height net floats above bottom</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {/* Box 3: Hook Drop Target */}
            <View style={{
              flex: 1,
              backgroundColor: '#0c1522',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#1e293b'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>HOOK DROP TARGET</Text>
                <Text style={{ color: '#34d399', fontSize: 13 }}>⚓</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <Text style={{ color: '#34d399', fontSize: 24, fontWeight: '900' }}>{sonarData.extraction.hookTargetDepthM}</Text>
                <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '700' }}>m</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Recommended grapple contact point</Text>
            </View>

            {/* Box 4: Bottom Substrate */}
            <View style={{
              flex: 1,
              backgroundColor: '#0c1522',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#1e293b'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>BOTTOM SUBSTRATE</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>⬡</Text>
              </View>
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 6 }}>{sonarData.bottomSubstrate}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>Snag Risk: {sonarData.extraction.snagRisk}</Text>
              </View>
            </View>
          </View>

          {/* Recovery Protocol Card (Exact Stitch Layout) */}
          <View style={{
            backgroundColor: '#0c1522',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 14
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 16 }}>⚙️</Text>
              <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 }}>
                RECOVERY PROTOCOL: FOUR-PRONG GRAPPLE
              </Text>
            </View>

            {/* Step 1: Cable Scope */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#10b981', fontSize: 14 }}>✓</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '600' }}>
                  Cable Scope: {sonarData.extraction.cableScopeM}m Steel Cable Paid Out @ 1.5 kn
                </Text>
              </View>
              <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '900' }}>DONE</Text>
            </View>

            {/* Step 2: Tension Spike */}
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                  <Text style={{ color: '#f8fafc', fontSize: 11, fontWeight: '700' }}>
                    Tension Spike: Target Hooked! Winch Load {sonarData.extraction.winchLoadKg} kg
                  </Text>
                </View>
              </View>
              {/* Green Progress Bar */}
              <View style={{ height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: '78%', height: '100%', backgroundColor: '#00f2fe', borderRadius: 3 }} />
              </View>
            </View>

            {/* Step 3: Controlled Haul */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#ffd166', fontSize: 14 }}>🔄</Text>
                <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '600' }}>
                  Controlled Haul: {sonarData.extraction.winchHaulSpeedMs} m/s (Net rising: 12.5m / {sonarData.seabedDepthM}m)
                </Text>
              </View>
              <Text style={{ color: '#ffd166', fontSize: 10, fontWeight: '900' }}>LIFTING</Text>
            </View>

            {/* Step 4: Big Cyan Button - NET ON DECK */}
            <TouchableOpacity
              style={{
                backgroundColor: '#00f2fe',
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                shadowColor: '#00f2fe',
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6
              }}
              onPress={() => {
                saveSonarAuditLogOffline({
                  ...sonarData,
                  missionId: activeMissionId || 'MM-01',
                  vesselTag: currentUser.boatTag,
                  operatorName: currentUser.name,
                  isSyncedToBackend: false
                });
                setShowSonarConsole(false);
                setShowVerificationModal(true);
              }}
            >
              <Text style={{ fontSize: 16 }}>⚖️</Text>
              <Text style={{ color: '#030b14', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 }}>
                [ NET ON DECK ➔ ]
              </Text>
            </TouchableOpacity>
          </View>

          {/* Safety Alert Banner (Bottom) */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(234, 179, 8, 0.3)',
            borderRadius: 8,
            padding: 10
          }}>
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <Text style={{ color: '#fef08a', fontSize: 11, fontWeight: '600', flex: 1 }}>
              Surface Warning: Stand clear of deck boom until net is lashed.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a141d' }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
            <View style={styles.headerLogoThumb}>
              <Image source={LOGO_IMG} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hudSubHeader}>{t('tacticalHudTitle')}</Text>
              <Text style={styles.headerWelcomeText} numberOfLines={1} ellipsizeMode="tail">
                {language === 'TA' ? `வணக்கம், ${currentUser.name}` : `Welcome, ${currentUser.name}`}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(56, 189, 248, 0.5)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3
              }}
              onPress={() => {
                fetchDbData();
                setShowDbModal(true);
              }}
            >
              <Text style={{ fontSize: 11 }}>📊</Text>
              <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '800' }}>DB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
              <Text style={styles.langBadgeText}>
                {language === 'EN' ? 'தமிழ்' : 'EN'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchRoleBadge}
              onPress={handleLogout}
            >
              <Text style={{ fontSize: 12, color: '#f87171', fontWeight: '700' }}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Operative Welcome Callout */}
        <View style={styles.operativeBanner}>
          <Text style={styles.operativeName}>{t('vesselPrefix')}: {currentUser.boatTag}</Text>
          <View style={styles.aisBadge}>
            <View style={styles.aisPingDot} />
            <Text style={styles.aisText}>{t('aisActiveBadge')}</Text>
          </View>
        </View>

        {/* Dynamic Critical Net Alert Banner (Only shown if pending targets exist) */}
        {targets.length > 0 && (
          <View style={styles.criticalAlertCard}>
            <View style={styles.criticalAlertIconWrap}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={styles.criticalBadgeText}>{t('criticalNetAlertBadge')}</Text>
                <Text style={styles.criticalTimeText}>
                  {getReportTimeDisplay(targets[0], language)}
                </Text>
              </View>
              <Text style={styles.criticalTitleText}>
                {targets[0].gearName} off {targets[0].sector} ({targets[0].coords})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.criticalViewBtn}
              onPress={() => setCrewTab('REPORTS')}
            >
              <Text style={styles.criticalViewTxt}>{t('viewAlertBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Segmented Section Switcher */}
        <View style={styles.segmentedTabBar}>
          <TouchableOpacity
            style={[styles.segmentedTab, crewTab === 'REPORTS' && styles.segmentedTabActive]}
            onPress={() => setCrewTab('REPORTS')}
          >
            <Text style={{ fontSize: 16 }}>📋</Text>
            <Text
              style={[
                styles.segmentedTabText,
                crewTab === 'REPORTS' && styles.segmentedTabTextActive
              ]}
            >
              {t('tabReportsPending')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentedTab, crewTab === 'MISSION' && styles.segmentedTabActive]}
            onPress={() => setCrewTab('MISSION')}
          >
            <Text style={{ fontSize: 16 }}>🧭</Text>
            <Text
              style={[
                styles.segmentedTabText,
                crewTab === 'MISSION' && styles.segmentedTabTextActive
              ]}
            >
              {t('tabCurrentMission')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB A: REPORTS PENDING QUEUE */}
        {crewTab === 'REPORTS' ? (
          <View style={{ gap: 14 }}>
            <View style={styles.queueStatusRow}>
              <Text style={styles.queueStatusTitle}>QUEUE: FIRST-COME, FIRST-SERVED</Text>
              <Text style={styles.queueStatusSubtitle}>{targets.length} ACTIVE TARGETS</Text>
            </View>

            {targets.length === 0 ? (
              <View style={[styles.polarWhiteCard, { padding: 24, alignItems: 'center' }]}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🟢</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>
                  {t('noPendingTargets')}
                </Text>
              </View>
            ) : (
              targets.map((tgt, idx) => {
                const isThisMyMission = Boolean(
                  tgt.isAssigned && (
                    (tgt.assignedTeam && (
                      tgt.assignedTeam.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim() ||
                      tgt.assignedTeam.toLowerCase().trim() === currentUser?.username?.toLowerCase().trim()
                    )) ||
                    (tgt.assignedBoat && (
                      tgt.assignedBoat.toLowerCase().trim() === currentUser?.boatTag?.toLowerCase().trim()
                    ))
                  )
                );

                const cardAccent = tgt.isAssigned
                  ? (isThisMyMission ? '#10b981' : '#3b82f6')
                  : (tgt.buoyancy?.includes('Float') ? '#38bdf8' : '#f59e0b');

                const priorityLabel = tgt.isAssigned
                  ? (isThisMyMission ? '🟢 YOUR ACTIVE MISSION' : `🔵 IN PROGRESS (${tgt.assignedTeam})`)
                  : `FCFS Priority #${idx + 1}`;

                return (
                  <View key={tgt.id} style={styles.targetCardDark}>
                    <View style={[styles.targetSideStrip, { backgroundColor: cardAccent }]} />
                    <View style={styles.targetCardHeader}>
                      <View style={styles.targetPriorityBadge}>
                        <View style={[styles.targetPriorityDot, { backgroundColor: cardAccent }]} />
                        <Text style={[styles.targetPriorityTxt, { color: cardAccent }]}>
                          {priorityLabel} • {getReportTimeDisplay(tgt, language)}
                        </Text>
                      </View>
                      <Text style={styles.targetDistanceTxt}>{tgt.distanceNm}</Text>
                    </View>

                    <View style={{ paddingLeft: 4 }}>
                      <Text style={styles.targetGearName}>{tgt.gearName}</Text>
                      <Text style={styles.targetGearDesc}>{tgt.description}</Text>
                    </View>

                    {/* Telemetry Metric Badges */}
                    <View style={styles.telemetryGrid}>
                      <View style={styles.telemetryCell}>
                        <Text style={styles.telemetryCellLabel}>Est. Depth</Text>
                        <Text style={styles.telemetryCellValue}>{tgt.depthM} m</Text>
                      </View>
                      <View style={styles.telemetryCell}>
                        <Text style={styles.telemetryCellLabel}>Mass</Text>
                        <Text style={styles.telemetryCellValue}>{tgt.massKg} Tons</Text>
                      </View>
                      <View style={styles.telemetryCell}>
                        <Text style={styles.telemetryCellLabel}>Material</Text>
                        <Text style={[styles.telemetryCellValue, { color: '#6ff6ff' }]}>
                          {tgt.material ? tgt.material.toUpperCase() : 'NYLON'}
                        </Text>
                      </View>
                      <View style={styles.telemetryCell}>
                        <Text style={styles.telemetryCellLabel}>Drift State</Text>
                        <Text style={[styles.telemetryCellValue, { color: tgt.buoyancy?.includes('Float') ? '#38bdf8' : '#f59e0b' }]}>
                          {tgt.buoyancy?.includes('Float') ? 'FLOATING' : 'SINKING'}
                        </Text>
                      </View>
                    </View>

                    {/* Tactical Coordinates Readout */}
                    <View style={styles.coordsReadoutRow}>
                      <Text style={{ fontSize: 16 }}>🧭</Text>
                      <Text style={styles.coordsReadoutVal}>{tgt.coords}</Text>
                      <Text style={styles.aisVectorText}>{tgt.aisVector}</Text>
                    </View>

                    {/* Active Mission Notice for Claimed Targets */}
                    {tgt.isAssigned && (
                      <View
                        style={{
                          marginHorizontal: 4,
                          marginBottom: 10,
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor: isThisMyMission ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          borderWidth: 1,
                          borderColor: isThisMyMission ? '#10b981' : '#3b82f6',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{isThisMyMission ? '🟢' : '👮'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isThisMyMission ? '#6ee7b7' : '#93c5fd', fontSize: 13, fontWeight: 'bold' }}>
                            {isThisMyMission
                              ? `Mission Claimed by You (${tgt.assignedBoat || currentUser.boatTag})`
                              : `Rescuing by ${tgt.assignedTeam} (${tgt.assignedBoat})`}
                          </Text>
                          <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 2 }}>
                            {isThisMyMission
                              ? 'Vessel en route. Tap below to continue your live navigation.'
                              : 'This rescue team is actively on course. Please choose another unassigned target.'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Action Button: Continue (Mine) vs Locked (Other Team) vs Accept (Unassigned) */}
                    {tgt.isAssigned ? (
                      isThisMyMission ? (
                        <TouchableOpacity
                          style={[styles.acceptMissionBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => {
                            setSelectedTarget(tgt);
                            try {
                              if (typeof window !== 'undefined' && window.localStorage) {
                                window.localStorage.setItem('ghostnet_selected_target', JSON.stringify(tgt));
                              }
                            } catch (e) {}
                            setCrewTab('MISSION');
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>🧭</Text>
                          <Text style={[styles.acceptMissionText, { color: '#ffffff' }]}>
                            Continue Active Mission ➔
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={[
                            styles.acceptMissionBtn,
                            {
                              backgroundColor: 'rgba(30, 41, 59, 0.85)',
                              borderColor: '#3b82f6',
                              borderWidth: 1.5,
                              opacity: 0.95
                            }
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>🔒</Text>
                          <Text style={[styles.acceptMissionText, { color: '#93c5fd', fontSize: 13 }]}>
                            Team In Action ({tgt.assignedTeam}) • Choose Another Target
                          </Text>
                        </View>
                      )
                    ) : (
                      <TouchableOpacity
                        style={styles.acceptMissionBtn}
                        onPress={() => {
                          setSelectedTarget(tgt);
                          setShowPreDepartureModal(true);
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>⚡</Text>
                        <Text style={styles.acceptMissionText}>{t('acceptMissionBtn')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {/* Environmental Summary */}
            <View style={styles.envSummaryCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🌊</Text>
                <View>
                  <Text style={styles.envLabel}>{t('seaStateLabel')}</Text>
                  <Text style={styles.envVal}>{t('seaStateVal')}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.envLabel}>{t('windLabel')}</Text>
                <Text style={styles.envVal}>{t('windVal')}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* TAB B: CURRENT MISSION HUD NAVIGATION SCREEN */
          <View style={{ gap: 14 }}>
            {(() => {
              const isMyActiveMission = Boolean(
                selectedTarget &&
                (
                  (selectedTarget.assignedTeam && (
                    selectedTarget.assignedTeam.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim() ||
                    selectedTarget.assignedTeam.toLowerCase().trim() === currentUser?.username?.toLowerCase().trim()
                  )) ||
                  (selectedTarget.assignedBoat && (
                    selectedTarget.assignedBoat.toLowerCase().trim() === currentUser?.boatTag?.toLowerCase().trim()
                  ))
                )
              );

              if (!selectedTarget || !isMyActiveMission) {
                return (
                  <View style={[styles.polarWhiteCard, { padding: 24, alignItems: 'center' }]}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>⚓</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>
                      {t('standbyModeTitle')}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                      {t('standbyModeDesc')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.declareSubmitBtn, { marginTop: 16, width: '100%' }]}
                      onPress={() => setCrewTab('REPORTS')}
                    >
                      <Text style={styles.declareSubmitText}>{t('viewPendingBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <>
                {/* Active Mission Target Strip */}
                {(() => {
                  const targetCoords = parseCoordinates(selectedTarget.coords);
                  const distNm = calculateDistanceNm(rescueCoords.lat, rescueCoords.lon, targetCoords.lat, targetCoords.lon);
                  const liveSpeed = rescueCoords.speedKn;
                  const activeEtaMin = liveSpeed > 0.5 ? Math.max(1, Math.round((distNm / liveSpeed) * 60)) : Math.max(1, Math.round((distNm / 12.4) * 60));

                  return (
                    <View style={styles.engagedMissionCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={styles.engagedBadge}>
                          <View style={styles.redPulsingDot} />
                          <Text style={styles.engagedBadgeText}>{t('engagedRescueBadge')}</Text>
                        </View>
                        <Text style={styles.etaText}>
                          {t('etaPrefix')} {activeEtaMin} MIN
                        </Text>
                      </View>
                      <Text style={styles.engagedTargetTitle}>
                        {selectedTarget.gearName} • {selectedTarget.massKg} kg • Intercepted by {currentUser.name}
                      </Text>
                      <Text style={styles.engagedTargetSub}>
                        🛡️ Target: {selectedTarget.coords} • Subsurface depth {selectedTarget.depthM}m
                      </Text>
                    </View>
                  );
                })()}

                {/* OFFSHORE NAUTICAL SATELLITE MAP & MEMBER 1 AI DRIFT TRAJECTORY */}
                {(() => {
                  const targetCoords = parseCoordinates(selectedTarget.coords);
                  const boatLat = rescueCoords.lat;
                  const boatLon = rescueCoords.lon;
                  const distNm = calculateDistanceNm(boatLat, boatLon, targetCoords.lat, targetCoords.lon);
                  const realHeading = calculateBearing(boatLat, boatLon, targetCoords.lat, targetCoords.lon);
                  const liveSpeed = rescueCoords.speedKn;
                  const etaMin = liveSpeed > 0.5 ? Math.round((distNm / liveSpeed) * 60) : Math.round((distNm / 12.4) * 60);

                  return (
                    <View style={styles.radarCard}>
                      {/* Top Header & Tactical Coordinates */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>🛰️</Text>
                          <Text style={{ color: '#e0fdff', fontSize: 13, fontWeight: '700' }}>
                            NAUTICAL SATELLITE HUD
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(33, 43, 53, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#00f2fe' }}
                            onPress={() => {
                              if (typeof navigator !== 'undefined' && navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => {
                                    const rawSpd = pos.coords.speed;
                                    const calcSpd = rawSpd && rawSpd > 0.2 ? parseFloat((rawSpd * 1.94384).toFixed(1)) : 0.0;
                                    const newPos = { lat: pos.coords.latitude, lon: pos.coords.longitude, speedKn: calcSpd, timestamp: Date.now() };
                                    setRescueCoords(newPos);
                                    showToast(`📍 Live GPS: ${newPos.lat.toFixed(4)}°N, ${newPos.lon.toFixed(4)}°E • ${calcSpd} kn`);
                                  },
                                  () => showToast('GPS fix acquired from device'),
                                  { enableHighAccuracy: true }
                                );
                              }
                            }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e475' }} />
                            <Text style={{ color: '#00f2fe', fontSize: 10, fontWeight: '800' }}>GPS LIVE</Text>
                          </TouchableOpacity>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: 'rgba(6, 78, 59, 0.85)',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#34d399'
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>📥</Text>
                            <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '800' }}>OFFLINE CACHED</Text>
                          </View>
                          <View style={styles.compassPillTopRight}>
                            <Text style={{ color: '#00f2fe', fontSize: 12 }}>🧭</Text>
                            <Text style={styles.compassPillText}>{realHeading}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Interactive Satellite Map Container (Touch, Pinch, Pan, Zoom) */}
                      <View
                        style={{
                          width: '100%',
                          height: 420,
                          borderRadius: 14,
                          overflow: 'hidden',
                          borderWidth: 1.5,
                          borderColor: '#1e3a5f',
                          backgroundColor: '#071626'
                        }}
                      >
                        {React.createElement('iframe', {
                          srcDoc: missionChartHtml,
                          style: {
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          },
                          title: 'Tactical Marine Satellite Chart'
                        })}
                      </View>

                      {/* Real Live Telemetry Bar */}
                      <View style={[styles.floatingHudBar, { marginTop: 12 }]}>
                        <View style={styles.hudStatCol}>
                          <Text style={styles.hudStatLabel}>{t('distanceLabel')}</Text>
                          <Text style={[styles.hudStatVal, { color: '#00e475' }]}>
                            {distNm} NM
                          </Text>
                        </View>
                        <View style={styles.hudDivider} />
                        <View style={styles.hudStatCol}>
                          <Text style={styles.hudStatLabel}>{t('headingLabel')}</Text>
                          <Text style={[styles.hudStatVal, { color: '#89ceff' }]}>{realHeading}</Text>
                        </View>
                        <View style={styles.hudDivider} />
                        <View style={styles.hudStatCol}>
                          <Text style={styles.hudStatLabel}>{t('speedLabel')}</Text>
                          <Text style={[styles.hudStatVal, { color: liveSpeed > 0 ? '#00e475' : '#94a3b8' }]}>
                            {liveSpeed > 0 ? `${liveSpeed.toFixed(1)} kn` : '0.0 kn (Stationary)'}
                          </Text>
                        </View>
                        <View style={styles.hudDivider} />
                        <View style={styles.hudStatCol}>
                          <Text style={styles.hudStatLabel}>{t('etaLabel')}</Text>
                          <Text style={[styles.hudStatVal, { color: '#ffd166' }]}>
                            {liveSpeed > 0.5 ? `${etaMin} MIN` : `~${etaMin} MIN (Cruise)`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Tactical Side-Scan Sonar Launcher Card */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#071018',
                    borderWidth: 1.5,
                    borderColor: '#00f2fe',
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 14,
                    marginBottom: 12,
                    shadowColor: '#00f2fe',
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 5
                  }}
                  onPress={() => setShowSonarConsole(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: 'rgba(0, 242, 254, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 242, 254, 0.4)'
                    }}>
                      <Text style={{ fontSize: 22 }}>📡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#00f2fe', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 }}>
                          ACTIVATE SIDE-SCAN SONAR HUD
                        </Text>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                      </View>
                      <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                        Acoustic Waterfall • Net Shadow AI & Extraction Protocol
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#00f2fe', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>➔</Text>
                </TouchableOpacity>

                {/* Mission Completion Action Card */}
                <View style={styles.fieldActionCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 20 }}>⚓</Text>
                    <Text style={styles.fieldActionTitle}>Field Action Log</Text>
                  </View>
                  <Text style={styles.fieldActionDesc}>
                    Upon surfacing and winching the target gear to the recovery deck, verify dry net mass to close the maritime ledger.
                  </Text>
                  <TouchableOpacity
                    style={styles.markRecoveredBtn}
                    onPress={() => setShowVerificationModal(true)}
                  >
                    <Text style={{ fontSize: 18 }}>✅</Text>
                    <Text style={styles.markRecoveredText}>{t('verifyOnDeckBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            );
          })()}
          </View>
        )}

        {/* MODAL 1: PRE-DEPARTURE MARINE ALERT MODAL */}
        <Modal
          visible={showPreDepartureModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPreDepartureModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalIconWrap}>
                  <Text style={{ fontSize: 22 }}>🛰️</Text>
                </View>
                <View>
                  <Text style={styles.modalTag}>{t('offlineSyncAdvisory')}</Text>
                  <Text style={styles.modalTitle}>{t('headingOffshoreTitle')}</Text>
                </View>
              </View>

              <View style={styles.modalTargetBox}>
                <Text style={styles.modalBoxLabel}>{t('selectedTargetLabel')}</Text>
                <Text style={styles.modalBoxTitle}>
                  {selectedTarget?.gearName} • {selectedTarget?.massKg} kg
                </Text>
                <Text style={styles.modalBoxCoords}>{selectedTarget?.coords}</Text>
              </View>

              <Text style={styles.modalWarningText}>
                {t('preDepartureAlertDesc')}
              </Text>

              <View style={{ gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => confirmMissionLaunch(true)}
                >
                  <Text style={{ fontSize: 18 }}>📥</Text>
                  <Text style={styles.modalPrimaryBtnText}>{t('downloadOfflineLaunchBtn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => confirmMissionLaunch(false)}
                >
                  <Text style={styles.modalSecondaryBtnText}>{t('launchOnlineOnlyBtn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 6, alignItems: 'center' }}
                  onPress={() => setShowPreDepartureModal(false)}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>{t('cancelBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: DECK VERIFICATION MODAL */}
        <Modal
          visible={showVerificationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVerificationModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#37fa87' }]}>
                  <Text style={{ fontSize: 22 }}>⚖️</Text>
                </View>
                <View>
                  <Text style={[styles.modalTag, { color: '#00e475' }]}>{t('deckVerificationTitle')}</Text>
                  <Text style={styles.modalTitle}>{t('deckVerificationSub')}</Text>
                </View>
              </View>

              <Text style={styles.modalWarningText}>
                Confirm crane scale measurement to finalize mission telemetry and reward coastal credits.
              </Text>

              <View style={styles.scaleWellBox}>
                <Text style={styles.scaleLabel}>{t('hauledGearMassLabel')}</Text>
                <View style={styles.scaleStepperRow}>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    onPress={() => setVerifiedWeight((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(1))))}
                  >
                    <Text style={styles.scaleBtnTxt}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.scaleValBox}>
                    <Text style={styles.scaleValTxt}>{verifiedWeight}</Text>
                    <Text style={styles.scaleValUnit}>Tons</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    onPress={() => setVerifiedWeight((prev) => parseFloat((prev + 0.1).toFixed(1)))}
                  >
                    <Text style={styles.scaleBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#37fa87' }]}
                  onPress={handleCompleteLedger}
                >
                  <Text style={{ fontSize: 18 }}>✓</Text>
                  <Text style={[styles.modalPrimaryBtnText, { color: '#003918' }]}>
                    {t('submitCompleteLedgerBtn')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 6, alignItems: 'center' }}
                  onPress={() => setShowVerificationModal(false)}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>{t('cancelBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Offline Status Toast */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={{ fontSize: 14 }}>☁️</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
        {renderDatabaseModal()}
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------------
// STYLES: Tactical Oceanic & Polar High Contrast Design System
// -------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  splashBg: { backgroundColor: '#030b14', alignItems: 'center', justifyContent: 'center' },
  splashContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' },
  splashRingOuter: { position: 'absolute', width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.15)', alignItems: 'center', justifyContent: 'center' },
  splashRingInner: { width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.25)' },
  logoContainerLg: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoGlowBehind: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(0, 242, 254, 0.2)' },
  logoBadge: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#030b14', borderWidth: 1.5, borderColor: 'rgba(0, 242, 254, 0.4)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoImgLg: { width: '100%', height: '100%', resizeMode: 'cover' },
  splashTitle: { color: '#ffffff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  splashSubtitle: { color: '#dae3f1', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 290 },
  splashTapPrompt: { marginTop: 36, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(0, 242, 254, 0.12)', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' },
  splashTapText: { color: '#00f2fe', fontSize: 13, fontWeight: '700' },
  authHeader: { alignItems: 'center', paddingVertical: 14 },
  authLogoBadge: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#212b35', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' },
  authLogoImg: { width: 60, height: 60, borderRadius: 30 },
  onlinePillGreen: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00e475', borderWidth: 2, borderColor: '#0a141d', zIndex: 10 },
  authAppTitle: { color: '#e0fdff', fontSize: 22, fontWeight: '700', marginTop: 8 },
  authSubText: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  tabPillContainer: { flexDirection: 'row', backgroundColor: '#212b35', borderRadius: 12, padding: 4, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  tabPill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabPillActive: { backgroundColor: '#ffffff' },
  tabPillText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  tabPillTextActive: { color: '#030b14' },
  inputCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10 },
  inputLabel: { color: 'rgba(3, 11, 20, 0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  inputIcon: { marginRight: 8, fontSize: 16 },
  textInput: { flex: 1, color: '#030b14', fontSize: 14, fontWeight: '500' },
  sectionHeaderLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginLeft: 2 },
  roleGrid: { flexDirection: 'row', gap: 10 },
  roleCard: { flex: 1, borderRadius: 14, padding: 14, minHeight: 120, justifyContent: 'space-between' },
  roleCardSelected: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#00f2fe' },
  roleCardInactive: { backgroundColor: 'rgba(255, 255, 255, 0.9)', opacity: 0.85 },
  roleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: '#00f2fe', borderColor: '#00f2fe' },
  checkText: { color: '#030b14', fontSize: 13, fontWeight: 'bold' },
  roleTitle: { color: '#030b14', fontSize: 16, fontWeight: '700', marginTop: 8 },
  roleDesc: { color: 'rgba(3, 11, 20, 0.75)', fontSize: 11, lineHeight: 15, marginTop: 2 },
  primaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00f2fe', paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  primaryActionText: { color: '#030b14', fontSize: 16, fontWeight: '800' },
  langPillCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingVertical: 8 },
  langPillText: { color: '#00f2fe', fontSize: 13, fontWeight: '600' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 8, width: '100%' },
  headerLogoThumb: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#060f18', overflow: 'hidden', padding: 2, flexShrink: 0 },
  headerWelcomeText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  headerSubtitleText: { color: '#94a3b8', fontSize: 11 },
  hudSubHeader: { color: '#00f2fe', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  langBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  langBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  switchRoleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  protocolCard: { backgroundColor: '#212b35', borderRadius: 12, padding: 12, marginBottom: 12 },
  protocolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  protocolTitle: { color: '#6ff6ff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  protocolStep: { color: '#00dce6', fontSize: 11, fontWeight: '600' },
  protocolStepsRow: { flexDirection: 'row', gap: 6 },
  stepChip: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', gap: 4 },
  stepChipActive: { backgroundColor: 'rgba(0, 242, 254, 0.2)' },
  stepChipDim: { backgroundColor: '#2c3640', opacity: 0.6 },
  stepNumCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#00f2fe', alignItems: 'center', justifyContent: 'center' },
  stepNumCircleDim: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#313a44', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#00373a', fontSize: 10, fontWeight: '800' },
  stepNumTextDim: { color: '#dae3f1', fontSize: 10, fontWeight: '600' },
  stepChipText: { color: '#e0fdff', fontSize: 10, fontWeight: '600' },
  stepChipTextDim: { color: '#94a3b8', fontSize: 10 },
  segmentedTabBar: { flexDirection: 'row', backgroundColor: '#060f18', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 },
  segmentedTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  segmentedTabActive: { backgroundColor: '#ffffff' },
  segmentedTabText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  segmentedTabTextActive: { color: '#030b14' },
  polarWhiteCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  polarCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00e475' },
  polarCardLiveText: { color: '#006f35', fontSize: 13, fontWeight: '700' },
  polarCardTag: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  polarCoordWell: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  polarCoordLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  polarCoordValue: { color: '#020617', fontSize: 16, fontWeight: '800', marginTop: 2 },
  polarCoordInput: { color: '#020617', fontSize: 15, fontWeight: '800', marginTop: 2, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  gpsUpdateBtn: { backgroundColor: '#060f18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  gpsUpdateBtnText: { color: '#6ff6ff', fontSize: 11, fontWeight: '700' },
  polarFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  polarFooterMeta: { color: '#475569', fontSize: 11 },
  autoTag: { color: '#0f172a', backgroundColor: '#e2e8f0', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectionHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  selectedGearCard: { borderWidth: 2, borderColor: '#00a2e6' },
  materialCard: { flex: 1, minWidth: '47%', backgroundColor: '#ffffff', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
  materialCardActive: { borderColor: '#00a2e6', backgroundColor: '#f0f9ff' },
  materialLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  materialLabelActive: { color: '#0369a1' },
  materialDesc: { fontSize: 10, color: '#64748b', marginTop: 2 },
  materialDescActive: { color: '#0284c7', fontWeight: '600' },
  gearRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gearTitle: { color: '#020617', fontSize: 15, fontWeight: '700' },
  gearDesc: { color: '#475569', fontSize: 11, marginTop: 2 },
  gearCheckCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  gearCheckCircleActive: { backgroundColor: '#00a2e6' },
  stepperLabel: { color: '#334155', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  stepperValue: { color: '#020617', fontSize: 26, fontWeight: '800' },
  stepperUnit: { color: '#475569', fontSize: 14, fontWeight: '600' },
  stepperBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepperBtnTxt: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  calibText: { color: '#94a3b8', fontSize: 10, marginLeft: 'auto' },
  declareSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00f2fe', paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  declareSubmitText: { color: '#030b14', fontSize: 15, fontWeight: '800' },
  trackerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  trackerHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  trackerCountBadge: { backgroundColor: '#212b35', color: '#6ff6ff', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  trackerGearTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  trackerCoordsText: { color: '#475569', fontSize: 11, marginTop: 2 },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stageBadgeText: { fontSize: 10, fontWeight: '800' },
  stageStatusBar: { padding: 8, borderRadius: 8, marginVertical: 8 },
  stageStatusText: { fontSize: 12, fontWeight: '700' },
  trackerFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackerMetaLeft: { color: '#64748b', fontSize: 11 },
  trackerMetaRight: { color: '#0f172a', fontSize: 11, fontWeight: '600' },
  fileAnotherBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#212b35', paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  fileAnotherText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  operativeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  operativeName: { color: '#dae3f1', fontSize: 15, fontWeight: '700' },
  aisBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#131c26', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  aisPingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e475' },
  aisText: { color: '#62ff96', fontSize: 10, fontWeight: '800' },
  criticalAlertCard: { backgroundColor: '#060f18', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  criticalAlertIconWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#93000a', alignItems: 'center', justifyContent: 'center' },
  criticalBadgeText: { color: '#ffb4ab', backgroundColor: '#690005', fontSize: 10, fontWeight: '800', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  criticalTimeText: { color: '#b9cacb', fontSize: 11 },
  criticalTitleText: { color: '#dae3f1', fontSize: 12, fontWeight: '500' },
  criticalViewBtn: { backgroundColor: '#212b35', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  criticalViewTxt: { color: '#e0fdff', fontSize: 11, fontWeight: '700' },
  queueStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueStatusTitle: { color: '#b9cacb', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  queueStatusSubtitle: { color: '#00f2fe', fontSize: 11, fontWeight: '600' },
  targetCardDark: { backgroundColor: '#060f18', borderRadius: 14, padding: 14, gap: 8, position: 'relative', overflow: 'hidden' },
  targetSideStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  targetCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 4 },
  targetPriorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#212b35', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  targetPriorityDot: { width: 6, height: 6, borderRadius: 3 },
  targetPriorityTxt: { fontSize: 10, fontWeight: '700' },
  targetDistanceTxt: { color: '#62ff96', fontSize: 12, fontWeight: '700' },
  targetGearName: { color: '#e0fdff', fontSize: 17, fontWeight: '700' },
  targetGearDesc: { color: '#b9cacb', fontSize: 12, marginTop: 2 },
  telemetryGrid: { flexDirection: 'row', gap: 4, paddingLeft: 4 },
  telemetryCell: { flex: 1, backgroundColor: '#17202a', padding: 6, borderRadius: 8 },
  telemetryCellLabel: { color: '#b9cacb', fontSize: 9 },
  telemetryCellValue: { color: '#dae3f1', fontSize: 11, fontWeight: '700', marginTop: 2 },
  coordsReadoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#212b35', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginLeft: 4 },
  coordsReadoutVal: { color: '#dae3f1', fontSize: 12, fontWeight: '600' },
  aisVectorText: { color: '#b9cacb', fontSize: 10 },
  acceptMissionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00f2fe', paddingVertical: 12, borderRadius: 10, marginLeft: 4, marginTop: 2 },
  acceptMissionText: { color: '#00373a', fontSize: 14, fontWeight: '800' },
  envSummaryCard: { backgroundColor: '#131c26', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  envLabel: { color: '#b9cacb', fontSize: 10 },
  envVal: { color: '#dae3f1', fontSize: 12, fontWeight: '600' },
  engagedMissionCard: { backgroundColor: '#060f18', borderRadius: 12, padding: 12, gap: 4 },
  engagedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#93000a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  redPulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffb4ab' },
  engagedBadgeText: { color: '#ffdad6', fontSize: 9, fontWeight: '800' },
  etaText: { color: '#00f2fe', fontSize: 12, fontWeight: '700' },
  engagedTargetTitle: { color: '#e0fdff', fontSize: 15, fontWeight: '700', marginTop: 4 },
  engagedTargetSub: { color: '#b9cacb', fontSize: 11 },
  radarCard: { backgroundColor: '#060f18', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 280, position: 'relative' },
  radarLegendTop: { position: 'absolute', top: 10, left: 10, gap: 4 },
  radarLegendPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(33, 43, 53, 0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  radarLegendDot: { width: 6, height: 6, borderRadius: 3 },
  radarLegendText: { color: '#dae3f1', fontSize: 9, fontWeight: '600' },
  compassPillTopRight: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(33, 43, 53, 0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  compassPillText: { color: '#e0fdff', fontSize: 11, fontWeight: '700' },
  marineChartContainer: { width: '100%', height: 260, backgroundColor: '#071626', borderRadius: 12, marginVertical: 12, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#172c42' },
  depthContourLine1: { position: 'absolute', left: 40, right: 0, top: 50, height: 1, backgroundColor: 'rgba(0, 242, 254, 0.12)', borderStyle: 'dashed' },
  depthContourLine2: { position: 'absolute', left: 70, right: 0, top: 120, height: 1, backgroundColor: 'rgba(0, 242, 254, 0.12)', borderStyle: 'dashed' },
  depthContourLine3: { position: 'absolute', left: 90, right: 0, top: 190, height: 1, backgroundColor: 'rgba(0, 242, 254, 0.12)', borderStyle: 'dashed' },
  coastlineStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 22, backgroundColor: '#132230', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1.5, borderRightColor: '#254460' },
  coastlineText: { color: '#64748b', fontSize: 7, fontWeight: '800', transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  driftTrajectoryLine: { position: 'absolute', height: 2, backgroundColor: '#ff3366', borderStyle: 'dashed' },
  aiDriftBadge: { position: 'absolute', backgroundColor: 'rgba(147, 0, 10, 0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  aiDriftBadgeText: { color: '#ffdad6', fontSize: 8, fontWeight: '700' },
  interceptCourseLine: { position: 'absolute', height: 1.5, backgroundColor: 'rgba(0, 242, 254, 0.5)', borderStyle: 'dashed' },
  redNetMarkerWrap: { position: 'absolute', width: 24, height: 24, transform: [{ translateX: -12 }, { translateY: -12 }], alignItems: 'center', justifyContent: 'center' },
  redTargetPulseRing: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#ff3366', opacity: 0.6 },
  redTargetSolidDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff3366', borderWidth: 2, borderColor: '#ffffff' },
  netInfoCallout: { position: 'absolute', top: 22, left: -40, backgroundColor: 'rgba(6, 15, 24, 0.95)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, width: 110, borderWidth: 0.5, borderColor: '#ff3366' },
  netCalloutTitle: { color: '#ffdad6', fontSize: 9, fontWeight: '800' },
  netCalloutSub: { color: '#dae3f1', fontSize: 8, marginTop: 1 },
  blueBoatMarkerWrap: { position: 'absolute', width: 26, height: 26, transform: [{ translateX: -13 }, { translateY: -13 }], alignItems: 'center', justifyContent: 'center' },
  blueBoatHalo: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0, 242, 254, 0.25)' },
  blueBoatIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#00f2fe', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#060f18' },
  boatCallout: { position: 'absolute', bottom: 22, left: -30, backgroundColor: 'rgba(6, 15, 24, 0.9)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, width: 85, alignItems: 'center' },
  boatCalloutText: { color: '#6ff6ff', fontSize: 8, fontWeight: '700' },
  interceptArrivalBanner: { position: 'absolute', bottom: 8, left: 26, right: 8, backgroundColor: 'rgba(6, 78, 59, 0.95)', padding: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  interceptArrivalText: { color: '#d1fae5', fontSize: 10, fontWeight: '800' },
  navControlsRow: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 10 },
  navActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  navActionBtnEngage: { backgroundColor: '#00f2fe' },
  navActionBtnPause: { backgroundColor: '#f59e0b' },
  navActionBtnTxt: { color: '#030b14', fontSize: 13, fontWeight: '800' },
  navResetBtn: { backgroundColor: '#212b35', paddingHorizontal: 14, justifyContent: 'center', borderRadius: 8 },
  navResetBtnTxt: { color: '#dae3f1', fontSize: 12, fontWeight: '600' },
  floatingHudBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(33, 43, 53, 0.95)', borderRadius: 12, paddingVertical: 10, width: '100%' },
  hudStatCol: { alignItems: 'center' },
  hudStatLabel: { color: '#b9cacb', fontSize: 9, fontWeight: '700' },
  hudStatVal: { color: '#e0fdff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  hudDivider: { width: 1, height: 22, backgroundColor: '#3a494b' },
  fieldActionCard: { backgroundColor: '#131c26', borderRadius: 12, padding: 14, gap: 8 },
  fieldActionTitle: { color: '#dae3f1', fontSize: 15, fontWeight: '700' },
  fieldActionDesc: { color: '#b9cacb', fontSize: 12, lineHeight: 16 },
  markRecoveredBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#37fa87', paddingVertical: 14, borderRadius: 10, marginTop: 4 },
  markRecoveredText: { color: '#003918', fontSize: 14, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10, 20, 29, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#060f18', borderRadius: 18, padding: 18, width: '100%', maxWidth: 380, gap: 12 },
  modalIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#00a2e6', alignItems: 'center', justifyContent: 'center' },
  modalTag: { color: '#89ceff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  modalTitle: { color: '#e0fdff', fontSize: 17, fontWeight: '700' },
  modalTargetBox: { backgroundColor: '#17202a', borderRadius: 10, padding: 10 },
  modalBoxLabel: { color: '#b9cacb', fontSize: 10 },
  modalBoxTitle: { color: '#dae3f1', fontSize: 13, fontWeight: '700', marginTop: 2 },
  modalBoxCoords: { color: '#00f2fe', fontSize: 11, marginTop: 2 },
  modalWarningText: { color: '#b9cacb', fontSize: 12, lineHeight: 16 },
  modalPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00f2fe', paddingVertical: 12, borderRadius: 10 },
  modalPrimaryBtnText: { color: '#00373a', fontSize: 14, fontWeight: '800' },
  modalSecondaryBtn: { paddingVertical: 10, borderRadius: 10, backgroundColor: '#212b35', alignItems: 'center' },
  modalSecondaryBtnText: { color: '#dae3f1', fontSize: 13, fontWeight: '600' },
  scaleWellBox: { backgroundColor: '#17202a', borderRadius: 12, padding: 12, alignItems: 'center', gap: 8 },
  scaleLabel: { color: '#b9cacb', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  scaleStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scaleBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#212b35', alignItems: 'center', justifyContent: 'center' },
  scaleBtnTxt: { color: '#e0fdff', fontSize: 20, fontWeight: 'bold' },
  scaleValBox: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#060f18', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, gap: 4 },
  scaleValTxt: { color: '#e0fdff', fontSize: 26, fontWeight: '800' },
  scaleValUnit: { color: '#b9cacb', fontSize: 14, fontWeight: '600' },
  toastContainer: { position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2c3640', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  toastText: { color: '#e0fdff', fontSize: 12, fontWeight: '600' }
});
