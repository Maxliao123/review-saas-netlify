#!/usr/bin/env python3
"""Generate ReplyWise AI sales flyer PDF (Chinese) for Vancouver restaurant owners."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Arial Unicode (supports Chinese + emoji-like chars)
pdfmetrics.registerFont(TTFont('ArialUni', '/Library/Fonts/Arial Unicode.ttf'))

W, H = letter
OUTPUT = '/Users/liaoyikai/review-saas-netlify/sales-materials/replywiseai-flyer-zh.pdf'

# Colors
BLUE = HexColor('#1E40AF')
LIGHT_BLUE = HexColor('#3B82F6')
DARK = HexColor('#0F172A')
GRAY = HexColor('#64748B')
AMBER = HexColor('#F59E0B')
LIGHT_BG = HexColor('#F8FAFC')
GREEN = HexColor('#16A34A')
RED_ACCENT = HexColor('#EF4444')

CN = 'ArialUni'
EN = 'Helvetica-Bold'

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
    c.setFillColor(BLUE)
    c.rect(0, H - 130, W, 130, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont(EN, 30)
    c.drawString(margin, H - 50, 'ReplyWise AI')
    c.setFont(CN, 13)
    c.drawString(margin, H - 72, 'AI 智能 Google 評論管理平台')
    c.setFont('Helvetica', 11)
    c.drawString(margin, H - 95, 'www.replywiseai.com')

    # Right stat
    c.setFont(EN, 44)
    c.drawRightString(W - margin, H - 55, '5x')
    c.setFont(CN, 12)
    c.drawRightString(W - margin, H - 78, '評論數量提升')

    # ── PAIN ──
    y = H - 160
    rrect(c, margin, y - 2, 55, 20, 5, fill=RED_ACCENT)
    c.setFillColor(white)
    c.setFont(EN, 10)
    c.drawString(margin + 8, y + 2, 'PAIN')

    c.setFillColor(DARK)
    c.setFont(CN, 15)
    c.drawString(margin + 65, y, '您的餐廳是否面臨這些問題？')

    y -= 30
    problems = [
        'X  90% 滿意的客人不會主動留評論',
        'X  競爭對手評論數比你多，搶走你的新客人',
        'X  一則差評就能讓生意損失 $10,000+',
        'X  沒有時間回覆每一則評論',
    ]
    c.setFont(CN, 11)
    c.setFillColor(HexColor('#DC2626'))
    for line in problems:
        c.drawString(margin + 15, y, line)
        y -= 19

    # ── SOLUTION ──
    y -= 12
    rrect(c, margin, y - 2, 90, 20, 5, fill=GREEN)
    c.setFillColor(white)
    c.setFont(EN, 10)
    c.drawString(margin + 6, y + 2, 'SOLUTION')

    c.setFillColor(DARK)
    c.setFont(CN, 15)
    c.drawString(margin + 100, y, '30 秒獲得五星好評')

    y -= 30

    # Steps
    steps = [
        ('1', '客人掃 QR Code'),
        ('2', '選擇體驗標籤'),
        ('3', 'AI 自動生成好評'),
        ('4', '一鍵發布 Google'),
    ]
    sw = (cw - 45) / 4
    for i, (num, text) in enumerate(steps):
        sx = margin + i * (sw + 15)
        rrect(c, sx, y - 48, sw, 55, 8, fill=LIGHT_BG, stroke=HexColor('#E2E8F0'))

        c.setFillColor(LIGHT_BLUE)
        c.setFont(EN, 22)
        c.drawCentredString(sx + sw / 2, y - 10, num)

        c.setFillColor(DARK)
        c.setFont(CN, 9)
        c.drawCentredString(sx + sw / 2, y - 32, text)

        if i < 3:
            c.setFillColor(LIGHT_BLUE)
            c.setFont(EN, 16)
            c.drawString(sx + sw + 2, y - 22, '>')

    # ── FEATURES ──
    y -= 75
    c.setFillColor(DARK)
    c.setFont(CN, 14)
    c.drawString(margin, y, '* 主要功能')

    y -= 25
    left = [
        'v  AI 智能生成個人化五星好評',
        'v  評論即時監控 + 自動通知',
        'v  AI 自動擬稿回覆（含差評處理）',
    ]
    right = [
        'v  Google Maps 營運分析報告',
        'v  競爭對手評論追蹤比較',
        'v  多語系支援（中/英/日/韓/法）',
    ]

    c.setFont(CN, 10)
    c.setFillColor(DARK)
    fy = y
    for line in left:
        c.drawString(margin + 10, fy, line)
        fy -= 17
    fy = y
    for line in right:
        c.drawString(margin + cw / 2, fy, line)
        fy -= 17

    # ── PRICING ──
    y = fy - 15
    c.setFillColor(DARK)
    c.setFont(CN, 14)
    c.drawString(margin, y, '$ 方案與價格')

    y -= 18
    plans = [
        ('Free', '免費', '$0', '評論生成\nQR Code', False),
        ('Starter', '入門', '$29/月', '評論監控\nAI 自動回覆\n通知提醒', False),
        ('Pro', '專業', '$79/月', 'Google Maps 分析\n競爭對手追蹤\n全部功能', True),
    ]
    pw = (cw - 20) / 3
    for i, (name, label, price, feats, popular) in enumerate(plans):
        px = margin + i * (pw + 10)
        bh = 110

        bg = BLUE if popular else LIGHT_BG
        tc = white if popular else DARK
        sc = HexColor('#93C5FD') if popular else GRAY

        rrect(c, px, y - bh, pw, bh, 8, fill=bg)

        if popular:
            rrect(c, px + pw - 70, y - 5, 65, 18, 4, fill=AMBER)
            c.setFillColor(DARK)
            c.setFont(CN, 8)
            c.drawString(px + pw - 62, y - 1, '最受歡迎')

        c.setFillColor(tc)
        c.setFont(EN, 13)
        c.drawString(px + 12, y - 20, name)
        c.setFont(CN, 9)
        c.setFillColor(sc)
        c.drawString(px + 12 + len(name) * 8 + 5, y - 20, label)

        c.setFillColor(tc)
        c.setFont(CN, 22)
        c.drawString(px + 12, y - 48, price)

        c.setFillColor(sc)
        c.setFont(CN, 8)
        ffy = y - 66
        for feat in feats.split('\n'):
            c.drawString(px + 12, ffy, '- ' + feat)
            ffy -= 13

    # ── TESTIMONIAL ──
    y -= 135
    rrect(c, margin, y - 55, cw, 55, 8, fill=HexColor('#FEF3C7'))

    c.setFillColor(DARK)
    c.setFont(CN, 10)
    c.drawCentredString(W / 2, y - 18,
        '"使用 ReplyWise AI 後，我們的 Google 評論從 47 則增加到 156 則，')
    c.drawCentredString(W / 2, y - 35,
        '星等從 4.2 提升到 4.8，新客人明顯增加。" — 溫哥華中餐廳老闆')

    # ── CTA ──
    y -= 75
    c.setFillColor(BLUE)
    c.rect(0, 0, W, y + 25, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont(CN, 18)
    c.drawCentredString(W / 2, y - 5, '立即免費試用 — 零風險、零成本')

    c.setFont(CN, 11)
    c.drawCentredString(W / 2, y - 28, '免費試用一週，讓您零風險體驗評論增長的效果')

    c.setFont(EN, 14)
    c.drawCentredString(W / 2, y - 52, 'www.replywiseai.com')

    c.setFont(CN, 10)
    c.drawCentredString(W / 2, y - 72, '聯絡：max@replywiseai.com')

    c.save()
    print(f'PDF saved to: {OUTPUT}')

if __name__ == '__main__':
    main()
