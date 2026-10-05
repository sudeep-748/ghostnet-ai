import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Local asset bundled directly inside the mobile app
const LOGO_IMG = require('./assets/logo.png');

type ScreenMode = 'SPLASH' | 'LOGIN_ROLE' | 'FISHERMAN' | 'RESCUE_CREW';
type Language = 'EN' | 'TA';

interface UserAccount {
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
  distanceNm: string;
  gearName: string;
  description: string;
  depthM: number;
  massKg: number;
  sector: string;
  coords: string;
  aisVector: string;
  accentColor: string;
}

export default function App() {
  // Navigation & Screen State
  const [screen, setScreen] = useState<ScreenMode>('SPLASH');
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [language, setLanguage] = useState<Language>('EN');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pre-seeded Accounts Store
  const [accounts, setAccounts] = useState<UserAccount[]>([
    {
      name: 'Selvam Ramanathan',
      username: 'selvam_04',
      password: 'password123',
      role: 'FISHERMAN',
      boatTag: 'TN-02-MM-4410',
      phone: '+91 98401 23456',
      port: 'Kasimedu Harbour Port'
    },
    {
      name: 'Capt. Michael Raj',
      username: 'capt_michael',
      password: 'password123',
      role: 'RESCUE_CREW',
      boatTag: 'Poseidon Alpha (MM-01)',
      phone: '+91 98405 88990',
      port: 'Chennai Coastal Station'
    }
  ]);

  // Current Logged-in User Session
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    name: 'Selvam Ramanathan',
    username: 'selvam_04',
    password: 'password123',
    role: 'FISHERMAN',
    boatTag: 'TN-02-MM-4410',
    phone: '+91 98401 23456',
    port: 'Kasimedu Harbour Port'
  });

  // Form Fields State
  const [loginUsername, setLoginUsername] = useState<string>('selvam_04');
  const [loginPassword, setLoginPassword] = useState<string>('password123');

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
  const [gpsCoords, setGpsCoords] = useState<string>('13.1250° N, 80.3150° E');
  const [selectedGear, setSelectedGear] = useState<'GILLNET' | 'TRAWL' | 'TRAP'>('GILLNET');
  const [estimatedDepth, setEstimatedDepth] = useState<number>(25);
  const [estimatedWeight, setEstimatedWeight] = useState<number>(45);

  const [reports, setReports] = useState<RecoveryReport[]>([
    {
      id: 'rep-1',
      gearType: 'Monofilament Gillnet',
      reportedBy: 'Selvam Ramanathan',
      vesselTag: 'TN-02-MM-4410',
      reportedTime: 'Reported Today, 06:40 AM',
      latLong: '13.125°N, 80.31°E • 25m depth',
      stage: 1,
      stageTitle: 'Stage 1',
      stageColor: '#78350f',
      stageBg: '#fef3c7',
      stageText: '🟡 Awaiting Rescue Team Assignment',
      detail: 'Ping Interval: 45s',
      subDetail: 'Auto-pinging transponder'
    },
    {
      id: 'rep-2',
      gearType: 'Trawl Net',
      reportedBy: 'Karthik S.',
      vesselTag: 'TN-04-F-8821',
      reportedTime: 'Reported Yesterday',
      latLong: '13.084°N, 80.29°E • 42m depth',
      stage: 2,
      stageTitle: 'Stage 2',
      stageColor: '#083344',
      stageBg: '#cffafe',
      stageText: '🔵 Rescue in Progress — Boat Delta En Route',
      detail: 'Vessel: Coastal Patrol 04',
      subDetail: 'ETA: 22 Mins'
    },
    {
      id: 'rep-3',
      gearType: 'Gillnet',
      reportedBy: 'Selvam Ramanathan',
      vesselTag: 'TN-02-MM-4410',
      reportedTime: 'Reported 3 Days ago',
      latLong: '13.190°N, 80.35°E • 18m depth',
      stage: 3,
      stageTitle: 'Stage 3',
      stageColor: '#064e3b',
      stageBg: '#d1fae5',
      stageText: '🟢 Successfully Recovered (52 kg hauled)',
      detail: 'Incentive Credited: ₹1,560',
      subDetail: 'Closed Mission'
    }
  ]);

  // -------------------------------------------------------------
  // Rescue Crew State
  // -------------------------------------------------------------
  const [crewTab, setCrewTab] = useState<'REPORTS' | 'MISSION'>('REPORTS');
  const [selectedTarget, setSelectedTarget] = useState<RescueTarget | null>(null);
  const [showPreDepartureModal, setShowPreDepartureModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [verifiedWeight, setVerifiedWeight] = useState<number>(48);

  const [targets] = useState<RescueTarget[]>([
    {
      id: 'tgt-1',
      priorityLabel: 'FCFS Priority #1',
      reportedAgo: 'Reported 18m ago',
      distanceNm: '2.4 NM away',
      gearName: 'Monofilament Gillnet',
      description: 'High ghost-fishing hazard rating. Deployed underwater sonar transponder signal confirmed.',
      depthM: 28,
      massKg: 45,
      sector: 'Kasimedu',
      coords: '13.125°N, 80.315°E',
      aisVector: 'AIS Vector: 042°',
      accentColor: '#00f2fe'
    },
    {
      id: 'tgt-2',
      priorityLabel: 'FCFS Priority #2',
      reportedAgo: 'Reported 42m ago',
      distanceNm: '4.1 NM away',
      gearName: 'Heavy Trawl Net',
      description: 'Reef snagging reported by local trawler. High potential marine mammal entanglement.',
      depthM: 15,
      massKg: 90,
      sector: 'Ennore Outer',
      coords: '13.102°N, 80.334°E',
      aisVector: 'AIS Vector: 058°',
      accentColor: '#89ceff'
    }
  ]);

  // Auto-advance Splash Screen after 1.8s
  useEffect(() => {
    if (screen === 'SPLASH') {
      const timer = setTimeout(() => {
        setScreen('LOGIN_ROLE');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Handle Authentication Logic
  const handleAuthSubmit = () => {
    if (authTab === 'LOGIN') {
      if (!loginUsername.trim() || !loginPassword.trim()) {
        showToast('Please enter both username and password.');
        return;
      }

      // Check if user exists in accounts store
      const found = accounts.find(
        (acc) =>
          acc.username.toLowerCase() === loginUsername.trim().toLowerCase() &&
          acc.password === loginPassword
      );

      if (found) {
        // Use matching user account
        setCurrentUser(found);
        showToast(`Welcome back, ${found.name}!`);
        if (found.role === 'FISHERMAN') setScreen('FISHERMAN');
        else setScreen('RESCUE_CREW');
      } else {
        // Create active session with entered credentials and selected role
        const dynamicUser: UserAccount = {
          name: loginUsername.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          username: loginUsername.trim(),
          password: loginPassword,
          role: selectedRole,
          boatTag: selectedRole === 'FISHERMAN' ? 'TN-02-F-9920' : 'Poseidon-Bravo',
          phone: '+91 98400 00000',
          port: 'Kasimedu Coastal Harbour'
        };
        setAccounts((prev) => [...prev, dynamicUser]);
        setCurrentUser(dynamicUser);
        showToast(`Authenticated as ${dynamicUser.name}`);
        if (selectedRole === 'FISHERMAN') setScreen('FISHERMAN');
        else setScreen('RESCUE_CREW');
      }
    } else {
      // REGISTER ACCOUNT
      if (!regFullName.trim()) {
        showToast('Please enter your full name.');
        return;
      }
      if (!regUsername.trim()) {
        showToast('Please create a username / operator ID.');
        return;
      }
      if (!regPassword.trim()) {
        showToast('Please create a secure password.');
        return;
      }

      const newAccount: UserAccount = {
        name: regFullName.trim(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        role: selectedRole,
        boatTag: regBoatTag.trim() || (selectedRole === 'FISHERMAN' ? 'TN-02-MM-REG' : 'Rescue-Delta'),
        phone: regPhone.trim() || '+91 98000 00000',
        port: 'Kasimedu Harbour Port'
      };

      setAccounts((prev) => [...prev, newAccount]);
      setCurrentUser(newAccount);
      showToast(
        language === 'TA'
          ? `கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது! வணக்கம் ${newAccount.name}`
          : `Account registered successfully! Welcome, ${newAccount.name}`
      );

      // Open directly into their calibrated role dashboard
      if (selectedRole === 'FISHERMAN') setScreen('FISHERMAN');
      else setScreen('RESCUE_CREW');
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

    const newRep: RecoveryReport = {
      id: `rep-${Date.now()}`,
      gearType: gearTitle,
      reportedBy: currentUser.name,
      vesselTag: currentUser.boatTag,
      reportedTime: 'Reported Just Now',
      latLong: `${gpsCoords} • ${estimatedDepth}m depth`,
      stage: 1,
      stageTitle: 'Stage 1',
      stageColor: '#78350f',
      stageBg: '#fef3c7',
      stageText: '🟡 Awaiting Rescue Team Assignment',
      detail: 'Ping Interval: 30s',
      subDetail: 'Auto-pinging transponder'
    };

    setReports([newRep, ...reports]);
    showToast(
      language === 'TA'
        ? 'வலை இழப்பு வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
        : 'Lost gear declaration submitted successfully!'
    );
    setFisherTab('TRACKER');
  };

  const handleStartMission = (target: RescueTarget) => {
    setSelectedTarget(target);
    setShowPreDepartureModal(true);
  };

  const confirmMissionLaunch = (downloadOffline: boolean) => {
    setShowPreDepartureModal(false);
    if (downloadOffline) {
      showToast('Downloading offline satellite sector (24.8 MB)...');
      setTimeout(() => {
        showToast('Offline tiles cached. Launching mission navigation...');
        setCrewTab('MISSION');
      }, 800);
    } else {
      showToast('Launching online navigation HUD...');
      setCrewTab('MISSION');
    }
  };

  const handleCompleteLedger = () => {
    setShowVerificationModal(false);
    showToast(`Mission finalized. Verified ${verifiedWeight} kg logged to blockchain ledger.`);
    setTimeout(() => {
      setCrewTab('REPORTS');
    }, 1200);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'EN' ? 'TA' : 'EN';
    setLanguage(nextLang);
    showToast(nextLang === 'TA' ? 'மொழி: தமிழ் தேர்ந்தெடுக்கப்பட்டது' : 'Language: English Active');
  };

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
                Log In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, authTab === 'REGISTER' && styles.tabPillActive]}
              onPress={() => setAuthTab('REGISTER')}
            >
              <Text style={[styles.tabPillText, authTab === 'REGISTER' && styles.tabPillTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM: LOG IN OR CREATE ACCOUNT */}
          {authTab === 'LOGIN' ? (
            <View style={{ gap: 10 }}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>OPERATOR ID / USERNAME</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                    placeholder="Enter username (e.g. selvam_04)"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>OFFSHORE PASSCODE</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
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
          ) : (
            /* CREATE ACCOUNT FORM */
            <View style={{ gap: 10 }}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>FULL NAME (முழு பெயர்)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📝</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regFullName}
                    onChangeText={setRegFullName}
                    placeholder="e.g. Selvam Ramanathan"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>CHOOSE USERNAME</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regUsername}
                    onChangeText={setRegUsername}
                    placeholder="e.g. selvam_04"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>VESSEL / BOAT REGISTRATION NUMBER</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>🛥️</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regBoatTag}
                    onChangeText={setRegBoatTag}
                    placeholder="e.g. IND-TN-02-MM-4410"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>MOBILE PHONE (FOR RECOVERY SMS & OTP)</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.textInput}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    placeholder="+91 98401 23456"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>CREATE PASSCODE</Text>
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

          {/* Role Selection Section */}
          <View style={{ marginTop: 10, marginBottom: 12 }}>
            <Text style={styles.sectionHeaderLabel}>
              {authTab === 'REGISTER' ? 'ASSIGN FIELD DEPLOYMENT ROLE' : 'SELECT FIELD ROLE'}
            </Text>
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
                <Text style={styles.roleTitle}>Fisherman</Text>
                <Text style={styles.roleDesc}>Report Lost Gear & Track Recovery</Text>
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
                <Text style={styles.roleTitle}>Rescue Team</Text>
                <Text style={styles.roleDesc}>Emergency Missions & Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleAuthSubmit}
          >
            <Text style={styles.primaryActionText}>
              {authTab === 'LOGIN'
                ? language === 'TA'
                  ? 'தளத்தில் நுழையவும்'
                  : 'Log In & Enter Portal'
                : language === 'TA'
                ? 'கணக்கு உருவாக்கி நுழையவும்'
                : 'Create Account & Launch'}
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
        </ScrollView>

        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={{ fontSize: 14 }}>☁️</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.headerLogoThumb}>
                <Image source={LOGO_IMG} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
              </View>
              <View>
                <Text style={styles.headerWelcomeText}>
                  {language === 'TA'
                    ? `வணக்கம், ${currentUser.name}`
                    : `Welcome, ${currentUser.name}`}
                </Text>
                <Text style={styles.headerSubtitleText}>
                  {currentUser.boatTag} • {currentUser.port}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
                <Text style={styles.langBadgeText}>
                  {language === 'EN' ? 'தமிழ்' : 'EN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.switchRoleBadge}
                onPress={() => setScreen('LOGIN_ROLE')}
              >
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>🔄 Switch</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Operational Recovery Protocol Progress Bar */}
          <View style={styles.protocolCard}>
            <View style={styles.protocolHeader}>
              <Text style={styles.protocolTitle}>⚙️ OPERATIONAL RECOVERY PROTOCOL</Text>
              <Text style={styles.protocolStep}>All 4 Steps Ready</Text>
            </View>
            <View style={styles.protocolStepsRow}>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepChipText}>GPS Fix</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepChipText}>Gear Type</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepChipText}>Depth</Text>
              </View>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>4</Text></View>
                <Text style={styles.stepChipText}>Submit</Text>
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
                Declare Lost Gear
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
                My Reports Tracker
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
                    <Text style={styles.polarCardLiveText}>● GPS Signal Locked</Text>
                  </View>
                  <Text style={styles.polarCardTag}>Dual RTK</Text>
                </View>

                <View style={styles.polarCoordWell}>
                  <View>
                    <Text style={styles.polarCoordLabel}>FIX COORDINATES</Text>
                    <Text style={styles.polarCoordValue}>{gpsCoords}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.gpsUpdateBtn}
                    onPress={() => {
                      setGpsCoords('13.1258° N, 80.3164° E');
                      showToast('RTK GPS coordinates locked with ±1.8m accuracy!');
                    }}
                  >
                    <Text style={styles.gpsUpdateBtnText}>🔄 Update GPS</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.polarFooterRow}>
                  <Text style={styles.polarFooterMeta}>
                    🛰️ Accuracy: ±2.4m • Sea Fix via NavIC/GPS
                  </Text>
                  <Text style={styles.autoTag}>AUTO</Text>
                </View>
              </View>

              {/* Net Selector */}
              <View>
                <Text style={styles.sectionHeaderTitle}>Type of Net</Text>
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
                        <Text style={styles.gearTitle}>Monofilament Gillnet</Text>
                        <Text style={styles.gearDesc}>
                          High risk entangling netting • High ghost potential
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
                        <Text style={styles.gearTitle}>Trawl Net</Text>
                        <Text style={styles.gearDesc}>Bottom/pelagic trawls • Heavy cable lead</Text>
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
                        <Text style={styles.gearTitle}>Crab / Ring Trap</Text>
                        <Text style={styles.gearDesc}>
                          Mesh cage traps with acoustic surface float
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

              {/* Dual Stepper Cards: Depth & Weight */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Depth */}
                <View style={[styles.polarWhiteCard, { flex: 1 }]}>
                  <Text style={styles.stepperLabel}>🌊 ESTIMATED DEPTH</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 6 }}>
                    <Text style={styles.stepperValue}>{estimatedDepth}</Text>
                    <Text style={styles.stepperUnit}>meters</Text>
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
                    <Text style={styles.calibText}>Sonar Calib</Text>
                  </View>
                </View>

                {/* Weight */}
                <View style={[styles.polarWhiteCard, { flex: 1 }]}>
                  <Text style={styles.stepperLabel}>⚖️ WEIGHT REG.</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 6 }}>
                    <Text style={styles.stepperValue}>{estimatedWeight}</Text>
                    <Text style={styles.stepperUnit}>kg</Text>
                  </View>
                  <View style={styles.stepperBtnRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedWeight(Math.max(5, estimatedWeight - 5))}
                    >
                      <Text style={styles.stepperBtnTxt}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setEstimatedWeight(estimatedWeight + 5)}
                    >
                      <Text style={styles.stepperBtnTxt}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.calibText}>Wet Est.</Text>
                  </View>
                </View>
              </View>

              {/* Submit Declaration Button */}
              <TouchableOpacity
                style={styles.declareSubmitBtn}
                onPress={handleDeclareSubmit}
              >
                <Text style={{ fontSize: 20 }}>🚨</Text>
                <Text style={styles.declareSubmitText}>Submit Lost Gear Declaration</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* TAB 2: TRACKER SCREEN PREVIEW */
            <View style={{ gap: 14 }}>
              <View style={styles.trackerHeaderRow}>
                <Text style={styles.trackerHeaderTitle}>🛰️ Active & Past Recovery Trackers</Text>
                <Text style={styles.trackerCountBadge}>{reports.length} Logged</Text>
              </View>

              {/* List of Reports */}
              {reports.map((item) => (
                <View key={item.id} style={styles.polarWhiteCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackerGearTitle}>{item.gearType} • {item.reportedTime}</Text>
                      <Text style={styles.trackerCoordsText}>📍 {item.latLong}</Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Reported by: {item.reportedBy} ({item.vesselTag})
                      </Text>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: item.stageBg }]}>
                      <Text style={[styles.stageBadgeText, { color: item.stageColor }]}>
                        {item.stageTitle}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.stageStatusBar, { backgroundColor: item.stageBg }]}>
                    <Text style={[styles.stageStatusText, { color: item.stageColor }]}>
                      {item.stageText}
                    </Text>
                  </View>

                  <View style={styles.trackerFooterRow}>
                    <Text style={styles.trackerMetaLeft}>{item.detail}</Text>
                    <Text style={styles.trackerMetaRight}>{item.subDetail}</Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.fileAnotherBtn}
                onPress={() => setFisherTab('DECLARE')}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>➕</Text>
                <Text style={styles.fileAnotherText}>File Another Lost Gear Report</Text>
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
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // 4. RENDER: RESCUE BOAT CREW TACTICAL MISSION HUD
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a141d' }]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.headerLogoThumb}>
              <Image source={LOGO_IMG} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            </View>
            <View>
              <Text style={styles.hudSubHeader}>GHOSTNET TACTICAL HUD</Text>
              <Text style={styles.headerWelcomeText}>
                {language === 'TA' ? `மீட்புக் குழு: ${currentUser.name}` : currentUser.name}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
              <Text style={styles.langBadgeText}>
                {language === 'EN' ? 'தமிழ்' : 'EN'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchRoleBadge}
              onPress={() => setScreen('LOGIN_ROLE')}
            >
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>🔄 Switch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Operative Welcome Callout */}
        <View style={styles.operativeBanner}>
          <Text style={styles.operativeName}>Vessel: {currentUser.boatTag}</Text>
          <View style={styles.aisBadge}>
            <View style={styles.aisPingDot} />
            <Text style={styles.aisText}>AIS ACTIVE</Text>
          </View>
        </View>

        {/* Critical Net Alert Banner */}
        <View style={styles.criticalAlertCard}>
          <View style={styles.criticalAlertIconWrap}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={styles.criticalBadgeText}>CRITICAL NET</Text>
              <Text style={styles.criticalTimeText}>18m ago</Text>
            </View>
            <Text style={styles.criticalTitleText}>
              Monofilament Gillnet off Kasimedu (13.12°N, 80.31°E)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.criticalViewBtn}
            onPress={() => setCrewTab('REPORTS')}
          >
            <Text style={styles.criticalViewTxt}>VIEW</Text>
          </TouchableOpacity>
        </View>

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
              Reports Pending
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
              Current Mission
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB A: REPORTS PENDING QUEUE */}
        {crewTab === 'REPORTS' ? (
          <View style={{ gap: 14 }}>
            <View style={styles.queueStatusRow}>
              <Text style={styles.queueStatusTitle}>QUEUE: FIRST-COME, FIRST-SERVED</Text>
              <Text style={styles.queueStatusSubtitle}>2 HIGH HAZARD TARGETS</Text>
            </View>

            {targets.map((tgt) => (
              <View key={tgt.id} style={styles.targetCardDark}>
                <View style={[styles.targetSideStrip, { backgroundColor: tgt.accentColor }]} />
                <View style={styles.targetCardHeader}>
                  <View style={styles.targetPriorityBadge}>
                    <View style={[styles.targetPriorityDot, { backgroundColor: tgt.accentColor }]} />
                    <Text style={[styles.targetPriorityTxt, { color: tgt.accentColor }]}>
                      {tgt.priorityLabel} • {tgt.reportedAgo}
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
                    <Text style={styles.telemetryCellValue}>{tgt.massKg} kg</Text>
                  </View>
                  <View style={styles.telemetryCell}>
                    <Text style={styles.telemetryCellLabel}>Sector</Text>
                    <Text style={styles.telemetryCellValue}>{tgt.sector}</Text>
                  </View>
                </View>

                {/* Tactical Coordinates Readout */}
                <View style={styles.coordsReadoutRow}>
                  <Text style={{ fontSize: 16 }}>🧭</Text>
                  <Text style={styles.coordsReadoutVal}>{tgt.coords}</Text>
                  <Text style={styles.aisVectorText}>{tgt.aisVector}</Text>
                </View>

                {/* Accept Button */}
                <TouchableOpacity
                  style={styles.acceptMissionBtn}
                  onPress={() => handleStartMission(tgt)}
                >
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                  <Text style={styles.acceptMissionText}>Accept & Start Mission</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Environmental Summary */}
            <View style={styles.envSummaryCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🌊</Text>
                <View>
                  <Text style={styles.envLabel}>Sea State</Text>
                  <Text style={styles.envVal}>Chop 0.8m • Tidal Ebb 1.2kn</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.envLabel}>Wind</Text>
                <Text style={styles.envVal}>14 kn ENE</Text>
              </View>
            </View>
          </View>
        ) : (
          /* TAB B: CURRENT MISSION HUD NAVIGATION SCREEN */
          <View style={{ gap: 14 }}>
            {/* Active Mission Target Strip */}
            <View style={styles.engagedMissionCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.engagedBadge}>
                  <View style={styles.redPulsingDot} />
                  <Text style={styles.engagedBadgeText}>ENGAGED RESCUE INTERVENTION</Text>
                </View>
                <Text style={styles.etaText}>ETA 11 MIN</Text>
              </View>
              <Text style={styles.engagedTargetTitle}>
                Gillnet • 45 kg • Intercepted by {currentUser.name}
              </Text>
              <Text style={styles.engagedTargetSub}>
                🛡️ Acoustic beacon triangulated • Subsurface hazard depth 28m
              </Text>
            </View>

            {/* OFFSHORE NAUTICAL RADAR & CHART DISPLAY */}
            <View style={styles.radarCard}>
              <View style={styles.radarLegendTop}>
                <View style={styles.radarLegendPill}>
                  <View style={[styles.radarLegendDot, { backgroundColor: '#00f2fe' }]} />
                  <Text style={styles.radarLegendText}>Rescue Boat ({currentUser.boatTag})</Text>
                </View>
                <View style={styles.radarLegendPill}>
                  <View style={[styles.radarLegendDot, { backgroundColor: '#ff3366' }]} />
                  <Text style={styles.radarLegendText}>Ghost Net Target</Text>
                </View>
              </View>

              {/* Radar Compass Heading */}
              <View style={styles.compassPillTopRight}>
                <Text style={{ color: '#00f2fe', fontSize: 12 }}>🧭</Text>
                <Text style={styles.compassPillText}>N 042°</Text>
              </View>

              {/* Concentric Radar Graphics */}
              <View style={styles.radarCircleOuter}>
                <View style={styles.radarCircleMid}>
                  <View style={styles.radarCircleInner}>
                    {/* Boat Pin */}
                    <View style={styles.boatPin}>
                      <Text style={{ fontSize: 16 }}>🛥️</Text>
                    </View>
                  </View>
                </View>
                {/* Target Net Pin */}
                <View style={styles.netPin}>
                  <Text style={{ fontSize: 18 }}>🔴</Text>
                </View>
              </View>

              {/* Floating Tactical HUD Readout Bar */}
              <View style={styles.floatingHudBar}>
                <View style={styles.hudStatCol}>
                  <Text style={styles.hudStatLabel}>DISTANCE</Text>
                  <Text style={styles.hudStatVal}>1.8 NM</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.hudStatCol}>
                  <Text style={styles.hudStatLabel}>HEADING</Text>
                  <Text style={[styles.hudStatVal, { color: '#89ceff' }]}>042° NNE</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.hudStatCol}>
                  <Text style={styles.hudStatLabel}>SPEED</Text>
                  <Text style={[styles.hudStatVal, { color: '#00e475' }]}>12.4 kn</Text>
                </View>
              </View>
            </View>

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
                <Text style={styles.markRecoveredText}>Mark Mission Finished & Hauled Aboard</Text>
              </TouchableOpacity>
            </View>
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
                  <Text style={styles.modalTag}>OFFLINE SYNC ADVISORY</Text>
                  <Text style={styles.modalTitle}>Heading Offshore</Text>
                </View>
              </View>

              <View style={styles.modalTargetBox}>
                <Text style={styles.modalBoxLabel}>Selected Target:</Text>
                <Text style={styles.modalBoxTitle}>
                  {selectedTarget?.gearName} • {selectedTarget?.massKg} kg
                </Text>
                <Text style={styles.modalBoxCoords}>{selectedTarget?.coords}</Text>
              </View>

              <Text style={styles.modalWarningText}>
                ⚠️ Pre-Departure Marine Alert: You are heading offshore beyond coastal cell coverage. Download offline coastal satellite sector map now?
              </Text>

              <View style={{ gap: 8, marginTop: 6 }}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => confirmMissionLaunch(true)}
                >
                  <Text style={{ fontSize: 18 }}>📥</Text>
                  <Text style={styles.modalPrimaryBtnText}>Download Offline Map & Launch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => confirmMissionLaunch(false)}
                >
                  <Text style={styles.modalSecondaryBtnText}>Launch Online Only</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 6, alignItems: 'center' }}
                  onPress={() => setShowPreDepartureModal(false)}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>Cancel</Text>
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
                  <Text style={[styles.modalTag, { color: '#00e475' }]}>DECK VERIFICATION</Text>
                  <Text style={styles.modalTitle}>Gear Hauled Aboard</Text>
                </View>
              </View>

              <Text style={styles.modalWarningText}>
                Confirm crane scale measurement to finalize mission telemetry and reward coastal credits.
              </Text>

              <View style={styles.scaleWellBox}>
                <Text style={styles.scaleLabel}>ENTER VERIFIED RECOVERED WEIGHT</Text>
                <View style={styles.scaleStepperRow}>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    onPress={() => setVerifiedWeight(Math.max(1, verifiedWeight - 1))}
                  >
                    <Text style={styles.scaleBtnTxt}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.scaleValBox}>
                    <Text style={styles.scaleValTxt}>{verifiedWeight}</Text>
                    <Text style={styles.scaleValUnit}>kg</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    onPress={() => setVerifiedWeight(verifiedWeight + 1)}
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
                    Submit & Complete Ledger
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 6, alignItems: 'center' }}
                  onPress={() => setShowVerificationModal(false)}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>Cancel</Text>
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
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  headerLogoThumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#060f18', overflow: 'hidden', padding: 2 },
  headerWelcomeText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  headerSubtitleText: { color: '#94a3b8', fontSize: 12 },
  hudSubHeader: { color: '#00f2fe', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  langBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  langBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  switchRoleBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: '#212b35', alignItems: 'center', justifyContent: 'center' },
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
  gpsUpdateBtn: { backgroundColor: '#060f18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  gpsUpdateBtnText: { color: '#6ff6ff', fontSize: 11, fontWeight: '700' },
  polarFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  polarFooterMeta: { color: '#475569', fontSize: 11 },
  autoTag: { color: '#0f172a', backgroundColor: '#e2e8f0', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectionHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  selectedGearCard: { borderWidth: 2, borderColor: '#00a2e6' },
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
  telemetryGrid: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  telemetryCell: { flex: 1, backgroundColor: '#17202a', padding: 8, borderRadius: 8 },
  telemetryCellLabel: { color: '#b9cacb', fontSize: 10 },
  telemetryCellValue: { color: '#dae3f1', fontSize: 13, fontWeight: '700', marginTop: 2 },
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
  radarCircleOuter: { width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: '#2c3640', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginVertical: 18, position: 'relative' },
  radarCircleMid: { width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: '#212b35', alignItems: 'center', justifyContent: 'center' },
  radarCircleInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#00dce6', alignItems: 'center', justifyContent: 'center' },
  boatPin: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  netPin: { position: 'absolute', top: 14, right: 28 },
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
