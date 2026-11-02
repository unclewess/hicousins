import { describe, it, expect, beforeEach } from 'vitest';
import { store, MOCK_USERS } from '../services/store';

describe('Phase 3 Acceptance Tests: Attendance, Voting & Elections, Welfare, Notices', () => {
  beforeEach(() => {
    store.resetAllToMigrationBenchmark();
    // Default to President user for setup
    store.switchUser(MOCK_USERS[0]); // Winnie Mbidhi (President)
  });

  // Acceptance Test 1: Secret ballot secrecy
  it('1. A secret ballot never exposes any voter\'s choice, even to Chief Whips', () => {
    const motions = store.getMotions();
    const secretMotion = motions.find(m => m.ballotType === 'Secret');
    expect(secretMotion).toBeDefined();

    const motionId = secretMotion!.id;

    // Member Wendy Odindo votes 'Yes'
    const wendyMemberId = 'mem-ndh-001';
    const voteResult = store.castVote(motionId, wendyMemberId, 'Yes');
    expect(voteResult.success).toBe(true);

    // Verify Turnout: Wendy is recorded as having voted (turnout)
    const turnout = store.getTurnout(motionId);
    expect(turnout.some(t => t.memberId === wendyMemberId)).toBe(true);

    // Switch to Chief Whip 1 (Eugene Nyasio)
    const chiefWhipUser = MOCK_USERS.find(u => u.role === 'Chief Whip 1')!;
    store.switchUser(chiefWhipUser);

    // Chief Whip inspects ballots
    const ballots = store.getBallots(motionId);
    expect(ballots.length).toBeGreaterThan(0);

    // CRITICAL: In secret ballots, voterMemberId MUST be strictly undefined
    for (const b of ballots) {
      expect(b.voterMemberId).toBeUndefined();
    }

    // Chief Whip also cannot vote twice with same member
    expect(store.canVote(wendyMemberId, motionId).eligible).toBe(false);
  });

  // Acceptance Test 2: Conflict of interest in elections
  it('2. A candidate cannot administer their own election', () => {
    const candidates = [
      { memberId: 'mem-ndh-040', memberName: 'Eugene Nyasio' },
      { memberId: 'mem-ndh-002', memberName: 'Edith Hwaga' }
    ];

    // Eugene Nyasio is Chief Whip 1 ('mem-ndh-040').
    // If he is a candidate, he CANNOT be the returning officer for this election!
    const conflictCheck = store.canAdministerElection('mem-ndh-040', candidates);
    expect(conflictCheck.eligible).toBe(false);
    expect(conflictCheck.reason).toContain('Conflict of interest');

    // Attempting to create an election motion where returning officer is a candidate must be rejected
    const createResult = store.createMotion({
      title: 'Disputed Chief Whip Election',
      description: 'Election test for conflict of interest',
      motionType: 'Election',
      ballotType: 'Secret',
      targetRole: 'Chief Whip 1',
      options: ['mem-ndh-040', 'mem-ndh-002'],
      candidates,
      returningOfficerId: 'mem-ndh-040', // Candidate administering own election!
      openUntil: '2026-12-31T00:00:00Z'
    });
    expect(createResult.success).toBe(false);
    expect(createResult.error).toContain('Conflict of interest');

    // When Auditor Noel Oduor ('mem-ndh-008') takes over, it succeeds!
    const validOfficerCheck = store.canAdministerElection('mem-ndh-008', candidates);
    expect(validOfficerCheck.eligible).toBe(true);

    const validCreateResult = store.createMotion({
      title: 'Valid Chief Whip Election',
      description: 'Auditor administers election where Chief Whip is a candidate',
      motionType: 'Election',
      ballotType: 'Secret',
      targetRole: 'Chief Whip 1',
      options: ['mem-ndh-040', 'mem-ndh-002'],
      candidates,
      returningOfficerId: 'mem-ndh-008', // Auditor Noel Oduor taking over
      openUntil: '2026-12-31T00:00:00Z'
    });
    expect(validCreateResult.success).toBe(true);
  });

  // Acceptance Test 3: Stand for office eligibility (Fred Michael vs Edith Hwaga)
  it('3. Fred Michael (4 months behind) cannot be nominated; Edith Hwaga (2 months behind) can', () => {
    const members = store.getMembers();
    const fredMichael = members.find(m => m.fullName.toLowerCase().includes('fred michael'));
    const edithHwaga = members.find(m => m.fullName.toLowerCase().includes('edith hwaga'));

    expect(fredMichael).toBeDefined();
    expect(edithHwaga).toBeDefined();

    // Fred Michael: 4 months behind (red traffic light) -> cannot stand for office (max is 2)
    const fredNomination = store.canNominateCandidate(fredMichael!.id);
    expect(fredNomination.eligible).toBe(false);
    expect(fredNomination.reason).toContain('4 months behind');

    // Edith Hwaga: 2 months behind (yellow traffic light) -> CAN stand for office
    const edithNomination = store.canNominateCandidate(edithHwaga!.id);
    expect(edithNomination.eligible).toBe(true);

    // Inactive members (Left / Deceased / Never Active) can never be nominated
    const donaldOyoo = members.find(m => m.fullName.toLowerCase().includes('donald oyoo')); // Left
    const allanOgara = members.find(m => m.fullName.toLowerCase().includes('allan ogara')); // Deceased
    if (donaldOyoo) expect(store.canNominateCandidate(donaldOyoo.id).eligible).toBe(false);
    if (allanOgara) expect(store.canNominateCandidate(allanOgara.id).eligible).toBe(false);
  });

  // Acceptance Test 4: Member in arrears can vote
  it('4. A member in arrears can vote', () => {
    const motions = store.getMotions();
    const openMotion = motions.find(m => m.status === 'Open');
    expect(openMotion).toBeDefined();

    const members = store.getMembers();
    // Aaron Oduor is 10 months behind; Fred Michael is 4 months behind
    const aaronOduor = members.find(m => m.fullName.toLowerCase().includes('aaron oduor'))!;
    const fredMichael = members.find(m => m.fullName.toLowerCase().includes('fred michael'))!;

    // Both members in arrears are eligible to vote
    expect(store.canVote(aaronOduor.id, openMotion!.id).eligible).toBe(true);
    expect(store.canVote(fredMichael.id, openMotion!.id).eligible).toBe(true);

    // Aaron casts his vote
    const voteResult = store.castVote(openMotion!.id, aaronOduor.id, openMotion!.options[0]);
    expect(voteResult.success).toBe(true);

    // Left or Deceased members cannot vote
    const donaldOyoo = members.find(m => m.fullName.toLowerCase().includes('donald oyoo'));
    if (donaldOyoo) expect(store.canVote(donaldOyoo.id, openMotion!.id).eligible).toBe(false);
  });

  // Acceptance Test 5: Welfare case notes privacy and view logging
  it('5. Welfare notes are invisible to everyone except Chief Whips and the President, and each view is logged', () => {
    const cases = store.getWelfareCases();
    expect(cases.length).toBeGreaterThan(0);
    const targetCase = cases[0];

    // 1. Switch to Treasurer Wesley Mbidhi (Unauthorized official)
    const treasurerUser = MOCK_USERS.find(u => u.role === 'Treasurer 1')!;
    store.switchUser(treasurerUser);

    const treasurerView = store.viewWelfareCaseNotes(targetCase.id);
    expect(treasurerView.success).toBe(false);
    expect(treasurerView.error).toContain('Access denied');

    // 2. Switch to Auditor Noel Oduor (Unauthorized official)
    const auditorUser = MOCK_USERS.find(u => u.role === 'Auditor')!;
    store.switchUser(auditorUser);

    const auditorView = store.viewWelfareCaseNotes(targetCase.id);
    expect(auditorView.success).toBe(false);
    expect(auditorView.error).toContain('Access denied');

    // 3. Switch to President Winnie Mbidhi (Authorized)
    const presidentUser = MOCK_USERS.find(u => u.role === 'President')!;
    store.switchUser(presidentUser);

    const presidentView = store.viewWelfareCaseNotes(targetCase.id);
    expect(presidentView.success).toBe(true);
    expect(presidentView.notes).toContain('Hospital');

    // Check that view log was written
    const logsAfterPresident = store.getCaseViewLogs(targetCase.id);
    expect(logsAfterPresident.length).toBeGreaterThan(0);
    expect(logsAfterPresident[0].viewedRole).toBe('President');
    expect(logsAfterPresident[0].viewedByUserId).toBe(presidentUser.id);

    // 4. Switch to Chief Whip Eugene Nyasio (Authorized)
    const chiefWhipUser = MOCK_USERS.find(u => u.role === 'Chief Whip 1')!;
    store.switchUser(chiefWhipUser);

    const chiefWhipView = store.viewWelfareCaseNotes(targetCase.id);
    expect(chiefWhipView.success).toBe(true);
    expect(chiefWhipView.notes).toBeDefined();

    const logsAfterChiefWhip = store.getCaseViewLogs(targetCase.id);
    expect(logsAfterChiefWhip[0].viewedRole).toBe('Chief Whip 1');
    expect(logsAfterChiefWhip[0].viewedByUserId).toBe(chiefWhipUser.id);
  });

  // Acceptance Test 6: Attendance tracking and percentage calculation
  it('6. Member check-in and attendance percentage calculation', () => {
    const meetings = store.getMeetings();
    expect(meetings.length).toBeGreaterThan(0);
    const completedMeeting = meetings.find(m => m.status === 'Completed');
    expect(completedMeeting).toBeDefined();

    // Wendy Odindo was Present in meet-001
    const summaryWendy = store.getMemberAttendanceSummary('mem-ndh-001');
    expect(summaryWendy.attendedMeetings).toBe(1);
    expect(summaryWendy.attendanceRate).toBe(100);

    // Edith Hwaga had an Apology (absent) in meet-001
    const summaryEdith = store.getMemberAttendanceSummary('mem-ndh-002');
    expect(summaryEdith.attendedMeetings).toBe(0);
    expect(summaryEdith.attendanceRate).toBe(0);
  });

  // Acceptance Test 7: Automatic role handover upon election close
  it('7. Automatic election role handover and handover log generation', () => {
    // Create an election motion for Secretary role
    const candidates = [
      { memberId: 'mem-ndh-001', memberName: 'Wendy Odindo' },
      { memberId: 'mem-ndh-002', memberName: 'Edith Hwaga' }
    ];

    const motionResult = store.createMotion({
      title: 'Election of Secretary',
      description: 'General election for Secretary post',
      motionType: 'Election',
      ballotType: 'Secret',
      targetRole: 'Secretary',
      options: ['mem-ndh-001', 'mem-ndh-002'],
      candidates,
      returningOfficerId: 'mem-ndh-040', // Eugene Nyasio
      openUntil: '2026-11-30T00:00:00Z'
    });
    expect(motionResult.success).toBe(true);
    const motionId = motionResult.motionId!;

    // Cast votes: Wendy receives 2 votes, Edith receives 1 vote
    store.castVote(motionId, 'mem-ndh-014', 'mem-ndh-001'); // Winnie votes Wendy
    store.castVote(motionId, 'mem-ndh-013', 'mem-ndh-001'); // Wesley votes Wendy
    store.castVote(motionId, 'mem-ndh-016', 'mem-ndh-002'); // Mark votes Edith

    // Close the motion
    const closeResult = store.closeMotion(motionId);
    expect(closeResult.success).toBe(true);

    // Verify election results
    const results = store.getMotionResults(motionId);
    expect(results.isClosed).toBe(true);
    expect(results.winnerOption).toBe('mem-ndh-001'); // Wendy won!

    // Verify Handover Log: Wendy Odindo is now Secretary
    const handovers = store.getHandoverLogs();
    const secHandover = handovers.find(h => h.role === 'Secretary');
    expect(secHandover).toBeDefined();
    expect(secHandover!.newMemberId).toBe('mem-ndh-001');

    // Verify updated active RoleTerm
    const activeTerms = store.getRoleTerms().filter(r => r.active && r.role === 'Secretary');
    expect(activeTerms.length).toBe(1);
    expect(activeTerms[0].memberId).toBe('mem-ndh-001');
  });

  // Acceptance Test 8: Notices and Reminders dispatch
  it('8. Officials post announcements and dispatch arrears reminders', () => {
    const postResult = store.postNotice({
      title: 'Constitution Review Session',
      content: 'All members are invited to review amendment proposals next Sunday.',
      category: 'Announcement',
      priority: 'Important',
      channels: ['In-App', 'WhatsApp'],
      targetAudience: 'All'
    });
    expect(postResult.success).toBe(true);

    const notices = store.getNotices();
    expect(notices.some(n => n.id === postResult.noticeId)).toBe(true);

    // Dispatch automated arrears reminders
    const reminderResult = store.sendArrearsReminders(['In-App', 'SMS']);
    expect(reminderResult.count).toBe(42); // 42 members in arrears as per Phase 1 benchmark
    expect(reminderResult.membersReminded.length).toBe(42);
  });
});
