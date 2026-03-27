import jsPDF from 'jspdf';
import { PlanSection } from './planGenerator';
import { QuizAnswers } from './quizData';

/* ── Brand Palette (RGB) ── */
const C = {
  cream:      [250, 245, 235] as const,
  brown:      [76, 40, 30]    as const,
  terracotta: [190, 115, 80]  as const,
  white:      [255, 255, 255] as const,
  offWhite:   [248, 244, 238] as const,
  lightGray:  [230, 225, 215] as const,
  border:     [215, 205, 192] as const,
  text:       [55, 38, 25]    as const,
  textMuted:  [130, 115, 100] as const,
  gold:       [210, 160, 60]  as const,
  goldLight:  [245, 230, 190] as const,
  success:    [60, 150, 100]  as const,
  successBg:  [230, 248, 235] as const,
  warningBg:  [255, 245, 225] as const,
  warningBd:  [225, 170, 70]  as const,
  accentBg:   [240, 230, 218] as const,
  // Section colors
  orange:     [235, 130, 60]  as const,
  orangeBg:   [255, 245, 235] as const,
  emerald:    [52, 160, 110]  as const,
  emeraldBg:  [235, 250, 240] as const,
  sky:        [56, 150, 220]  as const,
  skyBg:      [235, 245, 255] as const,
  violet:     [130, 90, 200]  as const,
  violetBg:   [245, 240, 255] as const,
  rose:       [220, 80, 100]  as const,
  roseBg:     [255, 240, 242] as const,
};

const SECTION_COLORS: Record<number, { accent: readonly [number, number, number]; bg: readonly [number, number, number] }> = {
  0: { accent: C.orange, bg: C.orangeBg },
  1: { accent: C.rose, bg: C.roseBg },
  2: { accent: C.emerald, bg: C.emeraldBg },
  3: { accent: C.rose, bg: C.roseBg },
  4: { accent: C.violet, bg: C.violetBg },
  5: { accent: C.sky, bg: C.skyBg },
  6: { accent: C.gold, bg: C.goldLight },
  7: { accent: C.emerald, bg: C.emeraldBg },
};

function stageLabel(s: string) { return s === 'puppy' ? 'Puppy' : s === 'senior' ? 'Senior' : 'Adult'; }
function weightLabel(w: string) { return w === 'under20' ? 'Under 20 lbs' : w === '20-28' ? '20-28 lbs' : 'Over 28 lbs'; }
function activityLabel(a: string) { return a === 'low' ? 'Low' : a === 'active' ? 'Active' : 'Moderate'; }
function concernLabel(c: string) {
  const m: Record<string, string> = { skin: 'Skin & Allergies', pulling: 'Leash Pulling', diet: 'Diet & Weight', breathing: 'Breathing', wellness: 'General Wellness' };
  return m[c] || c;
}

function stripEmoji(str: string): string {
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function generatePDF(plan: PlanSection[], answers: QuizAnswers): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297, mx = 16, contentW = pw - mx * 2;
  let y = 0;
  let pageNum = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 22) { addFooter(); doc.addPage(); newPageBg(); y = 20; }
  };

  const newPageBg = () => {
    pageNum++;
    doc.setFillColor(...C.cream);
    doc.rect(0, 0, pw, ph, 'F');
    doc.setFillColor(...C.brown);
    doc.rect(0, 0, pw, 3, 'F');
    doc.setFillColor(...C.terracotta);
    doc.rect(0, 3, pw, 1, 'F');
  };

  const addFooter = () => {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(mx, ph - 14, pw - mx, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text('FrenchyFab.com  |  Your French Bulldog Care Companion', mx, ph - 9);
    doc.text(`Page ${pageNum}`, pw - mx, ph - 9, { align: 'right' });
  };

  const drawSectionHeader = (title: string, sectionIdx: number) => {
    ensureSpace(22);
    const colors = SECTION_COLORS[sectionIdx % 8];
    doc.setFillColor(...colors.accent);
    doc.roundedRect(mx, y, contentW, 14, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(stripEmoji(title), mx + 6, y + 9.5);
    // Section number badge
    doc.setFillColor(...C.white);
    doc.circle(pw - mx - 10, y + 7, 5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...colors.accent);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionIdx + 1}`, pw - mx - 10, y + 8.5, { align: 'center' });
    y += 18;
  };

  const drawItemCard = (text: string, isWarning: boolean, idx: number, sectionIdx: number) => {
    const cleanText = stripEmoji(text.replace(/^[^\w\s]*\s*/, ''));
    const lines = doc.splitTextToSize(cleanText, contentW - 18);
    const blockH = Math.max(lines.length * 5 + 6, 12);

    ensureSpace(blockH + 3);
    const colors = SECTION_COLORS[sectionIdx % 8];

    if (isWarning) {
      doc.setFillColor(...C.warningBg);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'F');
      doc.setDrawColor(...C.warningBd);
      doc.setLineWidth(0.4);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'S');
      doc.setFillColor(...C.gold);
      doc.roundedRect(mx, y, 3, blockH, 1, 1, 'F');
    } else {
      doc.setFillColor(...C.white);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(mx, y, contentW, blockH, 2, 2, 'S');
      doc.setFillColor(...colors.accent);
      doc.roundedRect(mx, y, 2.5, blockH, 1, 1, 'F');
    }

    // Numbered badge
    const badgeColor = isWarning ? C.gold : colors.accent;
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(mx + 5, y + 2.5, 8, 6, 1.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(isWarning ? '!' : `${idx + 1}`, mx + 9, y + 6.5, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, mx + 16, y + 5.5);

    y += blockH + 2;
  };

  const drawArticleLink = (label: string, url: string) => {
    ensureSpace(14);
    y += 2;
    doc.setFillColor(...C.accentBg);
    doc.roundedRect(mx, y, contentW, 10, 2, 2, 'F');
    doc.setDrawColor(...C.terracotta);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, y, contentW, 10, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(`Read more: ${stripEmoji(label)}`, mx + 5, y + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.terracotta);
    doc.text(stripEmoji(url), pw - mx - 5, y + 6.5, { align: 'right' });
    y += 14;
  };

  /* ═══════════════════════════════════════════════
   * COVER PAGE
   * ═══════════════════════════════════════════════ */
  newPageBg();

  // Full brown header
  doc.setFillColor(...C.brown);
  doc.rect(0, 0, pw, 100, 'F');

  // Gold accent
  doc.setFillColor(...C.gold);
  doc.rect(0, 100, pw, 2, 'F');

  // Brand
  doc.setFontSize(12);
  doc.setTextColor(...C.goldLight);
  doc.setFont('helvetica', 'bold');
  doc.text('FRENCHYFAB', pw / 2, 28, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(pw / 2 - 20, 33, pw / 2 + 20, 33);

  // Main title
  doc.setFontSize(28);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Personalized', pw / 2, 55, { align: 'center' });
  doc.text('Frenchie Care Plan', pw / 2, 68, { align: 'center' });

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(...C.goldLight);
  doc.setFont('helvetica', 'normal');
  doc.text('Science-Backed Recommendations for a Happier, Healthier French Bulldog', pw / 2, 85, { align: 'center' });

  // Profile card
  const cardY = 118;
  const cardH = 90;
  doc.setFillColor(...C.white);
  doc.roundedRect(mx + 12, cardY, contentW - 24, cardH, 5, 5, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx + 12, cardY, contentW - 24, cardH, 5, 5, 'S');

  // Card header stripe
  doc.setFillColor(...C.accentBg);
  doc.roundedRect(mx + 12, cardY, contentW - 24, 14, 5, 5, 'F');
  doc.setFillColor(...C.white);
  doc.rect(mx + 12, cardY + 10, contentW - 24, 4, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('YOUR FRENCHIE\'S PROFILE', pw / 2, cardY + 9.5, { align: 'center' });

  const profileData = [
    ['Life Stage', stageLabel(answers.lifeStage)],
    ['Weight Range', weightLabel(answers.weight)],
    ['Body Condition', `${answers.bodyCondition}/9`],
    ['Activity Level', activityLabel(answers.activityLevel)],
    ['Primary Concern', concernLabel(answers.concern)],
    ['Environment', answers.environment.length > 0 ? answers.environment.join(', ') : 'Not specified'],
  ];

  const colX1 = mx + 22;
  const colX2 = pw / 2 + 8;
  let profileY = cardY + 22;

  doc.setFontSize(8.5);
  profileData.forEach((item, i) => {
    const xLabel = i % 2 === 0 ? colX1 : colX2;
    const row = Math.floor(i / 2);
    const rowY = profileY + row * 16;

    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(item[0].toUpperCase(), xLabel, rowY);

    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], xLabel, rowY + 6);
  });

  // Date
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${today}`, pw / 2, 228, { align: 'center' });

  // Trust badges
  const badgeY = 240;
  doc.setFillColor(...C.successBg);
  doc.roundedRect(mx + 12, badgeY, (contentW - 28) / 3, 18, 3, 3, 'F');
  doc.setFillColor(...C.skyBg);
  doc.roundedRect(mx + 12 + (contentW - 28) / 3 + 2, badgeY, (contentW - 28) / 3, 18, 3, 3, 'F');
  doc.setFillColor(...C.orangeBg);
  doc.roundedRect(mx + 12 + ((contentW - 28) / 3 + 2) * 2, badgeY, (contentW - 28) / 3, 18, 3, 3, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const bw = (contentW - 28) / 3;
  doc.setTextColor(...C.emerald);
  doc.text('Vet-Informed', mx + 12 + bw / 2, badgeY + 8, { align: 'center' });
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textMuted);
  doc.text('Science-backed', mx + 12 + bw / 2, badgeY + 13, { align: 'center' });

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.sky);
  doc.text('Breed-Specific', mx + 12 + bw + 2 + bw / 2, badgeY + 8, { align: 'center' });
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textMuted);
  doc.text('BOAS-aware', mx + 12 + bw + 2 + bw / 2, badgeY + 13, { align: 'center' });

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.orange);
  doc.text('AI-Personalized', mx + 12 + (bw + 2) * 2 + bw / 2, badgeY + 8, { align: 'center' });
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textMuted);
  doc.text('Tailored for you', mx + 12 + (bw + 2) * 2 + bw / 2, badgeY + 13, { align: 'center' });

  addFooter();

  /* ═══════════════════════════════════════════════
   * TABLE OF CONTENTS
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 22;

  doc.setFontSize(18);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Care Plan Overview', mx, y + 5);
  y += 12;

  doc.setDrawColor(...C.terracotta);
  doc.setLineWidth(0.8);
  doc.line(mx, y, mx + 45, y);
  y += 10;

  plan.forEach((section, i) => {
    const colors = SECTION_COLORS[i % 8];
    doc.setFillColor(...colors.bg);
    doc.roundedRect(mx, y, contentW, 14, 2, 2, 'F');

    // Left accent dot
    doc.setFillColor(...colors.accent);
    doc.circle(mx + 8, y + 7, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}`, mx + 8, y + 8.5, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text(stripEmoji(section.title), mx + 15, y + 8);

    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${section.items.length} recommendations`, pw - mx - 5, y + 8, { align: 'right' });

    y += 16;
  });

  // Quick stats summary
  y += 6;
  doc.setFillColor(...C.white);
  doc.roundedRect(mx, y, contentW, 28, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(mx, y, contentW, 28, 3, 3, 'S');

  const totalItems = plan.reduce((sum, s) => sum + s.items.length, 0);
  const statsData = [
    { label: 'Sections', value: `${plan.length}` },
    { label: 'Recommendations', value: `${totalItems}` },
    { label: 'Confidence', value: 'High' },
    { label: 'Updated', value: today.split(',')[0] },
  ];
  const statW = contentW / 4;
  statsData.forEach((stat, i) => {
    const sx = mx + statW * i + statW / 2;
    doc.setFontSize(14);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, sx, y + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label.toUpperCase(), sx, y + 18, { align: 'center' });
  });

  y += 34;

  // Disclaimer
  doc.setFillColor(...C.offWhite);
  doc.roundedRect(mx, y, contentW, 22, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(mx, y, contentW, 22, 3, 3, 'S');

  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'italic');
  const disclaimer = doc.splitTextToSize(
    'DISCLAIMER: This care plan is for informational purposes only and does not replace professional veterinary advice. Always consult your veterinarian before making changes to your French Bulldog\'s diet, exercise, or health regimen.',
    contentW - 12
  );
  doc.text(disclaimer, mx + 6, y + 6);

  addFooter();

  /* ═══════════════════════════════════════════════
   * SECTION PAGES
   * ═══════════════════════════════════════════════ */
  plan.forEach((section, sIdx) => {
    doc.addPage();
    newPageBg();
    y = 20;

    drawSectionHeader(section.title, sIdx);

    section.items.forEach((item, j) => {
      const isWarning = item.includes('WARNING') || item.startsWith('\u26A0');
      const cleanItem = item.replace(/^[\u26A0\uFE0F\s]+/, '');
      drawItemCard(cleanItem, isWarning, j, sIdx);
    });

    if (section.articleLink) {
      drawArticleLink(section.articleLink.label, section.articleLink.url);
    }

    addFooter();
  });

  /* ═══════════════════════════════════════════════
   * WEEKLY CARE CHECKLIST PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  doc.setFontSize(18);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Weekly Care Checklist', mx, y + 5);
  y += 12;
  doc.setDrawColor(...C.terracotta);
  doc.setLineWidth(0.8);
  doc.line(mx, y, mx + 45, y);
  y += 10;

  const checklistSections = [
    {
      title: 'DAILY',
      color: C.emerald,
      bg: C.emeraldBg,
      items: [
        'Fresh water bowl (change 2x daily)',
        `Feed ${answers.lifeStage === 'puppy' ? '3 meals' : '2 meals'} at consistent times`,
        'Clean facial wrinkles & nose fold',
        `${answers.activityLevel === 'active' ? '30-40' : '15-25'} min walk (avoid heat)`,
        'Check ears for redness or odor',
        'Brief teeth/gum inspection',
      ],
    },
    {
      title: 'WEEKLY',
      color: C.sky,
      bg: C.skyBg,
      items: [
        'Full body inspection (lumps, irritation)',
        'Brush coat (2-3x per week)',
        'Clean ears with vet-approved solution',
        'Trim nails if needed',
        'Wash food & water bowls thoroughly',
        'Rotate toys & enrichment activities',
      ],
    },
    {
      title: 'MONTHLY',
      color: C.violet,
      bg: C.violetBg,
      items: [
        'Weigh your Frenchie & log it',
        'Deep clean bedding & crate',
        'Flea/tick prevention treatment',
        'Dental chew or brushing routine review',
        'Review diet portions (adjust for weight)',
        'Check emergency kit supplies',
      ],
    },
  ];

  checklistSections.forEach((cls) => {
    ensureSpace(50);
    // Section label
    doc.setFillColor(...cls.color);
    doc.roundedRect(mx, y, 32, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(cls.title, mx + 16, y + 5.5, { align: 'center' });
    y += 12;

    cls.items.forEach((item) => {
      ensureSpace(10);
      // Checkbox
      doc.setFillColor(...cls.bg);
      doc.roundedRect(mx, y, contentW, 8, 1.5, 1.5, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.rect(mx + 4, y + 1.5, 5, 5, 'S');

      doc.setFontSize(8);
      doc.setTextColor(...C.text);
      doc.setFont('helvetica', 'normal');
      doc.text(stripEmoji(item), mx + 13, y + 5.5);
      y += 9;
    });
    y += 4;
  });

  addFooter();

  /* ═══════════════════════════════════════════════
   * EMERGENCY QUICK REFERENCE PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  doc.setFontSize(18);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Emergency Quick Reference', mx, y + 5);
  y += 12;
  doc.setDrawColor(...C.rose);
  doc.setLineWidth(0.8);
  doc.line(mx, y, mx + 45, y);
  y += 10;

  const emergencies = [
    { title: 'Heatstroke', signs: 'Heavy panting, drooling, vomiting, wobbly gait', action: 'Move to shade/AC immediately. Apply cool (not cold) water to paws and belly. Rush to vet.' },
    { title: 'Choking / Breathing Crisis', signs: 'Blue tongue/gums, gagging, pawing at mouth', action: 'Check airway for obstruction. If visible, carefully remove. CPR if needed. Emergency vet immediately.' },
    { title: 'Allergic Reaction', signs: 'Swollen face/eyes, hives, difficulty breathing', action: 'Remove allergen if known. Benadryl (1mg/lb) if mild. Emergency vet if breathing is affected.' },
    { title: 'Seizure', signs: 'Uncontrolled shaking, loss of consciousness, drooling', action: 'Do NOT restrain. Clear area of hazards. Time the seizure. Vet visit within 24 hours; emergency if > 3 min.' },
    { title: 'Poisoning', signs: 'Vomiting, diarrhea, lethargy, tremors', action: 'Note what was ingested. Call ASPCA Poison Control: (888) 426-4435. Do NOT induce vomiting unless directed.' },
  ];

  emergencies.forEach((em) => {
    ensureSpace(32);
    doc.setFillColor(...C.roseBg);
    doc.roundedRect(mx, y, contentW, 26, 3, 3, 'F');
    doc.setDrawColor(...C.rose);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, y, contentW, 26, 3, 3, 'S');
    doc.setFillColor(...C.rose);
    doc.roundedRect(mx, y, 3, 26, 1, 1, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...C.rose);
    doc.setFont('helvetica', 'bold');
    doc.text(em.title, mx + 7, y + 6);

    doc.setFontSize(7.5);
    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.text('Signs: ', mx + 7, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(em.signs, mx + 22, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('Action: ', mx + 7, y + 18);
    doc.setFont('helvetica', 'normal');
    const actionLines = doc.splitTextToSize(em.action, contentW - 28);
    doc.text(actionLines, mx + 24, y + 18);

    y += 30;
  });

  // Emergency contacts
  y += 4;
  ensureSpace(20);
  doc.setFillColor(...C.white);
  doc.roundedRect(mx, y, contentW, 16, 3, 3, 'F');
  doc.setDrawColor(...C.rose);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentW, 16, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('EMERGENCY CONTACTS', mx + 5, y + 6);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text('ASPCA Poison Control: (888) 426-4435  |  Your Vet: _______________  |  Emergency Vet: _______________', mx + 5, y + 12);

  addFooter();

  /* ═══════════════════════════════════════════════
   * RESOURCES PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  newPageBg();
  y = 20;

  doc.setFontSize(18);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Helpful Resources', mx, y + 5);
  y += 12;
  doc.setDrawColor(...C.terracotta);
  doc.setLineWidth(0.8);
  doc.line(mx, y, mx + 45, y);
  y += 12;

  const resources = [
    { title: 'Healthy Treats Guide', desc: 'Discover safe, nutritious treats your Frenchie will love -- including portion guidelines and homemade recipes.', url: 'frenchyfab.com/french-bulldog-healthy-treats' },
    { title: 'Complete Grooming Blueprint', desc: 'Step-by-step grooming routines tailored for French Bulldogs, from wrinkle care to nail trimming.', url: 'frenchyfab.com/french-bulldog-grooming-blueprint/' },
    { title: 'Essential Supplements Guide', desc: 'Evidence-based supplement recommendations from puppy to senior -- including dosages and top brands.', url: 'frenchyfab.com/essential-nutritional-supplements-french-bulldogs/' },
    { title: 'Best Harness for Pulling', desc: 'Expert-reviewed harness picks that prevent pulling and protect your Frenchie\'s delicate airway.', url: 'frenchyfab.com/best-harness-for-french-bulldog-that-pulls/' },
  ];

  resources.forEach((res) => {
    ensureSpace(28);
    doc.setFillColor(...C.white);
    doc.roundedRect(mx, y, contentW, 24, 3, 3, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(mx, y, contentW, 24, 3, 3, 'S');
    doc.setFillColor(...C.terracotta);
    doc.roundedRect(mx, y, 3, 24, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...C.brown);
    doc.setFont('helvetica', 'bold');
    doc.text(res.title, mx + 7, y + 7);

    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(res.desc, contentW - 16), mx + 7, y + 13);

    doc.setTextColor(...C.terracotta);
    doc.setFontSize(7);
    doc.text(res.url, mx + 7, y + 21);

    y += 28;
  });

  // Premium upsell
  y += 8;
  ensureSpace(42);
  doc.setFillColor(...C.goldLight);
  doc.roundedRect(mx, y, contentW, 38, 4, 4, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(mx, y, contentW, 38, 4, 4, 'S');

  doc.setFontSize(12);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Want Even More? Get the Premium Care Guide', pw / 2, y + 10, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  const premiumDesc = doc.splitTextToSize(
    'Our 12-page Premium PDF includes custom feeding charts, seasonal grooming checklists, vet visit prep sheets, emergency protocols, and breed-specific health screening timelines -- all personalized for your Frenchie.',
    contentW - 20
  );
  doc.text(premiumDesc, pw / 2, y + 17, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...C.terracotta);
  doc.setFont('helvetica', 'bold');
  doc.text('Get it now for just $7.99 at frenchyfab.com', pw / 2, y + 33, { align: 'center' });

  addFooter();

  /* ═══════════════════════════════════════════════
   * BACK PAGE
   * ═══════════════════════════════════════════════ */
  doc.addPage();
  doc.setFillColor(...C.cream);
  doc.rect(0, 0, pw, ph, 'F');
  pageNum++;

  doc.setFillColor(...C.brown);
  doc.rect(0, ph - 4, pw, 4, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, ph - 5.5, pw, 1.5, 'F');

  doc.setFontSize(22);
  doc.setTextColor(...C.brown);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank You!', pw / 2, ph / 2 - 35, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  const thankLines = doc.splitTextToSize(
    'This care plan was generated specifically for your French Bulldog based on the information you provided. For more tips, guides, and breed-specific advice, visit us online.',
    contentW - 30
  );
  doc.text(thankLines, pw / 2, ph / 2 - 18, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(...C.terracotta);
  doc.setFont('helvetica', 'bold');
  doc.text('frenchyfab.com', pw / 2, ph / 2 + 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('Follow us for daily Frenchie tips and community stories', pw / 2, ph / 2 + 22, { align: 'center' });

  // Footer
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(mx, ph - 14, pw - mx, ph - 14);
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text('FrenchyFab.com  |  Your French Bulldog Care Companion', mx, ph - 9);

  /* ── SAVE ── */
  doc.save('FrenchyFab-Care-Plan.pdf');
}
