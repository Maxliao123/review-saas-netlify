#!/usr/bin/env python3
"""Generate ReplyWise AI sales flyer PDF (English) for restaurant owners."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas

W, H = letter
OUTPUT = '/Users/liaoyikai/review-saas-netlify/sales-materials/replywiseai-flyer-en.pdf'

# Brand colors
CORAL = HexColor('#E8654A')
CORAL_DARK = HexColor('#C94D35')
GOLD = HexColor('#FFBF00')
DARK = HexColor('#0F172A')
GRAY = HexColor('#64748B')
LIGHT_BG = HexColor('#FFF7ED')
GREEN = HexColor('#16A34A')
RED = HexColor('#EF4444')

B = 'Helvetica-Bold'
R = 'Helvetica'

def rrect(c, x, y, w, h, r, fill=None, stroke=None):
    p = c.beginPath()
    p.roundRect(x, y, w, h, r)
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(1)
    c.drawPath(p, fill=1 if fill else 0, stroke=1 if stroke else 0)

def main():
    c = canvas.Canvas(OUTPUT, pagesize=letter)
    c.setTitle('ReplyWise AI - Sales Flyer')
    margin = 40
    cw = W - 2 * margin

    # ── HEADER ──
    c.setFillColor(CORAL)
    c.rect(0, H - 130, W, 130, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont(B, 32)
    c.drawString(margin, H - 52, 'ReplyWise AI')
    c.setFont(R, 13)
    c.drawString(margin, H - 73, 'AI-Powered Google Review Management')
    c.setFont(R, 11)
    c.drawString(margin, H - 95, 'www.replywiseai.com')

    # Right stat
    c.setFont(B, 48)
    c.drawRightString(W - margin, H - 55, '5x')
    c.setFont(R, 13)
    c.drawRightString(W - margin, H - 78, 'More Reviews')

    # ── THE PROBLEM ──
    y = H - 160
    rrect(c, margin, y - 2, 95, 22, 5, fill=RED)
    c.setFillColor(white)
    c.setFont(B, 11)
    c.drawString(margin + 8, y + 2, 'THE PROBLEM')

    c.setFillColor(DARK)
    c.setFont(B, 15)
    c.drawString(margin + 105, y, 'Is Your Restaurant Losing Customers?')

    y -= 32
    problems = [
        '90% of happy customers never leave a review',
        'Competitors with more reviews steal your customers',
        'One bad review can cost your business $10,000+',
        'No time to respond to every review manually',
    ]
    c.setFont(R, 11)
    c.setFillColor(HexColor('#DC2626'))
    for line in problems:
        c.drawString(margin + 20, y, 'X   ' + line)
        y -= 20

    # ── THE SOLUTION ──
    y -= 15
    rrect(c, margin, y - 2, 115, 22, 5, fill=GREEN)
    c.setFillColor(white)
    c.setFont(B, 11)
    c.drawString(margin + 8, y + 2, 'THE SOLUTION')

    c.setFillColor(DARK)
    c.setFont(B, 15)
    c.drawString(margin + 125, y, 'Get 5-Star Reviews in 30 Seconds')

    y -= 35

    # Steps
    steps = [
        ('1', 'Customer scans', 'QR Code'),
        ('2', 'Selects their', 'experience'),
        ('3', 'AI generates a', '5-star review'),
        ('4', 'Published to', 'Google instantly'),
    ]
    sw = (cw - 45) / 4
    for i, (num, line1, line2) in enumerate(steps):
        sx = margin + i * (sw + 15)
        rrect(c, sx, y - 55, sw, 60, 8, fill=LIGHT_BG, stroke=HexColor('#E8654A30'))

        c.setFillColor(CORAL)
        c.setFont(B, 24)
        c.drawCentredString(sx + sw / 2, y - 10, num)

        c.setFillColor(DARK)
        c.setFont(R, 9)
        c.drawCentredString(sx + sw / 2, y - 30, line1)
        c.drawCentredString(sx + sw / 2, y - 42, line2)

        if i < 3:
            c.setFillColor(CORAL)
            c.setFont(B, 18)
            c.drawString(sx + sw + 2, y - 25, '>')

    # ── KEY FEATURES ──
    y -= 82
    c.setFillColor(DARK)
    c.setFont(B, 14)
    c.drawString(margin, y, 'Key Features')

    y -= 25
    left_features = [
        'AI-powered personalized 5-star review generation',
        'Real-time review monitoring + instant alerts',
        'AI auto-draft replies (including negative reviews)',
    ]
    right_features = [
        'Google Maps performance analytics',
        'Competitor review tracking & comparison',
        'Multi-language support (EN/ZH/JA/KO/FR)',
    ]

    c.setFont(R, 10)
    c.setFillColor(DARK)
    fy = y
    for line in left_features:
        c.setFillColor(GREEN)
        c.drawString(margin + 10, fy, 'v')
        c.setFillColor(DARK)
        c.drawString(margin + 25, fy, line)
        fy -= 18
    fy = y
    for line in right_features:
        c.setFillColor(GREEN)
        c.drawString(margin + cw / 2, fy, 'v')
        c.setFillColor(DARK)
        c.drawString(margin + cw / 2 + 15, fy, line)
        fy -= 18

    # ── PRICING ──
    y = fy - 18
    c.setFillColor(DARK)
    c.setFont(B, 14)
    c.drawString(margin, y, 'Simple, Transparent Pricing')

    y -= 20
    plans = [
        ('Free', '$0', 'Review generation\nQR Code setup', False),
        ('Starter', '$29/mo', 'Review monitoring\nAI auto-replies\nEmail + Slack alerts', False),
        ('Pro', '$79/mo', 'Google Maps analytics\nCompetitor tracking\nAll features included', True),
    ]
    pw = (cw - 20) / 3
    for i, (name, price, feats, popular) in enumerate(plans):
        px = margin + i * (pw + 10)
        bh = 115

        bg = CORAL if popular else LIGHT_BG
        tc = white if popular else DARK
        sc = HexColor('#FEE2D5') if popular else GRAY

        rrect(c, px, y - bh, pw, bh, 8, fill=bg)

        if popular:
            rrect(c, px + pw - 85, y - 5, 80, 18, 4, fill=GOLD)
            c.setFillColor(DARK)
            c.setFont(B, 8)
            c.drawString(px + pw - 78, y - 1, 'MOST POPULAR')

        c.setFillColor(tc)
        c.setFont(B, 14)
        c.drawString(px + 12, y - 22, name)

        c.setFont(B, 22)
        c.drawString(px + 12, y - 50, price)

        c.setFillColor(sc)
        c.setFont(R, 9)
        ffy = y - 68
        for feat in feats.split('\n'):
            c.drawString(px + 12, ffy, '- ' + feat)
            ffy -= 14

    # ── TESTIMONIAL ──
    y -= 140
    rrect(c, margin, y - 55, cw, 55, 8, fill=HexColor('#FEF3C7'))

    c.setFillColor(DARK)
    c.setFont(R, 10)
    c.drawCentredString(W / 2, y - 15,
        '"After using ReplyWise AI, our Google reviews grew from 47 to 156')
    c.drawCentredString(W / 2, y - 30,
        'and our rating jumped from 4.2 to 4.8. New customers noticeably increased."')
    c.setFont(B, 10)
    c.drawCentredString(W / 2, y - 47, '- Vancouver Restaurant Owner')

    # ── CTA ──
    y -= 75
    c.setFillColor(CORAL)
    c.rect(0, 0, W, y + 25, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont(B, 20)
    c.drawCentredString(W / 2, y - 5, 'Start Free Today — Zero Risk, Zero Cost')

    c.setFont(R, 12)
    c.drawCentredString(W / 2, y - 28, 'Free 7-day trial. See your review growth with zero commitment.')

    c.setFont(B, 15)
    c.drawCentredString(W / 2, y - 55, 'www.replywiseai.com')

    c.setFont(R, 11)
    c.drawCentredString(W / 2, y - 75, 'Contact: max@replywiseai.com')

    c.save()
    print(f'PDF saved to: {OUTPUT}')

if __name__ == '__main__':
    main()
