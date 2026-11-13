import { createContext, useContext, type ReactNode } from 'react';

export type Lang = 'en' | 'kn';

const en = {
  switchLanguage: 'ಕನ್ನಡ',
  switchLanguageAria: 'Switch to Kannada',
  demo: 'DEMO DATA',
  simulated: 'SIMULATED',
  live: 'LIVE',
  offlineDemo: 'Preview mode',
  splash: {
    eyebrow: 'Rural student arrival assurance',
    titleLead: 'When the bus fails,',
    titleAccent: 'the journey',
    titleTail: "shouldn't end.",
    body: 'A verified seat — or an honest answer. Nothing invented.',
    enter: 'Enter student portal',
    meta: 'Mobile-first · English & ಕನ್ನಡ · built for the last mile',
    trust: ['Verified vehicles only', 'No overbooking', 'Honest when no seat exists'],
    routeCaption: 'Route C recovery window',
    van: 'V1 school van',
    seats: '8 verified seats',
    eta: 'Arrives 08:55',
    demoNote: 'All transport data is simulated for this demo.',
  },
  page: {
    kicker: 'Student commute',
    title: 'Will my bus',
    titleAccent: 'actually',
    titleTail: 'come?',
    subtitle:
      'One tap tells your school what went wrong. Then you see a verified seat — or the truth.',
    replayIntro: 'Replay intro',
    demoHint: 'SIMULATED · Demo District College · 09:00 class deadline',
  },
  commute: {
    step: 'Step 1 · Your commute',
    title: 'Where are you headed?',
    subtitle: 'Pick your village and check the bus the school would send.',
    village: 'Village',
    college: 'College',
    classStart: 'Demo class deadline',
    bus: 'Step 2 · Bus status',
    route: 'Route C',
    pickup: 'Pickup',
    arrives: 'Arrives',
    class: 'Class',
    onSchedule: 'On schedule',
    reported: 'Reported · unverified',
    verified: 'Coordinator verified',
    disruption: 'Your usual bus is disrupted',
    disruptionBody:
      'B2 was reported broken down. No replacement seat is promised until a coordinator verifies it.',
    verifiedBody:
      'Your coordinator has verified the disruption. A recovery plan is being prepared for affected students.',
    noBus: 'No verified bus for this campus',
    noBusBody: 'This demo fixture has no bus serving the selected campus. You can still report the trip.',
    report: "My bus isn't coming",
    reportAgain: 'Update my report',
    reportHint: 'Takes about 10 seconds · No account needed',
    checked: 'Checked just now',
    demand: 'Demand signal',
    notLive: 'not live data',
    reports: 'reports',
    verifiedSeats: 'verified seats',
    seatsAvailable: 'seats available',
    highDemand: 'Very high demand',
    filling: 'Filling fast',
  },
  recovery: {
    step: 'Step 2 · Your recovery status',
    title: 'Nothing invented here.',
    idleTitle: 'Nothing confirmed yet',
    idleBody:
      "If your bus doesn't show, report it. This card will only show verified vehicles — never hopeful guesses.",
    next: 'What happens next',
    nextSteps: [
      'You report in one tap',
      'Your coordinator verifies the incident',
      'A verified seat — or an honest no',
    ],
    reportedTitle: 'Report received',
    reportedBody:
      'Your report is a signal, not a confirmed incident. No seat is promised yet. Your school verifies it first.',
    verifiedTitle: 'Disruption verified',
    verifiedBody:
      'The school has confirmed your report. The recovery engine is now drafting a plan using verified vehicles only.',
    proposedTitle: 'A verified seat is proposed',
    proposedBody:
      'This is a draft. It becomes yours only when the coordinator approves the plan.',
    confirmedTitle: 'Your seat is confirmed',
    confirmedBody: 'Be at the pickup point five minutes early. The seat is reserved once.',
    unservedTitle: 'No safe seat this time',
    unservedBody:
      "Every verified seat is taken, or the remaining vehicle can't reach class on time. We won't invent a ride.",
    escalate: 'Ask school for help',
    escalatedTitle: 'School help requested',
    escalatedBody:
      'Your request is saved for the transport desk. No SMS or WhatsApp was sent, and no seat is promised.',
    noSms: 'In-app request only · No SMS or WhatsApp',
    draftNote: 'Draft only — awaiting coordinator approval.',
    confirmedNote: 'Confirmed once. No duplicate booking. Cancelling returns the seat.',
    seated: 'Seat promised only after approval',
    reportSummary: 'Your report',
    arrivesBefore: 'Arrives before your 09:00 class',
  },
  timeline: {
    report: 'Reported',
    verify: 'Verified',
    propose: 'Seat drafted',
    outcome: 'Final status',
    done: 'Done',
    active: 'Now',
    waiting: 'Waiting',
    confirmed: 'Confirmed',
    noSeat: 'No seat',
  },
  report: {
    title: 'What went wrong?',
    subtitle:
      'This reaches your transport coordinator as a signal. It is not a confirmed incident yet.',
    choose: 'Choose what you saw',
    issues: {
      no_show: 'Bus absent',
      full: 'Bus full',
      delay: 'Running late',
      breakdown: 'Breakdown',
      road_block: 'Road blocked',
    },
    freeText: 'Tell us in your own words',
    placeholder: 'e.g. Naale bus illa, college hogbeku…',
    samples: 'Try a Kannada sample',
    sampleList: ['Naale bus illa', 'Bus thumba full ide', 'Raste blocked ide'],
    assist: 'Keyword assist',
    idle: 'Type or choose an option',
    detected: 'Detected',
    deterministic: 'Deterministic keyword match — not live AI',
    send: 'Send report',
    cancel: 'Cancel',
    close: 'Close report sheet',
    disclaimer:
      'A report is not a seat. Your coordinator must verify the incident before any seat exists.',
    offline: 'You are offline. This report is saved on this device, not sent to school.',
    required: 'Choose an issue or describe it in your own words.',
  },
  demoDock: {
    open: 'Preview controls',
    close: 'Close preview controls',
    title: 'Simulated coordinator actions',
    note: 'Person 3 preview. These buttons stand in for the coordinator track and never touch the real engine or database.',
    stage: 'Current preview stage',
    confirm: 'Verify incident',
    draft: 'Draft seat plan',
    approve: 'Approve plan',
    unserved: 'Preview no-seat case',
    escalate: 'Request school help',
    reset: 'Reset preview',
    hint: 'Follow the journey in order, or jump to the honest no-seat case.',
    stages: {
      idle: 'No request',
      reported: 'Reported · unverified',
      verified: 'Incident verified',
      proposed: 'Seat proposed',
      confirmed: 'Seat confirmed',
      unserved: 'Unserved · honest',
      escalated: 'School help requested',
    },
  },
  status: {
    reported: 'Reported',
    verified: 'Verified',
    proposed: 'Seat proposed',
    confirmed: 'Confirmed',
    unserved: 'Unserved',
    escalated: 'Help requested',
    idle: 'Waiting',
  },
  footer: {
    replay: 'Replay intro',
    data:
      'All transport options, times, and allocations in this interface are SIMULATED. No live GPS, dispatch, SMS, or WhatsApp.',
  },
};

export type Copy = typeof en;

const kn: Copy = {
  switchLanguage: 'English',
  switchLanguageAria: 'Switch to English',
  demo: 'ಡೆಮೊ ಡೇಟಾ',
  simulated: 'ಸಿಮ್ಯುಲೇಟೆಡ್',
  live: 'ನೇರ',
  offlineDemo: 'ಮುನ್ನೋಟ ಮೋಡ್',
  splash: {
    eyebrow: 'ಗ್ರಾಮೀಣ ವಿದ್ಯಾರ್ಥಿ ಆಗಮನ ಭರವಸೆ',
    titleLead: 'ಬಸ್ ಬಾರದಿದ್ದರೆ,',
    titleAccent: 'ಪ್ರಯಾಣ',
    titleTail: 'ನಿಲ್ಲಬಾರದು.',
    body: 'ಪರಿಶೀಲಿಸಿದ ಸೀಟ್ — ಅಥವಾ ಪ್ರಾಮಾಣಿಕ ಉತ್ತರ. ಏನನ್ನೂ ಕಲ್ಪಿಸುವುದಿಲ್ಲ.',
    enter: 'ವಿದ್ಯಾರ್ಥಿ ಪೋರ್ಟಲ್ ಪ್ರವೇಶಿಸಿ',
    meta: 'ಮೊಬೈಲ್ ಮೊದಲು · English & ಕನ್ನಡ · ಕೊನೆಯ ಮೈಲಿಗಾಗಿ',
    trust: ['ಪರಿಶೀಲಿಸಿದ ವಾಹನಗಳಷ್ಟೇ', 'ಅಧಿಕ ಬುಕಿಂಗ್ ಇಲ್ಲ', 'ಸೀಟ್ ಇಲ್ಲದಿದ್ದರೆ ನಿಜ'],
    routeCaption: 'ಮಾರ್ಗ C ಮರುಪ್ರಯಾಣ ಅವಕಾಶ',
    van: 'V1 ಶಾಲಾ ವ್ಯಾನ್',
    seats: '8 ಪರಿಶೀಲಿಸಿದ ಸೀಟುಗಳು',
    eta: '08:55ಕ್ಕೆ ತಲುಪುತ್ತದೆ',
    demoNote: 'ಈ ಡೆಮೊದ ಎಲ್ಲಾ ಸಾರಿಗೆ ಮಾಹಿತಿ ಸಿಮ್ಯುಲೇಟೆಡ್.',
  },
  page: {
    kicker: 'ವಿದ್ಯಾರ್ಥಿ ಪ್ರಯಾಣ',
    title: 'ನನ್ನ ಬಸ್',
    titleAccent: 'ನಿಜವಾಗಿಯೂ',
    titleTail: 'ಬರುತ್ತದೆಯೇ?',
    subtitle:
      'ಒಂದು ಸ್ಪರ್ಶದಲ್ಲಿ ನಿಮ್ಮ ಶಾಲೆಗೆ ಏನು ತಪ್ಪಾಗಿದೆ ಎಂದು ತಿಳಿಸಿ. ನಂತರ ಪರಿಶೀಲಿಸಿದ ಸೀಟ್ — ಅಥವಾ ನಿಜ.',
    replayIntro: 'ಪರಿಚಯ ಮತ್ತೆ ನೋಡಿ',
    demoHint: 'ಸಿಮ್ಯುಲೇಟೆಡ್ · ಡೆಮೊ ಜಿಲ್ಲಾ ಕಾಲೇಜು · 09:00 ಗಡುವು',
  },
  commute: {
    step: 'ಹಂತ 1 · ನಿಮ್ಮ ಪ್ರಯಾಣ',
    title: 'ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?',
    subtitle: 'ನಿಮ್ಮ ಗ್ರಾಮವನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಶಾಲೆ ಕಳುಹಿಸುವ ಬಸ್ ಪರಿಶೀಲಿಸಿ.',
    village: 'ಗ್ರಾಮ',
    college: 'ಕಾಲೇಜು',
    classStart: 'ಡೆಮೊ ತರಗತಿ ಗಡುವು',
    bus: 'ಹಂತ 2 · ಬಸ್ ಸ್ಥಿತಿ',
    route: 'ಮಾರ್ಗ C',
    pickup: 'ಪಿಕಪ್',
    arrives: 'ತಲುಪುವಿಕೆ',
    class: 'ತರಗತಿ',
    onSchedule: 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ',
    reported: 'ವರದಿ · ಪರಿಶೀಲಿಸಿಲ್ಲ',
    verified: 'ಸಂಯೋಜಕರು ದೃಢಪಡಿಸಿದ್ದಾರೆ',
    disruption: 'ನಿಮ್ಮ ಬಸ್‌ಗೆ ಅಡಚಣೆ',
    disruptionBody:
      'B2 ಕೆಟ್ಟುಹೋಗಿದೆ ಎಂದು ವರದಿಯಾಗಿದೆ. ಸಂಯೋಜಕರು ಪರಿಶೀಲಿಸುವವರೆಗೆ ಬದಲಿ ಸೀಟಿನ ಭರವಸೆ ಇಲ್ಲ.',
    verifiedBody:
      'ಸಂಯೋಜಕರು ಅಡಚಣೆಯನ್ನು ದೃಢಪಡಿಸಿದ್ದಾರೆ. ಪರಿಣಾಮಿತ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಯೋಜನೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.',
    noBus: 'ಈ ಕಾಲೇಜಿಗೆ ಪರಿಶೀಲಿಸಿದ ಬಸ್ ಇಲ್ಲ',
    noBusBody: 'ಆಯ್ಕೆಮಾಡಿದ ಕಾಲೇಜಿಗೆ ಈ ಡೆಮೊದಲ್ಲಿ ಬಸ್ ಇಲ್ಲ. ಪ್ರಯಾಣದ ಬಗ್ಗೆ ವರದಿ ಮಾಡಬಹುದು.',
    report: 'ನನ್ನ ಬಸ್ ಬರುತ್ತಿಲ್ಲ',
    reportAgain: 'ನನ್ನ ವರದಿ ಬದಲಿಸಿ',
    reportHint: 'ಸುಮಾರು 10 ಸೆಕೆಂಡು · ಖಾತೆ ಬೇಕಿಲ್ಲ',
    checked: 'ಈಗಷ್ಟೇ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    demand: 'ಬೇಡಿಕೆ ಸೂಚನೆ',
    notLive: 'ನೇರ ಮಾಹಿತಿ ಅಲ್ಲ',
    reports: 'ವರದಿಗಳು',
    verifiedSeats: 'ಪರಿಶೀಲಿಸಿದ ಸೀಟುಗಳು',
    seatsAvailable: 'ಸೀಟುಗಳು ಲಭ್ಯ',
    highDemand: 'ತುಂಬಾ ಹೆಚ್ಚು ಬೇಡಿಕೆ',
    filling: 'ಬೇಗ ತುಂಬುತ್ತಿದೆ',
  },
  recovery: {
    step: 'ಹಂತ 2 · ನಿಮ್ಮ ಮರುಪ್ರಯಾಣ ಸ್ಥಿತಿ',
    title: 'ಇಲ್ಲಿ ಏನನ್ನೂ ಕಲ್ಪಿಸುವುದಿಲ್ಲ.',
    idleTitle: 'ಇನ್ನೂ ಯಾವುದೂ ದೃಢಪಟ್ಟಿಲ್ಲ',
    idleBody:
      'ಬಸ್ ಬಾರದಿದ್ದರೆ ವರದಿ ಮಾಡಿ. ಇಲ್ಲಿ ಪರಿಶೀಲಿಸಿದ ವಾಹನಗಳಷ್ಟೇ ಕಾಣುತ್ತವೆ — ಊಹೆಗಳಲ್ಲ.',
    next: 'ಮುಂದೆ ಏನಾಗುತ್ತದೆ',
    nextSteps: [
      'ಒಂದು ಸ್ಪರ್ಶದಲ್ಲಿ ವರದಿ',
      'ಸಂಯೋಜಕರು ಘಟನೆ ಪರಿಶೀಲಿಸುತ್ತಾರೆ',
      'ಪರಿಶೀಲಿಸಿದ ಸೀಟ್ — ಅಥವಾ ಪ್ರಾಮಾಣಿಕ "ಇಲ್ಲ"',
    ],
    reportedTitle: 'ವರದಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
    reportedBody:
      'ನಿಮ್ಮ ವರದಿ ಸೂಚನೆ, ದೃಢಪಟ್ಟ ಘಟನೆ ಅಲ್ಲ. ಇನ್ನೂ ಸೀಟಿನ ಭರವಸೆ ಇಲ್ಲ. ಮೊದಲು ಶಾಲೆ ಪರಿಶೀಲಿಸುತ್ತದೆ.',
    verifiedTitle: 'ಅಡಚಣೆ ದೃಢಪಟ್ಟಿದೆ',
    verifiedBody:
      'ಶಾಲೆ ನಿಮ್ಮ ವರದಿಯನ್ನು ದೃಢಪಡಿಸಿದೆ. ಪರಿಶೀಲಿಸಿದ ವಾಹನಗಳಿಂದ ಯೋಜನೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ.',
    proposedTitle: 'ಪರಿಶೀಲಿಸಿದ ಸೀಟ್ ಪ್ರಸ್ತಾಪ',
    proposedBody: 'ಇದು ಕರಡು. ಸಂಯೋಜಕರು ಅನುಮೋದಿಸಿದಾಗ ಮಾತ್ರ ಇದು ನಿಮ್ಮದಾಗುತ್ತದೆ.',
    confirmedTitle: 'ನಿಮ್ಮ ಸೀಟ್ ದೃಢಪಟ್ಟಿದೆ',
    confirmedBody: 'ಪಿಕಪ್ ಸ್ಥಳಕ್ಕೆ ಐದು ನಿಮಿಷ ಮೊದಲು ಬನ್ನಿ. ಸೀಟ್ ಒಮ್ಮೆ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.',
    unservedTitle: 'ಈ ಬಾರಿ ಸುರಕ್ಷಿತ ಸೀಟ್ ಇಲ್ಲ',
    unservedBody:
      'ಎಲ್ಲಾ ಪರಿಶೀಲಿಸಿದ ಸೀಟುಗಳು ತುಂಬಿವೆ, ಅಥವಾ ಉಳಿದ ವಾಹನ ಸಮಯಕ್ಕೆ ತಲುಪಲಾರದು. ಸುಳ್ಳು ಪ್ರಯಾಣ ಸೂಚಿಸುವುದಿಲ್ಲ.',
    escalate: 'ಶಾಲೆಯ ಸಹಾಯ ಕೇಳಿ',
    escalatedTitle: 'ಶಾಲಾ ಸಹಾಯ ಕೋರಲಾಗಿದೆ',
    escalatedBody:
      'ನಿಮ್ಮ ವಿನಂತಿ ಸಾರಿಗೆ ವಿಭಾಗಕ್ಕೆ ಉಳಿಸಲಾಗಿದೆ. SMS ಅಥವಾ WhatsApp ಕಳುಹಿಸಿಲ್ಲ, ಸೀಟಿನ ಭರವಸೆ ಇಲ್ಲ.',
    noSms: 'ಆ್ಯಪ್‌ನಲ್ಲಿನ ವಿನಂತಿ ಮಾತ್ರ · SMS ಅಥವಾ WhatsApp ಇಲ್ಲ',
    draftNote: 'ಕರಡು ಮಾತ್ರ — ಸಂಯೋಜಕರ ಅನುಮೋದನೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ.',
    confirmedNote: 'ಒಮ್ಮೆ ದೃಢ. ಎರಡನೇ ಬುಕಿಂಗ್ ಇಲ್ಲ. ರದ್ದುಮಾಡಿದರೆ ಸೀಟ್ ಮತ್ತೆ ಲಭ್ಯ.',
    seated: 'ಅನುಮೋದನೆಯ ನಂತರವೇ ಸೀಟ್ ಭರವಸೆ',
    reportSummary: 'ನಿಮ್ಮ ವರದಿ',
    arrivesBefore: '09:00 ತರಗತಿಗೆ ಮೊದಲು ತಲುಪುತ್ತದೆ',
  },
  timeline: {
    report: 'ವರದಿ',
    verify: 'ಪರಿಶೀಲನೆ',
    propose: 'ಸೀಟ್ ಸಿದ್ಧತೆ',
    outcome: 'ಅಂತಿಮ ಸ್ಥಿತಿ',
    done: 'ಪೂರ್ಣ',
    active: 'ಈಗ',
    waiting: 'ಕಾಯುತ್ತಿದೆ',
    confirmed: 'ದೃಢ',
    noSeat: 'ಸೀಟ್ ಇಲ್ಲ',
  },
  report: {
    title: 'ಏನು ತಪ್ಪಾಯಿತು?',
    subtitle: 'ಇದು ಸಂಯೋಜಕರಿಗೆ ಸೂಚನೆಯಾಗಿ ತಲುಪುತ್ತದೆ. ಇನ್ನೂ ದೃಢಪಟ್ಟ ಘಟನೆ ಅಲ್ಲ.',
    choose: 'ನೀವು ನೋಡಿದ್ದನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    issues: {
      no_show: 'ಬಸ್ ಬರಲಿಲ್ಲ',
      full: 'ಬಸ್ ತುಂಬಿದೆ',
      delay: 'ತಡವಾಗಿದೆ',
      breakdown: 'ಬಸ್ ಕೆಟ್ಟಿದೆ',
      road_block: 'ರಸ್ತೆ ತಡೆ',
    },
    freeText: 'ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ',
    placeholder: 'ಉದಾ. ನಾಳೆ ಬಸ್ ಇಲ್ಲ, ಕಾಲೇಜಿಗೆ ಹೋಗಬೇಕು…',
    samples: 'ಕನ್ನಡ ಮಾದರಿ ಪ್ರಯತ್ನಿಸಿ',
    sampleList: ['ನಾಳೆ ಬಸ್ ಇಲ್ಲ', 'ಬಸ್ ತುಂಬಾ ಫುಲ್ ಇದೆ', 'ರಸ್ತೆ ಬ್ಲಾಕ್ ಇದೆ'],
    assist: 'ಕೀವರ್ಡ್ ಸಹಾಯ',
    idle: 'ಪಠ್ಯ ಬರೆಯಿರಿ ಅಥವಾ ಆಯ್ಕೆ ಮಾಡಿ',
    detected: 'ಗುರುತಿಸಲಾಗಿದೆ',
    deterministic: 'ನಿಗದಿತ ಕೀವರ್ಡ್ ಹೊಂದಾಣಿಕೆ — ನೇರ AI ಅಲ್ಲ',
    send: 'ವರದಿ ಕಳುಹಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    close: 'ವರದಿ ಪಟ್ಟಿ ಮುಚ್ಚಿ',
    disclaimer: 'ವರದಿ ಸೀಟಲ್ಲ. ಸಂಯೋಜಕರು ಘಟನೆ ಪರಿಶೀಲಿಸಿದ ನಂತರವೇ ಸೀಟ್.',
    offline: 'ನೀವು ಆಫ್‌ಲೈನ್. ಈ ವರದಿ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗುತ್ತದೆ, ಶಾಲೆಗೆ ಕಳುಹಿಸುವುದಿಲ್ಲ.',
    required: 'ಸಮಸ್ಯೆ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ವಿವರಿಸಿ.',
  },
  demoDock: {
    open: 'ಮುನ್ನೋಟ ನಿಯಂತ್ರಣ',
    close: 'ಮುನ್ನೋಟ ನಿಯಂತ್ರಣ ಮುಚ್ಚಿ',
    title: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಸಂಯೋಜಕ ಕ್ರಿಯೆಗಳು',
    note: 'Person 3 ಮುನ್ನೋಟ. ಈ ಬಟನ್‌ಗಳು ಸಂಯೋಜಕ ತಂಡದ ಪಾತ್ರ; ನಿಜವಾದ ಎಂಜಿನ್ ಅಥವಾ ಡೇಟಾಬೇಸ್ ಸ್ಪರ್ಶಿಸುವುದಿಲ್ಲ.',
    stage: 'ಪ್ರಸ್ತುತ ಮುನ್ನೋಟ ಹಂತ',
    confirm: 'ಘಟನೆ ದೃಢಪಡಿಸಿ',
    draft: 'ಸೀಟ್ ಯೋಜನೆ ಸಿದ್ಧಪಡಿಸಿ',
    approve: 'ಯೋಜನೆ ಅನುಮೋದಿಸಿ',
    unserved: 'ಸೀಟ್ ಇಲ್ಲದ ಸ್ಥಿತಿ ನೋಡಿ',
    escalate: 'ಶಾಲಾ ಸಹಾಯ ಕೇಳಿ',
    reset: 'ಮುನ್ನೋಟ ಮರುಹೊಂದಿಸಿ',
    hint: 'ಪ್ರಯಾಣವನ್ನು ಕ್ರಮವಾಗಿ ಅನುಸರಿಸಿ, ಅಥವಾ ನೇರವಾಗಿ ಪ್ರಾಮಾಣಿಕ "ಸೀಟ್ ಇಲ್ಲ" ಸ್ಥಿತಿಗೆ ಹೋಗಿ.',
    stages: {
      idle: 'ವಿನಂತಿ ಇಲ್ಲ',
      reported: 'ವರದಿ · ಪರಿಶೀಲಿಸಿಲ್ಲ',
      verified: 'ಘಟನೆ ದೃಢ',
      proposed: 'ಸೀಟ್ ಪ್ರಸ್ತಾಪ',
      confirmed: 'ಸೀಟ್ ದೃಢ',
      unserved: 'ಸೇವೆ ಇಲ್ಲ · ಪ್ರಾಮಾಣಿಕ',
      escalated: 'ಶಾಲಾ ಸಹಾಯ ಕೋರಲಾಗಿದೆ',
    },
  },
  status: {
    reported: 'ವರದಿ',
    verified: 'ದೃಢ',
    proposed: 'ಸೀಟ್ ಪ್ರಸ್ತಾಪ',
    confirmed: 'ದೃಢ',
    unserved: 'ಸೇವೆ ಇಲ್ಲ',
    escalated: 'ಸಹಾಯ ಕೋರಲಾಗಿದೆ',
    idle: 'ಕಾಯುತ್ತಿದೆ',
  },
  footer: {
    replay: 'ಪರಿಚಯ ಮತ್ತೆ ನೋಡಿ',
    data:
      'ಈ ಮುನ್ನೋಟದ ಎಲ್ಲಾ ಸಾರಿಗೆ ಆಯ್ಕೆ, ಸಮಯ ಮತ್ತು ಹಂಚಿಕೆ ಸಿಮ್ಯುಲೇಟೆಡ್. ನೇರ GPS, ರವಾನೆ, SMS ಅಥವಾ WhatsApp ಇಲ್ಲ.',
  },
};

const CopyContext = createContext<{
  lang: Lang;
  t: Copy;
  setLang: (lang: Lang) => void;
} | null>(null);

export function LanguageProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: ReactNode;
}) {
  return (
    <CopyContext.Provider value={{ lang, t: lang === 'kn' ? kn : en, setLang }}>
      {children}
    </CopyContext.Provider>
  );
}

export function useCopy() {
  const ctx = useContext(CopyContext);
  if (!ctx) throw new Error('useCopy must be used inside LanguageProvider');
  return ctx;
}
