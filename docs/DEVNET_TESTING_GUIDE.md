# CrypTrans Devnet Community Testing Guide

**Purpose**: Comprehensive guide for 100+ community testers to validate system before mainnet
**Timeline**: 1 week (after audit completes)
**Participants**: Crypto enthusiasts, oracle candidates, project creators
**Reward**: Reputation tokens, cool factor, influence in first mainnet projects

---

## Overview

Devnet testing is the final validation before launching on mainnet. We need:
- ✅ All 14 instructions callable and functional
- ✅ No bugs or edge cases
- ✅ Community confidence in the system
- ✅ Feedback for improvements
- ✅ Reputation for testers to build oracle network

---

## Getting Started (For Testers)

### Prerequisites

```bash
# Install tools
npm install -g @solana/cli
npm install -g @coral-xyz/anchor

# Verify setup
solana --version
anchor --version

# Set to devnet
solana config set --url https://api.devnet.solana.com
```

### Getting Devnet SOL

You need SOL to pay for transactions:

```bash
# Get your wallet address
solana address

# Request airdrop (2 SOL is plenty)
solana airdrop 2

# Verify
solana balance
```

If airdrop fails, use alternative faucet:
```bash
# Or use our community faucet (TBD)
# We'll provide a web-based faucet during testing
```

### Download CLI

```bash
# Clone the repository
git clone https://github.com/TheoryofShadows/cryptrans.git
cd cryptrans

# Install
npm install

# Run CLI
npx ts-node cli/index.ts --help
```

---

## Testing Scenarios

### Scenario 1: Beginner Voter (30 minutes)

**Goal**: Vote on a project without being an oracle

**Steps**:

1. **Connect wallet**:
   ```bash
   cryptrans balance
   ```
   Expected: Shows SOL balance

2. **Browse a project**:
   ```bash
   cryptrans status --project-id prj_test_001
   ```
   Expected: Shows project details

3. **Vote YES**:
   ```bash
   cryptrans vote --project-id prj_test_001 --choice yes --stake 1
   ```
   Expected: Vote recorded, anonymity confirmed

4. **Check balance changed**:
   ```bash
   cryptrans balance
   ```
   Expected: Small fee deducted for transaction

**Report**: Any errors, confusing steps, or unexpected behavior

---

### Scenario 2: Oracle Registration (45 minutes)

**Goal**: Register as oracle, verify milestones, track reputation

**Steps**:

1. **Register with collateral**:
   ```bash
   cryptrans oracle-register --collateral 2
   ```
   Expected: Registration successful, collateral locked

2. **Check wallet updated**:
   ```bash
   cryptrans balance
   ```
   Expected: Balance reduced by 2 SOL + transaction fee

3. **Verify a milestone**:
   ```bash
   cryptrans verify-milestone \
     --project-id prj_test_001 \
     --milestone-num 1 \
     --confidence 85 \
     --proof-url "https://github.com/example"
   ```
   Expected: Milestone verified, reputation tracking

4. **Check reputation**:
   ```bash
   cryptrans status --project-id prj_test_001
   ```
   Expected: Your oracle appears in verification list

**Report**: Registration speed, reputation tracking accuracy, any failures

---

### Scenario 3: Project Creator (1 hour)

**Goal**: Create a project, get votes, archive

**Steps**:

1. **Propose a project**:
   ```bash
   cryptrans propose \
     --name "Test Brain Preservation" \
     --description "5-year research initiative" \
     --funding 10 \
     --tranches 2 \
     --verbose
   ```
   Expected: Project created, ID displayed

   **Save the Project ID**: `prj_xxxxxxxxx`

2. **Check project status**:
   ```bash
   cryptrans status --project-id prj_xxxxxxxxx
   ```
   Expected: Shows proposal waiting for votes

3. **Have others vote** (work with other testers):
   - Share your project ID in Discord
   - Get 10+ votes from community
   - Mix of YES and NO votes
   - Some ABSTAIN votes

4. **Check results**:
   ```bash
   cryptrans status --project-id prj_xxxxxxxxx
   ```
   Expected: Shows vote totals, approval percentage

5. **When approved (66%+), archive**:
   ```bash
   cryptrans archive --project-id prj_xxxxxxxxx
   ```
   Expected: Shows Arweave ID, permanence guaranteed

**Report**: Proposal process, voting mechanics, archive functionality

---

### Scenario 4: Stress Testing (45 minutes)

**Goal**: Find limits and edge cases

**Tests**:

1. **Rapid voting** (test nullifier system):
   ```bash
   for i in {1..5}; do
     cryptrans vote --project-id prj_test_001 --choice yes
   done
   ```
   Expected: First vote succeeds, others FAIL (double-vote prevention)

2. **Maximum confidence score**:
   ```bash
   cryptrans verify-milestone \
     --project-id prj_test_001 \
     --milestone-num 1 \
     --confidence 150  # Invalid: > 100
   ```
   Expected: Error message (confidence must be 0-100)

3. **Invalid project ID**:
   ```bash
   cryptrans status --project-id not_a_real_id
   ```
   Expected: Clear error message

4. **Concurrent operations**:
   ```bash
   # Run multiple commands at once
   cryptrans balance &
   cryptrans status --project-id prj_test_001 &
   cryptrans vote --project-id prj_test_001 --choice yes &
   wait
   ```
   Expected: All succeed without conflicts

5. **Network interruption** (disconnect internet briefly):
   ```bash
   cryptrans balance
   ```
   Expected: Graceful error (not crash)

**Report**: Any unexpected behavior, missing validation, crashes

---

### Scenario 5: Advanced Oracle Workflow (1.5 hours)

**Goal**: Test complete oracle lifecycle

**Steps**:

1. **Register as oracle**:
   ```bash
   cryptrans oracle-register --collateral 5
   ```

2. **Monitor projects for milestones**:
   - Refresh `cryptrans status --project-id prj_xxx` regularly
   - Look for projects with passing unlock dates
   - Check if milestones are marked as ready for verification

3. **Coordinate with testers**:
   - Have multiple testers propose projects
   - Have them set milestone deadlines
   - Track which ones you're verifying

4. **Verify 5+ milestones**:
   ```bash
   cryptrans verify-milestone \
     --project-id prj_1 --milestone-num 1 --confidence 90

   cryptrans verify-milestone \
     --project-id prj_2 --milestone-num 1 --confidence 85

   # ... repeat for different projects
   ```

5. **Track reputation growth**:
   - Your accuracy should improve (if consistent in verifications)
   - You should accumulate reputation points
   - Check if soul-bound reputation tokens appear

6. **Test slashing** (intentional false verification):
   - Verify a milestone you know is false
   - System should detect inconsistency with other oracles
   - Your reputation should drop
   - Note how the penalty works

**Report**: Oracle experience, reputation mechanics, incentive alignment

---

## Issue Reporting Template

When you find something wrong, report it:

```
## Issue: [Brief Title]

**Scenario**: [Which test scenario]

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happened

**Error Message**:
[Copy exact error message if applicable]

**Environment**:
- OS: Windows/Mac/Linux
- Node version: [output of `node --version`]
- CLI version: 0.1.0
- Solana network: devnet

**Severity**: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
[Critical = blocks testing, High = major feature broken, Medium = workaround exists, Low = minor issue]

**Screenshots**: [If applicable]
```

### Where to Report

1. **Discord**: #bug-reports channel (immediate feedback)
2. **GitHub**: Issues tab (permanent record)
3. **Email**: Report form on website (if provided)

---

## Testing Scorecard

Track your progress:

```
□ Scenario 1: Beginner Voter (30 min)
  □ Connect wallet
  □ Browse project
  □ Vote on project
  □ Confirm balance changed

□ Scenario 2: Oracle Registration (45 min)
  □ Register as oracle
  □ Check collateral locked
  □ Verify milestone
  □ Check reputation updated

□ Scenario 3: Project Creator (60 min)
  □ Propose project
  □ Check project status
  □ Gather votes from community
  □ Check vote results
  □ Archive project

□ Scenario 4: Stress Testing (45 min)
  □ Test rapid voting (nullifier system)
  □ Test invalid confidence scores
  □ Test invalid project IDs
  □ Test concurrent operations
  □ Test network interruption

□ Scenario 5: Advanced Oracle (90 min)
  □ Register as oracle
  □ Monitor projects
  □ Verify 5+ milestones
  □ Track reputation growth
  □ Test slashing
```

---

## Discord Coordination

### Channels During Testing

**#testing-coordination**
- Post "I'm testing now"
- Ask for help/feedback
- Share project IDs for voting

**#bug-reports**
- Report issues found
- Attach error messages
- Include reproduction steps

**#testing-stories**
- Share your testing experience
- Interesting edge cases
- What worked well/poorly

**#test-projects**
- Post your test project ID
- Ask for votes
- Coordinate with other testers

### Example Coordination

```
Alice: "I'm proposing test project prj_alice_001.
        Please vote YES to test the voting system!"

Bob: "Proposal received. Verifying structure now...
      Voting YES"

Charlie: "I'll test the NO vote path"

David: "Testing ABSTAIN"

Alice: "Great! Now let's verify some milestones"
```

---

## Rewards & Recognition

### Reputation Tokens

As you complete scenarios:
- Each verified milestone: +1 reputation
- 100% accurate verifications: +5 reputation bonus
- Reporting critical bugs: +10 reputation
- Proposing project that gets funded: +20 reputation

### Public Recognition

**Tester Hall of Fame**:
- Top 10 testers with most contributions
- Listed on website and GitHub
- Mentioned in mainnet launch announcement
- First priority for becoming official oracles

### Future Benefits

- **Oracle Priority**: Top testers become official oracles
- **First Projects**: Priority access to fund first real projects
- **Influence**: Reputation votes for next features
- **Governance**: Soul-bound reputation tokens on mainnet

---

## Best Practices

### Do

✅ **Test thoroughly** - Try everything, find edge cases
✅ **Report issues clearly** - Help us understand the problem
✅ **Help others** - Guide new testers in Discord
✅ **Coordinate** - Work with other testers for multi-user scenarios
✅ **Document** - Take notes on what you test
✅ **Give feedback** - Tell us what's confusing

### Don't

❌ **Rush** - Take time to understand features
❌ **Spam** - Don't report the same issue multiple times
❌ **Give up** - If something fails, report it and try again
❌ **Ignore errors** - Every error is important data
❌ **Test alone** - Multi-user scenarios need multiple people

---

## FAQ

### Q: Do I need experience with Solana?
**A**: No! If you can use CLI, you can help. We'll provide step-by-step guides.

### Q: What if I find a critical bug?
**A**: Report it immediately in #bug-reports. We'll pause testing if needed.

### Q: Can I lose my collateral during testing?
**A**: Testing uses devnet only. Your real SOL is safe on mainnet.

### Q: How long does testing take?
**A**: From 30 minutes (one scenario) to 5+ hours (all scenarios).

### Q: Will I get paid?
**A**: Devnet SOL is free. On mainnet, your reputation tokens have value.

### Q: What if I don't understand something?
**A**: Ask in Discord! Community members will help.

### Q: Can I propose multiple projects?
**A**: Yes! More projects = better testing coverage.

### Q: What happens to test projects after?
**A**: They're archived to Arweave. Good examples for real projects.

---

## Success Criteria

Testing is successful when:

✅ All 14 instructions are callable
✅ All 7 vision phases work correctly
✅ No critical bugs found
✅ 100+ testers participated
✅ 50+ projects proposed and tested
✅ 500+ oracle verifications completed
✅ Strong community confidence
✅ Ready for mainnet launch

---

## Timeline

```
Day 1: Testing begins
  - All scenarios available
  - Faucet active (get SOL)
  - Full Discord support

Days 2-4: Full testing
  - Most people actively testing
  - Community coordination peak
  - Bugs reported and fixed

Days 5-6: Final validation
  - Critical path testing
  - Edge cases confirmed
  - Final improvements

Day 7: Testing complete
  - Results compiled
  - Community feedback gathered
  - Mainnet launch scheduled
```

---

## After Testing

Once devnet testing completes:

1. **Thank you**: Public recognition for all testers
2. **Results**: Share statistics on proposals, votes, oracles
3. **Feedback**: Incorporate community suggestions
4. **Upgrade**: Deploy improvements to code
5. **Mainnet**: Launch on Solana Mainnet-Beta
6. **First Projects**: Start funding real transhuman research

---

## Support During Testing

### Hours

- **Discord support**: 24/7 (global community)
- **Direct support**: Daily sync calls at specified times
- **Documentation**: Always available

### Contact

- **Discord**: #general, @mod team
- **GitHub Issues**: For permanent record
- **Email**: support@cryptrans.io (TBD)

---

## Example Testing Day

```
Morning (User in timezone A):
- Wakes up, joins Discord
- Sees list of test scenarios
- Chooses "Oracle Registration"
- Follows step-by-step guide
- Reports 1 small bug (UI clarity)
- Helps another tester with setup

Afternoon (User in timezone B):
- Wakes up
- Sees the bug report
- Reproduces it
- Confirms in Discord
- Reports confirmed bug
- Decides to test "Project Creator" scenario

Evening (User in timezone C):
- Joins testing
- Proposes test project
- Gets votes from users in timezone A/B
- Tests voting mechanics
- Archives project
- Reports success

Night (Developers):
- Review all reports
- Fix critical bug from afternoon
- Deploy fix
- Announce on Discord
```

---

## Key Points

🎯 **Goal**: Find and fix bugs before mainnet

🤝 **Teamwork**: No one tests alone

📝 **Documentation**: Report everything clearly

⏱️ **Timeline**: One week of intensive testing

🏆 **Recognition**: Reputation tokens for contributions

🚀 **Impact**: Your testing enables transhuman futures

---

**Status**: Devnet testing guide complete ✅
**Next**: Recruit 100+ testers, run testing week
**Goal**: Bulletproof system before mainnet

🤖 Generated with [Claude Code](https://claude.com/claude-code)
