import { describe, it, expect } from 'vitest';
import { buildPlainText, buildEmailHtml, buildSlackBlocks } from '@/lib/notifications/templates';

describe('Urgent Alert Templates', () => {
  const urgentReview = {
    storeName: 'Test Restaurant',
    authorName: 'Angry Customer',
    rating: 1,
    content: 'Terrible service, waited 2 hours for food.',
    dashboardUrl: 'https://app.example.com/admin/reviews',
    aiDraft: 'We sincerely apologize for the long wait. This is not up to our standards.',
    approveUrl: 'https://app.example.com/api/reviews/approve?token=abc123',
    editUrl: 'https://app.example.com/api/reviews/edit?token=abc123',
  };

  const normalReview = {
    storeName: 'Test Restaurant',
    authorName: 'Happy Customer',
    rating: 5,
    content: 'Amazing food and great service!',
    dashboardUrl: 'https://app.example.com/admin/reviews',
  };

  describe('buildPlainText', () => {
    it('includes URGENT prefix for 1-2 star reviews', () => {
      const text = buildPlainText(urgentReview);
      expect(text).toContain('🚨');
      expect(text).toContain('URGENT');
    });

    it('includes AI draft in urgent notifications', () => {
      const text = buildPlainText(urgentReview);
      expect(text).toContain('AI Suggested Reply');
      expect(text).toContain('We sincerely apologize');
    });

    it('includes approve URL in urgent notifications', () => {
      const text = buildPlainText(urgentReview);
      expect(text).toContain('Approve & Publish');
      expect(text).toContain('token=abc123');
    });

    it('does not include URGENT for 4-5 star reviews', () => {
      const text = buildPlainText(normalReview);
      expect(text).not.toContain('🚨');
      expect(text).not.toContain('URGENT');
    });

    it('uses warning emoji for 3-star reviews but not urgent', () => {
      const threeStarReview = { ...normalReview, rating: 3 };
      const text = buildPlainText(threeStarReview);
      expect(text).toContain('⚠️');
      expect(text).not.toContain('🚨');
    });

    it('zh lang includes urgent prefix in Chinese', () => {
      const text = buildPlainText(urgentReview, 'zh');
      expect(text).toContain('🚨');
      expect(text).toContain('緊急差評警報');
      expect(text).toContain('AI建議回覆');
    });
  });

  describe('buildEmailHtml', () => {
    it('includes URGENT header bar for 1-2 star with AI draft', () => {
      const { subject, html } = buildEmailHtml(urgentReview);
      expect(subject).toContain('🚨');
      expect(subject).toContain('URGENT');
      expect(html).toContain('URGENT');
      expect(html).toContain('Immediate Action Required');
    });

    it('includes AI draft section in email', () => {
      const { html } = buildEmailHtml(urgentReview);
      expect(html).toContain('AI Suggested Reply');
      expect(html).toContain('We sincerely apologize');
    });

    it('includes one-click approve button', () => {
      const { html } = buildEmailHtml(urgentReview);
      expect(html).toContain('Approve & Publish');
      expect(html).toContain('token=abc123');
    });

    it('includes Edit Reply button for urgent reviews', () => {
      const { html } = buildEmailHtml(urgentReview);
      expect(html).toContain('Edit & Publish');
    });

    it('normal reviews do not have URGENT banner', () => {
      const { subject, html } = buildEmailHtml(normalReview);
      expect(subject).not.toContain('🚨');
      expect(html).not.toContain('Immediate Action Required');
    });

    it('3 star review gets warning but not urgent', () => {
      const threeStarReview = { ...normalReview, rating: 3 };
      const { subject } = buildEmailHtml(threeStarReview);
      expect(subject).toContain('⚠️');
      expect(subject).not.toContain('🚨');
    });
  });

  describe('buildSlackBlocks', () => {
    it('includes URGENT in header for 1-2 star reviews', () => {
      const slack = buildSlackBlocks(urgentReview);
      expect(slack.text).toContain('🚨');
      expect(slack.blocks[0].text.text).toContain('URGENT');
    });

    it('includes AI draft block', () => {
      const slack = buildSlackBlocks(urgentReview);
      const aiBlock = slack.blocks.find((b: any) => b.type === 'section' && b.text?.text?.includes('AI Suggested Reply'));
      expect(aiBlock).toBeDefined();
      expect(aiBlock.text.text).toContain('We sincerely apologize');
    });

    it('includes Approve & Publish action button', () => {
      const slack = buildSlackBlocks(urgentReview);
      const actionsBlock = slack.blocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      const approveBtn = actionsBlock.elements.find((e: any) => e.text.text.includes('Approve'));
      expect(approveBtn).toBeDefined();
      expect(approveBtn.url).toContain('token=abc123');
    });

    it('includes Edit Reply button for urgent reviews', () => {
      const slack = buildSlackBlocks(urgentReview);
      const actionsBlock = slack.blocks.find((b: any) => b.type === 'actions');
      const editBtn = actionsBlock.elements.find((e: any) => e.text.text.includes('Edit'));
      expect(editBtn).toBeDefined();
    });

    it('normal reviews show View Dashboard instead of Edit Reply', () => {
      const slack = buildSlackBlocks(normalReview);
      const actionsBlock = slack.blocks.find((b: any) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      const dashBtn = actionsBlock.elements.find((e: any) => e.text.text.includes('Dashboard'));
      expect(dashBtn).toBeDefined();
    });
  });
});

describe('Urgent Alert Decision Logic', () => {
  /**
   * Determines if a review should trigger an urgent notification.
   * Same logic as in fetch-reviews cron.
   */
  function shouldSendUrgentAlert(
    rating: number,
    replyStatus: string,
    hasDraft: boolean
  ): boolean {
    return rating <= 2 && replyStatus !== 'approved' && replyStatus !== 'published' && hasDraft;
  }

  it('sends urgent alert for 1-star drafted review', () => {
    expect(shouldSendUrgentAlert(1, 'drafted', true)).toBe(true);
  });

  it('sends urgent alert for 2-star drafted review', () => {
    expect(shouldSendUrgentAlert(2, 'drafted', true)).toBe(true);
  });

  it('does not send urgent alert for 3-star review', () => {
    expect(shouldSendUrgentAlert(3, 'drafted', true)).toBe(false);
  });

  it('does not send urgent alert for 4-5 star reviews', () => {
    expect(shouldSendUrgentAlert(4, 'drafted', true)).toBe(false);
    expect(shouldSendUrgentAlert(5, 'drafted', true)).toBe(false);
  });

  it('does not send if already approved (auto-reply)', () => {
    expect(shouldSendUrgentAlert(1, 'approved', true)).toBe(false);
  });

  it('does not send if already published', () => {
    expect(shouldSendUrgentAlert(1, 'published', true)).toBe(false);
  });

  it('does not send if no AI draft available', () => {
    expect(shouldSendUrgentAlert(1, 'drafted', false)).toBe(false);
  });
});
