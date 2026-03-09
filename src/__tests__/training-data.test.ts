import { describe, it, expect } from 'vitest';
import {
  computeVerticalMetrics,
  assessFineTuningReadiness,
  toFineTuningJSONL,
  computeTrainingSummary,
  type TrainingExample,
} from '@/lib/training-data';

function makeExample(overrides: Partial<TrainingExample> = {}): TrainingExample {
  return {
    reviewRating: 5,
    reviewText: 'Great food!',
    replyText: 'Thank you for the wonderful review!',
    outcome: 'approved',
    vertical: 'restaurant',
    confidenceScore: 85,
    ...overrides,
  };
}

describe('computeVerticalMetrics', () => {
  it('groups by vertical', () => {
    const examples = [
      makeExample({ vertical: 'restaurant' }),
      makeExample({ vertical: 'restaurant' }),
      makeExample({ vertical: 'medical' }),
    ];
    const metrics = computeVerticalMetrics(examples);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].vertical).toBe('restaurant');
    expect(metrics[0].totalExamples).toBe(2);
  });

  it('computes approval rate correctly', () => {
    const examples = [
      makeExample({ outcome: 'approved' }),
      makeExample({ outcome: 'approved' }),
      makeExample({ outcome: 'edited' }),
      makeExample({ outcome: 'rejected' }),
    ];
    const metrics = computeVerticalMetrics(examples);
    // approved=2, edited=1 => accepted=3/4 = 75%
    expect(metrics[0].approvalRate).toBe(75);
  });

  it('computes edit rate', () => {
    const examples = [
      makeExample({ outcome: 'approved' }),
      makeExample({ outcome: 'edited' }),
    ];
    const metrics = computeVerticalMetrics(examples);
    // 1 edited out of 2 accepted = 50%
    expect(metrics[0].editRate).toBe(50);
  });

  it('computes average confidence', () => {
    const examples = [
      makeExample({ confidenceScore: 80 }),
      makeExample({ confidenceScore: 90 }),
    ];
    const metrics = computeVerticalMetrics(examples);
    expect(metrics[0].avgConfidence).toBe(85);
  });

  it('handles empty array', () => {
    expect(computeVerticalMetrics([])).toHaveLength(0);
  });

  it('sorts by total examples descending', () => {
    const examples = [
      makeExample({ vertical: 'hotel' }),
      makeExample({ vertical: 'restaurant' }),
      makeExample({ vertical: 'restaurant' }),
      makeExample({ vertical: 'restaurant' }),
    ];
    const metrics = computeVerticalMetrics(examples);
    expect(metrics[0].vertical).toBe('restaurant');
  });
});

describe('assessFineTuningReadiness', () => {
  it('marks vertical as ready with 100+ examples', () => {
    const metrics = computeVerticalMetrics(
      Array.from({ length: 105 }, () => makeExample())
    );
    const readiness = assessFineTuningReadiness(metrics);
    expect(readiness[0].isReady).toBe(true);
  });

  it('marks vertical as not ready with < 100 examples', () => {
    const metrics = computeVerticalMetrics(
      Array.from({ length: 50 }, () => makeExample())
    );
    const readiness = assessFineTuningReadiness(metrics);
    expect(readiness[0].isReady).toBe(false);
  });

  it('assesses high quality for high approval rate', () => {
    const metrics = computeVerticalMetrics(
      Array.from({ length: 100 }, () => makeExample({ outcome: 'approved' }))
    );
    const readiness = assessFineTuningReadiness(metrics);
    expect(readiness[0].quality).toBe('high');
  });

  it('assesses low quality for many rejections', () => {
    const examples = [
      ...Array.from({ length: 40 }, () => makeExample({ outcome: 'approved' })),
      ...Array.from({ length: 60 }, () => makeExample({ outcome: 'rejected' })),
    ];
    const metrics = computeVerticalMetrics(examples);
    const readiness = assessFineTuningReadiness(metrics);
    expect(readiness[0].quality).toBe('low');
  });
});

describe('toFineTuningJSONL', () => {
  it('generates valid JSONL', () => {
    const examples = [makeExample()];
    const jsonl = toFineTuningJSONL(examples);
    const parsed = JSON.parse(jsonl);
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.messages[0].role).toBe('system');
    expect(parsed.messages[1].role).toBe('user');
    expect(parsed.messages[2].role).toBe('assistant');
  });

  it('excludes rejected examples', () => {
    const examples = [
      makeExample({ outcome: 'approved' }),
      makeExample({ outcome: 'rejected' }),
    ];
    const jsonl = toFineTuningJSONL(examples);
    const lines = jsonl.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it('uses edited text for edited examples', () => {
    const examples = [
      makeExample({ outcome: 'edited', editedText: 'Corrected reply text' }),
    ];
    const jsonl = toFineTuningJSONL(examples);
    const parsed = JSON.parse(jsonl);
    expect(parsed.messages[2].content).toBe('Corrected reply text');
  });

  it('filters by vertical', () => {
    const examples = [
      makeExample({ vertical: 'restaurant' }),
      makeExample({ vertical: 'medical' }),
    ];
    const jsonl = toFineTuningJSONL(examples, 'restaurant');
    const lines = jsonl.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});

describe('computeTrainingSummary', () => {
  it('computes summary stats', () => {
    const examples = [
      ...Array.from({ length: 110 }, () => makeExample({ vertical: 'restaurant' })),
      ...Array.from({ length: 50 }, () => makeExample({ vertical: 'hotel' })),
    ];
    const summary = computeTrainingSummary(examples);
    expect(summary.total).toBe(160);
    expect(summary.verticals).toBe(2);
    expect(summary.readyForFineTuning).toBe(1); // only restaurant has 100+
    expect(summary.topVertical).toBe('restaurant');
  });

  it('handles empty array', () => {
    const summary = computeTrainingSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.topVertical).toBeNull();
  });
});
