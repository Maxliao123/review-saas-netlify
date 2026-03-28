import { describe, it, expect } from 'vitest';
import { buildThankYouEmail, buildReminderEmail } from '@/lib/drip-campaigns';

describe('buildThankYouEmail', () => {
  it('returns correct subject with store name', () => {
    const { subject } = buildThankYouEmail('Sushi Palace');
    expect(subject).toBe('Thank you for reviewing Sushi Palace!');
  });

  it('returns html with personalized greeting when name provided', () => {
    const { html } = buildThankYouEmail('Sushi Palace', 'Alice');
    expect(html).toContain('Hi Alice');
    expect(html).toContain('Sushi Palace');
  });

  it('returns html with generic greeting when no name provided', () => {
    const { html } = buildThankYouEmail('Sushi Palace');
    expect(html).toContain('Hi there');
    expect(html).not.toContain('undefined');
  });

  it('returns html with generic greeting when name is null', () => {
    const { html } = buildThankYouEmail('Sushi Palace', null);
    expect(html).toContain('Hi there');
  });

  it('includes powered by branding', () => {
    const { html } = buildThankYouEmail('Sushi Palace');
    expect(html).toContain('ReplyWise AI');
  });
});

describe('buildReminderEmail', () => {
  const inviteUrl = 'https://example.com?store=sushi-palace';

  it('returns correct subject with store name', () => {
    const { subject } = buildReminderEmail('Sushi Palace', inviteUrl);
    expect(subject).toBe('Quick reminder: Share your experience at Sushi Palace');
  });

  it('returns html with personalized greeting when name provided', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl, 'Bob');
    expect(html).toContain('Hi Bob');
    expect(html).toContain('Sushi Palace');
  });

  it('returns html with generic greeting when no name provided', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl);
    expect(html).toContain('Hi there');
    expect(html).not.toContain('undefined');
  });

  it('returns html with generic greeting when name is null', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl, null);
    expect(html).toContain('Hi there');
  });

  it('includes the invite URL in the CTA button', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl);
    expect(html).toContain(`href="${inviteUrl}"`);
  });

  it('includes Leave a Review CTA text', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl);
    expect(html).toContain('Leave a Review');
  });

  it('includes powered by branding', () => {
    const { html } = buildReminderEmail('Sushi Palace', inviteUrl);
    expect(html).toContain('ReplyWise AI');
  });
});
