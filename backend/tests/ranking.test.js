import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOverallScore, getRankingLabel } from '../services/rankingService.js';

describe('Deterministic 11-Dimension Scoring & Ranking Logic', () => {
  it('should return 100 when all 11 dimensions are 100', () => {
    const perfectScores = {
      resumeScore: 100,
      skillMatch: 100,
      experienceMatch: 100,
      educationMatch: 100,
      certificationScore: 100,
      projectQuality: 100,
      leadershipScore: 100,
      communicationScore: 100,
      atsScore: 100,
      softSkillsMatch: 100,
      confidenceScore: 100,
    };
    const score = calculateOverallScore(perfectScores);
    assert.equal(score, 100);
    assert.equal(getRankingLabel(score), 'Highly Recommended');
  });

  it('should return 0 when all dimensions are 0', () => {
    const zeroScores = {
      resumeScore: 0,
      skillMatch: 0,
      experienceMatch: 0,
      educationMatch: 0,
      certificationScore: 0,
      projectQuality: 0,
      leadershipScore: 0,
      communicationScore: 0,
      atsScore: 0,
      softSkillsMatch: 0,
      confidenceScore: 0,
    };
    const score = calculateOverallScore(zeroScores);
    assert.equal(score, 0);
    assert.equal(getRankingLabel(score), 'Not Recommended');
  });

  it('should correctly calculate weighted composite score', () => {
    // 80*0.30=24 + 70*0.25=17.5 + 60*0.12=7.2 + 50*0.08=4.0 + 40*0.05=2 + 40*0.05=2 + 30*0.03=0.9 + 20*0.02=0.4 + 90*0.03=2.7 + 50*0.02=1.0 + 80*0.05=4.0
    // Total = 24 + 17.5 + 7.2 + 4.0 + 2 + 2 + 0.9 + 0.4 + 2.7 + 1.0 + 4.0 = 65.7 -> Math.round = 66
    const sampleScores = {
      resumeScore: 80,
      skillMatch: 70,
      experienceMatch: 60,
      educationMatch: 50,
      certificationScore: 40,
      projectQuality: 40,
      leadershipScore: 30,
      communicationScore: 20,
      atsScore: 90,
      softSkillsMatch: 50,
      confidenceScore: 80,
    };
    const score = calculateOverallScore(sampleScores);
    assert.equal(score, 66);
    assert.equal(getRankingLabel(score), 'Moderate');
  });

  it('should clamp scores exceeding 100 or below 0', () => {
    assert.equal(calculateOverallScore({ resumeScore: 200, skillMatch: 200 }), 100);
    assert.equal(calculateOverallScore({ resumeScore: -50, skillMatch: -50 }), 0);
  });

  it('should assign correct qualitative recommendation thresholds', () => {
    assert.equal(getRankingLabel(95), 'Highly Recommended');
    assert.equal(getRankingLabel(85), 'Highly Recommended');
    assert.equal(getRankingLabel(84), 'Recommended');
    assert.equal(getRankingLabel(70), 'Recommended');
    assert.equal(getRankingLabel(69), 'Moderate');
    assert.equal(getRankingLabel(50), 'Moderate');
    assert.equal(getRankingLabel(49), 'Not Recommended');
    assert.equal(getRankingLabel(10), 'Not Recommended');
    assert.equal(getRankingLabel(null), 'AI Unavailable');
  });
});
